import { useState, useCallback, useRef } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import type { Persona } from '../data/personas'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface InsightReport {
  temas: string[]
  dores: string[]
  oportunidades: string[]
  frases: string[]
  satisfacao: number
  justificativa: string
}

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

const HUMANIZATION_WRAPPER = `
FORMATO DA RESPOSTA — REGRAS ABSOLUTAS, NUNCA VIOLE:
1. ZERO markdown: proibido usar *, **, _, #, listas com traço ou número. Texto corrido apenas.
2. Escreva como se estivesse no WhatsApp: mensagens curtas, 1 a 2 frases cada.
3. Separe cada "envio" com ||| — como se fossem mensagens distintas enviadas em sequência.
4. Máximo 3 envios por resposta. Cada envio: no máximo 2 frases curtas.
5. Nunca use travessão (—). Use reticências (...) para hesitar, vírgula para pausar.
6. Nunca comece com "Olá!", "Claro!", "Com certeza!" — reaja direto com emoção ou fato.

EXEMPLO DE FORMATO CORRETO:
"Ixe, complicado isso aí... ||| A taxa que cobram na minha maquininha é bem salgada. ||| Você sabe me dizer por que é mais caro que a Stone?"

COMPORTAMENTO HUMANO:
- Reaja emocionalmente primeiro, explique depois.
- Dê um pedaço da história e pare, deixe o pesquisador puxar mais.
- Use detalhes concretos: valores, datas, situações específicas.
- Faça perguntas de volta quando sentir curiosidade ou desconfiança.
- Use o vocabulário e tom do seu perfil conforme definido abaixo.
`

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function splitIntoParts(text: string): string[] {
  // Split on ||| delimiter, fallback to double newline, else single message
  const byDelimiter = text.split('|||').map(p => p.trim()).filter(Boolean)
  if (byDelimiter.length > 1) return byDelimiter.slice(0, 3)
  return [text]
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

function buildSystemPrompt(persona: Persona, productFocus?: string): string {
  let prompt = HUMANIZATION_WRAPPER + '\n\n' + persona.systemPrompt

  if (productFocus) {
    prompt += `\n\nFOCO DESTA SESSÃO: O pesquisador está especialmente interessado em "${productFocus}". Quando surgir naturalmente, aprofunde com casos concretos. Não force o tema.`
  }

  return prompt
}

export function useChat(persona: Persona, productFocus?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef<Message[]>([])

  const systemPrompt = buildSystemPrompt(persona, productFocus)

  const sendMessage = useCallback(async (userText: string): Promise<string> => {
    if (!userText.trim()) return ''

    const userMsg: Message = { role: 'user', content: userText, timestamp: new Date() }
    const updatedMessages = [...messagesRef.current, userMsg]
    messagesRef.current = updatedMessages
    setMessages(updatedMessages)
    setLoading(true)
    setError(null)

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
      })

      const raw = response.content[0].type === 'text' ? response.content[0].text : ''
      const parts = splitIntoParts(stripMarkdown(raw))

      setLoading(false)

      // Deliver each part as a separate bubble with a typing delay between them
      let lastReply = ''
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          setLoading(true)
          await delay(600 + Math.random() * 500)
          setLoading(false)
        }
        const msg: Message = { role: 'assistant', content: parts[i], timestamp: new Date() }
        messagesRef.current = [...messagesRef.current, msg]
        setMessages([...messagesRef.current])
        lastReply = parts[i]
      }

      return lastReply
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao conectar com a persona'
      setError(errorMsg)
      setLoading(false)
      return ''
    }
  }, [systemPrompt])

  const generateInsights = useCallback(async (): Promise<InsightReport | null> => {
    const msgs = messagesRef.current
    if (msgs.length < 2) return null

    setLoading(true)
    try {
      const transcript = msgs
        .map(m => `${m.role === 'user' ? 'Pesquisador' : persona.name}: ${m.content}`)
        .join('\n\n')

      const productContext = productFocus ? `Foco da sessão: ${productFocus}.` : ''

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: `Você é um analista sênior de CX especializado em pesquisa qualitativa bancária PJ.
Analise entrevistas e extraia insights estruturados e acionáveis.
Responda SEMPRE em JSON válido, sem texto antes ou depois.`,
        messages: [{
          role: 'user',
          content: `Analise esta entrevista com ${persona.name} (${persona.role}, ${persona.company}, ${persona.faturamento}). ${productContext}

<entrevista>
${transcript}
</entrevista>

Responda APENAS com JSON:
{
  "temas": ["tema 1", "tema 2", "tema 3"],
  "dores": ["dor com evidência da fala 1", "dor 2"],
  "oportunidades": ["oportunidade acionável 1", "oportunidade 2"],
  "frases": ["citação direta 1", "citação 2"],
  "satisfacao": 7,
  "justificativa": "Justificativa do nível de satisfação"
}`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return JSON.parse(cleaned) as InsightReport
    } catch (err) {
      console.error('Erro ao gerar insights:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [persona, productFocus])

  const clearMessages = useCallback(() => {
    setMessages([])
    messagesRef.current = []
    setError(null)
  }, [])

  return { messages, loading, error, sendMessage, generateInsights, clearMessages }
}
