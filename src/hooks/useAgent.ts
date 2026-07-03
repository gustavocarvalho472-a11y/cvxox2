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
          const stream = client.messages.stream({
            model: MODEL,
            max_tokens: 6000,
            system,
            messages: historyRef.current,
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

          const final = await stream.finalMessage()
          historyRef.current = [...historyRef.current, { role: 'assistant', content: final.content }]

          if (final.stop_reason !== 'pause_turn') break
          // pause_turn: ferramenta server-side no meio do turno — reenvia para continuar
        }
      } catch (err) {
        let friendly = 'Erro ao falar com o agente.'
        const isNetworkError =
          err instanceof Anthropic.APIConnectionError ||
          (err instanceof TypeError && /load failed|failed to fetch|network/i.test(err.message))
        if (err instanceof Anthropic.AuthenticationError) {
          friendly = 'Chave da API inválida. Verifique nas Configurações e use "Testar conexão".'
        } else if (err instanceof Anthropic.RateLimitError) {
          friendly = 'Limite de requisições atingido. Aguarde um momento e tente de novo.'
        } else if (isNetworkError) {
          friendly =
            'Falha de rede ao chamar a API da Anthropic. Checklist: (1) abra Configurações e use "Testar conexão" para validar a chave; (2) se estiver no celular, desative VPN/bloqueador de conteúdo para este site; (3) recarregue a página (segure o botão de recarregar para forçar) e tente de novo.'
        } else if (err instanceof Anthropic.APIError) {
          friendly = `Erro da API (${err.status}): ${err.message}`
        } else if (err instanceof Error) {
          friendly = err.message
        }
        setError(friendly)
        // remove a bolha vazia do assistente se nada foi gerado
        if (!accumulated) {
          setMessages(prev => prev.filter(m => m.id !== assistantId))
          historyRef.current = historyRef.current.slice(0, -1)
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

  return { messages, streaming, searching, error, hasKey, sendMessage, clear }
}
