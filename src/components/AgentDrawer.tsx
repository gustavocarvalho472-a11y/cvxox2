import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, ReactNode } from 'react'
import { Globe, ImagePlus, Send, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { useAgent } from '../hooks/useAgent'
import type { AgentImage } from '../hooks/useAgent'
import { QUICK_PROMPTS } from '../lib/agentPrompt'

interface Props {
  open: boolean
  onClose: () => void
  agent: ReturnType<typeof useAgent>
  draft: string
  setDraft: (v: string) => void
}

// Renderização leve de markdown: negrito, títulos e listas — sem dependências
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyPrefix}b${i}`} className="font-semibold text-zinc-50">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

function renderMarkdown(text: string): ReactNode[] {
  return text.split('\n').map((line, i) => {
    const key = `l${i}`
    const heading = line.match(/^#{1,4}\s+(.*)/)
    if (heading) {
      return (
        <p key={key} className="mt-2 font-semibold text-amber-300">
          {renderInline(heading[1], key)}
        </p>
      )
    }
    const bullet = line.match(/^\s*[-•]\s+(.*)/)
    if (bullet) {
      return (
        <p key={key} className="pl-3">
          • {renderInline(bullet[1], key)}
        </p>
      )
    }
    if (line.trim() === '') return <div key={key} className="h-2" />
    return <p key={key}>{renderInline(line, key)}</p>
  })
}

async function fileToAgentImage(file: File): Promise<AgentImage | null> {
  const okTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
  const mediaType = okTypes.find(t => t === file.type)
  if (!mediaType) return null
  const buf = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return { data: btoa(binary), mediaType }
}

export function AgentDrawer({ open, onClose, agent, draft, setDraft }: Props) {
  const { messages, streaming, searching, error, hasKey, sendMessage, clear } = agent
  const [image, setImage] = useState<AgentImage | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const handlePaste = async (e: ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (!item) return
    const file = item.getAsFile()
    if (!file) return
    e.preventDefault()
    const img = await fileToAgentImage(file)
    if (img) setImage(img)
  }

  const submit = () => {
    if (streaming) return
    if (!draft.trim() && !image) return
    void sendMessage(draft, image ?? undefined)
    setDraft('')
    setImage(null)
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-200',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">Agente — Risk Manager</div>
          <div className="text-[11px] text-zinc-500">
            SMC · Wyckoff · macro do ouro · regras FTMO
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={clear} className="text-zinc-500 hover:text-zinc-200" aria-label="Limpar conversa">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-zinc-200" aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-2 py-4">
            <p className="text-xs text-zinc-500">
              {hasKey
                ? 'Seu copiloto conhece o estado real da sua conta, seu viés do dia e seus níveis marcados. Cole um print do gráfico (Ctrl+V) para análise SMC/Wyckoff.'
                : '⚠️ Configure sua chave da API Anthropic nas Configurações para ativar o agente.'}
            </p>
            {QUICK_PROMPTS.map(qp => (
              <button
                key={qp.label}
                onClick={() => setDraft(qp.prompt)}
                className="block w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left text-xs text-zinc-300 transition hover:border-amber-500/50"
              >
                {qp.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {messages.map(m => (
            <div
              key={m.id}
              className={cn(
                'max-w-[92%] rounded-lg px-3 py-2 text-[13px] leading-relaxed',
                m.role === 'user'
                  ? 'ml-auto bg-amber-500/15 text-amber-50'
                  : 'bg-zinc-900 text-zinc-200',
              )}
            >
              {m.imagePreview && (
                <img src={m.imagePreview} alt="print do gráfico" className="mb-2 max-h-40 rounded" />
              )}
              {m.role === 'assistant' ? renderMarkdown(m.text) : <p className="whitespace-pre-wrap">{m.text}</p>}
              {m.role === 'assistant' && m.text === '' && streaming && (
                <span className="inline-flex gap-1">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-500" />
                </span>
              )}
            </div>
          ))}
        </div>

        {searching && (
          <div className="mt-2 flex items-center gap-2 text-xs text-sky-400">
            <Globe className="h-3.5 w-3.5 animate-spin" /> pesquisando na web…
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="border-t border-zinc-800 p-3">
        {image && (
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
            <img
              src={`data:${image.mediaType};base64,${image.data}`}
              alt="anexo"
              className="h-10 rounded border border-zinc-700"
            />
            print anexado
            <button onClick={() => setImage(null)} className="text-zinc-500 hover:text-red-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-zinc-700 p-2 text-zinc-400 transition hover:border-amber-500/50 hover:text-amber-300"
            aria-label="Anexar imagem"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0]
              if (file) {
                const img = await fileToAgentImage(file)
                if (img) setImage(img)
              }
              e.target.value = ''
            }}
          />
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={2}
            placeholder={hasKey ? 'Pergunte, ou cole um print (Ctrl+V)…' : 'Configure a chave da API primeiro'}
            className="flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500"
          />
          <Button
            size="icon"
            onClick={submit}
            disabled={streaming || (!draft.trim() && !image)}
            className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
