import { useCallback, useRef, useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '../lib/agentPrompt'

export interface AgentImage {
  data: string // base64 sem prefixo
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
}

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  imagePreview?: string
}

const MODEL = 'claude-sonnet-5'
const MAX_CONTINUATIONS = 4
// Janela de histórico enviada à API: mantém payload leve (celular) e custo baixo;
// o contexto vivo (conta/viés/níveis/eventos) é reinjetado no system a cada chamada
const MAX_HISTORY_SENT = 12
// Retry automático p/ falha de rede ("Load failed" do Safari iOS em rede móvel)
const NETWORK_RETRIES = 2

function isNetworkError(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true
  return (
    err instanceof Error &&
    /load failed|failed to fetch|networkerror|network request failed|connection error/i.test(err.message)
  )
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

function windowedHistory(history: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  let msgs = history.slice(-MAX_HISTORY_SENT)
  // a API exige que a conversa comece com role user
  while (msgs.length > 0 && msgs[0].role !== 'user') msgs = msgs.slice(1)
  return msgs
}

function getApiKey(userKey: string): string {
  // trim: chave colada no celular costuma vir com espaço/quebra de linha no fim
  const key = userKey || (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined) || ''
  return key.trim()
}

let idCounter = 0
const nextId = () => `m${Date.now()}_${idCounter++}`

const CHAT_STORAGE = 'gd_chat'
const MAX_PERSISTED = 40

interface PersistedChat {
  display: DisplayMessage[]
  history: Anthropic.MessageParam[]
}

function loadChat(): PersistedChat {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE)
    if (raw) return JSON.parse(raw) as PersistedChat
  } catch {
    // storage corrompido — começa limpo
  }
  return { display: [], history: [] }
}

// Persistimos sem as imagens (base64 estouraria a cota do localStorage)
function persistChat(display: DisplayMessage[], history: Anthropic.MessageParam[]) {
  try {
    const slimDisplay = display.slice(-MAX_PERSISTED).map(m => ({ ...m, imagePreview: undefined }))
    const slimHistory = history.slice(-MAX_PERSISTED).map(m => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content.map(b =>
            b.type === 'image' ? { type: 'text' as const, text: '[print enviado anteriormente]' } : b,
          )
        : m.content,
    }))
    localStorage.setItem(CHAT_STORAGE, JSON.stringify({ display: slimDisplay, history: slimHistory }))
  } catch {
    // cota cheia — segue sem persistir
  }
}

export function useAgent(apiKeyFromSettings: string, buildContext: () => string) {
  const [initial] = useState(loadChat)
  const [messages, setMessagesState] = useState<DisplayMessage[]>(initial.display)
  const [streaming, setStreaming] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const historyRef = useRef<Anthropic.MessageParam[]>(initial.history)
  const displayRef = useRef<DisplayMessage[]>(initial.display)
  const lastFailedRef = useRef<{ text: string; image?: AgentImage } | null>(null)

  const setMessages = (updater: (prev: DisplayMessage[]) => DisplayMessage[]) => {
    setMessagesState(prev => {
      const next = updater(prev)
      displayRef.current = next
      return next
    })
  }

  const hasKey = getApiKey(apiKeyFromSettings).length > 0

  const sendMessage = useCallback(
    async (text: string, image?: AgentImage) => {
      const apiKey = getApiKey(apiKeyFromSettings)
      if (!apiKey) {
        setError(
          'Configure sua chave da API Anthropic nas Configurações (ícone de engrenagem) para usar o agente.',
        )
        return
      }
      if (!text.trim() && !image) return
      setError(null)

      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

      const userContent: Anthropic.ContentBlockParam[] = []
      if (image) {
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: image.mediaType, data: image.data },
        })
      }
      userContent.push({ type: 'text', text: text.trim() || 'Analise este gráfico.' })

      historyRef.current = [...historyRef.current, { role: 'user', content: userContent }]
      const userMsg: DisplayMessage = {
        id: nextId(),
        role: 'user',
        text: text.trim() || '(print do gráfico)',
        imagePreview: image ? `data:${image.mediaType};base64,${image.data}` : undefined,
      }
      const assistantId = nextId()
      setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', text: '' }])
      setStreaming(true)

      // Prefixo estável cacheado; contexto vivo (conta/viés/níveis) vem depois
      const system: Anthropic.TextBlockParam[] = [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: buildContext() },
      ]

      let accumulated = ''
      const appendText = (delta: string) => {
        accumulated += delta
        setMessages(prev =>
          prev.map(m => (m.id === assistantId ? { ...m, text: accumulated } : m)),
        )
      }

      try {
        for (let round = 0; round <= MAX_CONTINUATIONS; round++) {
          // Retry automático de rede: só quando ainda não chegou nenhum texto
          let final: Anthropic.Message | null = null
          for (let attempt = 0; ; attempt++) {
            try {
              const stream = client.messages.stream({
                model: MODEL,
                max_tokens: 6000,
                system,
                messages: windowedHistory(historyRef.current),
                tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
              })

              stream.on('streamEvent', event => {
                if (
                  event.type === 'content_block_start' &&
                  event.content_block.type === 'server_tool_use'
                ) {
                  setSearching(true)
                }
                if (
                  event.type === 'content_block_delta' &&
                  event.delta.type === 'text_delta'
                ) {
                  setSearching(false)
                  appendText(event.delta.text)
                }
              })

              final = await stream.finalMessage()
              break
            } catch (err) {
              if (isNetworkError(err) && !accumulated && attempt < NETWORK_RETRIES) {
                await delay(1000 * (attempt + 1))
                continue
              }
              throw err
            }
          }

          if (!final) throw new Error('sem resposta do modelo')
          lastFailedRef.current = null
          historyRef.current = [...historyRef.current, { role: 'assistant', content: final.content }]

          if (final.stop_reason !== 'pause_turn') break
          // pause_turn: ferramenta server-side no meio do turno — reenvia para continuar
        }
      } catch (err) {
        let friendly = 'Erro ao falar com o agente.'
        if (err instanceof Anthropic.AuthenticationError) {
          friendly = 'Chave da API inválida. Verifique nas Configurações e use "Testar conexão".'
        } else if (err instanceof Anthropic.RateLimitError) {
          friendly = 'Limite de requisições atingido. Aguarde um momento e tente de novo.'
        } else if (isNetworkError(err)) {
          friendly =
            'A conexão caiu no meio da resposta (comum em rede móvel). Já tentei 3 vezes — toque em "Tentar de novo", ou aproxime-se do Wi-Fi. Se persistir, desative VPN/Relay Privado para este site.'
        } else if (err instanceof Anthropic.APIError) {
          friendly = `Erro da API (${err.status}): ${err.message}`
        } else if (err instanceof Error) {
          friendly = err.message
        }
        setError(friendly)
        // remove a bolha vazia do assistente e devolve a mensagem p/ retry
        if (!accumulated) {
          setMessages(prev => prev.filter(m => m.id !== assistantId && m.id !== userMsg.id))
          historyRef.current = historyRef.current.slice(0, -1)
          lastFailedRef.current = { text, image }
        }
      } finally {
        setStreaming(false)
        setSearching(false)
        persistChat(displayRef.current, historyRef.current)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiKeyFromSettings, buildContext],
  )

  const clear = useCallback(() => {
    setMessages(() => [])
    historyRef.current = []
    setError(null)
    try {
      localStorage.removeItem(CHAT_STORAGE)
    } catch {
      // sem storage — ok
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retryLast = useCallback(() => {
    const failed = lastFailedRef.current
    if (!failed) return
    lastFailedRef.current = null
    void sendMessage(failed.text, failed.image)
  }, [sendMessage])

  const canRetry = lastFailedRef.current !== null

  return { messages, streaming, searching, error, hasKey, sendMessage, clear, retryLast, canRetry }
}
