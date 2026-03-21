import { useState, useRef, useEffect } from 'react'
import type { Persona } from '../data/personas'
import { useChat } from '../hooks/useChat'
import { useSpeech } from '../hooks/useSpeech'
import { InsightReportModal } from '../components/InsightReport'
import type { InsightReport } from '../hooks/useChat'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  ChevronLeft, Mic, MicOff, Volume2, VolumeX,
  Send, RotateCcw, Sparkles, Building2, TrendingUp, MapPin, X,
} from 'lucide-react'
import { BradescoLogo } from '../components/BradescoLogo'

interface Props {
  persona: Persona
  productFocus?: string
  onBack: () => void
  onReset: () => void
}

const segmentAccent: Record<string, string> = {
  mei: '#D12344',
  negocios: '#CC092F',
  empresas: '#96001F',
}

export function Interview({ persona, productFocus, onBack, onReset }: Props) {
  const { messages, loading, error, sendMessage, generateInsights } = useChat(persona, productFocus)
  const { isListening, ttsEnabled, setTtsEnabled, startListening, stopListening, speak } = useSpeech()
  const [input, setInput] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState<InsightReport | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [showPersonaModal, setShowPersonaModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const accent = segmentAccent[persona.segment] ?? '#cc092f'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const reply = await sendMessage(text)
    if (reply && ttsEnabled) speak(reply)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMic = () => {
    if (isListening) stopListening()
    else startListening(t => { setInput(t); inputRef.current?.focus() })
  }

  const handleEndInterview = async () => {
    setGeneratingReport(true)
    const data = await generateInsights()
    setReportData(data)
    setGeneratingReport(false)
    setShowReport(true)
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-[#f5f5f5]">

        {/* ── HEADER ───────────────────────────────────────────────── */}
        <header className="bradesco-header flex-shrink-0 px-4">
          <div className="flex items-center h-14 gap-2 min-w-0">

            {/* Voltar */}
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Personas</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <div className="h-5 w-px bg-white/30" />
              <BradescoLogo height={13} color="white" />
              <div className="h-5 w-px bg-white/30" />
              <span className="text-white font-bold text-sm">CXVox</span>
            </div>

            {/* Persona clicável — abre modal */}
            <button
              onClick={() => setShowPersonaModal(true)}
              className="flex items-center gap-2 ml-3 min-w-0 flex-1 justify-center
                px-3 py-1 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <Avatar className="w-7 h-7 rounded-full border-2 border-white/40 overflow-hidden flex-shrink-0 group-hover:border-white/70 transition-colors">
                <AvatarImage src={persona.photo} alt={persona.name} className="object-cover object-top" />
                <AvatarFallback className="bg-white/20 text-white text-xs font-semibold">
                  {persona.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <p className="text-white font-semibold text-sm leading-none truncate">{persona.name}</p>
                <p className="text-white/60 text-[11px] truncate hidden sm:block">{persona.role}</p>
              </div>
              {productFocus && (
                <span className="text-white/60 text-xs border border-white/20 px-2 py-0.5 rounded-full flex-shrink-0 hidden md:inline-block">
                  📌 {productFocus}
                </span>
              )}
            </button>

            {/* Ações */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {messages.length >= 2 && (
                <Button
                  size="sm"
                  onClick={handleEndInterview}
                  disabled={generatingReport}
                  className="h-8 bg-white text-[#cc092f] hover:bg-white/90 gap-1.5 text-xs font-semibold shadow-none px-3"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{generatingReport ? 'Analisando...' : 'Ver insights'}</span>
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onReset}
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nova entrevista</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* ── CHAT (full width) ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 min-w-0">
          <div className="flex-1 bg-white rounded-lg border border-[#e8e8e8] flex flex-col overflow-hidden shadow-sm min-w-0">
            <div className="h-1 w-full flex-shrink-0" style={{ backgroundColor: accent }} />

            <ScrollArea className="flex-1 px-4 py-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  {/* Foto clicável no estado vazio */}
                  <button
                    onClick={() => setShowPersonaModal(true)}
                    className="group mb-4 relative"
                  >
                    <Avatar className="w-20 h-20 rounded-2xl border-2 border-[#e8e8e8] overflow-hidden
                      group-hover:border-[#cc092f]/40 transition-colors">
                      <AvatarImage src={persona.photo} alt={persona.name} className="object-cover object-top" />
                      <AvatarFallback className="text-white text-xl font-bold rounded-2xl" style={{ backgroundColor: accent }}>
                        {persona.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-1 -right-1 bg-white border border-[#e8e8e8] rounded-full p-1 text-[10px] shadow-sm">
                      👤
                    </span>
                  </button>
                  <h3 className="text-base font-bold text-[#1a1a2e] mb-0.5">{persona.name}</h3>
                  <p
                    className="text-xs font-medium mb-1"
                    style={{ color: accent }}
                  >
                    {persona.role} · {persona.city}
                  </p>
                  <button
                    onClick={() => setShowPersonaModal(true)}
                    className="text-xs underline mb-5"
                    style={{ color: accent }}
                  >
                    Ver perfil completo
                  </button>
                  <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                    {[
                      'Como é sua relação com o banco hoje?',
                      'O que mais te frustra no atendimento bancário?',
                      'O que você esperaria de um banco ideal?',
                    ].map(s => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="text-xs px-3 py-1.5 bg-[#f5f5f5] hover:bg-[#fff0f2] border border-[#e8e8e8]
                          hover:border-[#cc092f]/20 rounded-full text-[#666] hover:text-[#cc092f] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl mx-auto pb-2">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.role === 'assistant' && (
                        <button onClick={() => setShowPersonaModal(true)} className="flex-shrink-0 mt-0.5">
                          <Avatar className="w-7 h-7 rounded-full border border-[#e8e8e8] overflow-hidden hover:opacity-80 transition-opacity">
                            <AvatarImage src={persona.photo} className="object-cover object-top" />
                            <AvatarFallback className="text-white text-[10px] font-semibold" style={{ backgroundColor: accent }}>
                              {persona.initials}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      )}
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'text-white rounded-tr-sm'
                            : 'bg-[#f5f5f5] text-[#374151] rounded-tl-sm border border-[#ebebeb]'
                        }`}
                        style={msg.role === 'user' ? { backgroundColor: accent } : {}}
                      >
                        {msg.content}
                        <div className={`text-[10px] mt-1 opacity-40 ${msg.role === 'user' ? 'text-right' : ''}`}>
                          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-2">
                      <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5 rounded-full border border-[#e8e8e8] overflow-hidden">
                        <AvatarImage src={persona.photo} className="object-cover object-top" />
                        <AvatarFallback className="text-white text-[10px] font-semibold" style={{ backgroundColor: accent }}>
                          {persona.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-[#f5f5f5] rounded-2xl rounded-tl-sm px-4 py-3 border border-[#ebebeb]">
                        <div className="flex gap-1 items-center">
                          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#bbb] inline-block" />
                          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#bbb] inline-block" />
                          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#bbb] inline-block" />
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="text-xs text-red-600 text-center py-2 bg-red-50 rounded-lg px-4 border border-red-100">{error}</p>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-[#f0f0f0] px-3 py-2.5 flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`h-9 w-9 p-0 flex-shrink-0 transition-colors ${
                      ttsEnabled ? 'bg-[#fff0f2] text-[#cc092f]' : 'text-[#bbb] hover:text-[#666]'
                    }`}>
                    {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{ttsEnabled ? 'Desativar voz' : 'Ativar voz'}</TooltipContent>
              </Tooltip>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? '🎙 Ouvindo...' : 'Digite sua pergunta...'}
                disabled={loading}
                className="flex-1 min-w-0 bg-[#f5f5f5] border border-[#e8e8e8] rounded-xl px-4 py-2.5 text-sm
                  text-[#1a1a2e] placeholder:text-[#bbb] focus:outline-none focus:ring-2
                  focus:ring-[#cc092f]/20 focus:border-[#cc092f]/40 transition-colors disabled:opacity-50"
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleMic}
                    className={`h-9 w-9 p-0 flex-shrink-0 transition-colors ${
                      isListening ? 'text-white hover:opacity-90' : 'text-[#bbb] hover:text-[#666]'
                    }`}
                    style={isListening ? { backgroundColor: accent } : {}}>
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isListening ? 'Parar' : 'Falar'}</TooltipContent>
              </Tooltip>

              <Button
                size="sm" onClick={handleSend}
                disabled={!input.trim() || loading}
                className="h-9 w-9 p-0 flex-shrink-0 text-white disabled:opacity-40 rounded-xl"
                style={{ backgroundColor: accent }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-center text-[10px] text-[#ccc] pb-1.5">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </div>
      </div>

      {/* ── MODAL PERSONA ────────────────────────────────────────────── */}
      <Dialog open={showPersonaModal} onOpenChange={setShowPersonaModal}>
        <DialogContent className="p-0 max-w-sm w-full rounded-2xl overflow-hidden border-0 shadow-2xl gap-0 bg-white">
          {/* Foto hero */}
          <div className="relative">
            <img
              src={persona.photo}
              alt={persona.name}
              className="w-full h-56 object-cover object-top"
            />
            {/* Gradiente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            {/* Barra colorida no topo */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent }} />
            {/* Botão fechar */}
            <button
              onClick={() => setShowPersonaModal(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50
                text-white flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {/* Nome sobre a foto */}
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-white text-xl font-bold leading-tight">{persona.name}</h2>
              <p className="text-white/70 text-sm">{persona.age} anos · {persona.city}</p>
            </div>
          </div>

          {/* Conteúdo */}
          <ScrollArea className="max-h-[55vh] bg-white">
            <div className="p-5 space-y-4">

              {/* Role badge */}
              <div className="flex flex-wrap gap-2">
                <span
                  className="text-white text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: accent }}
                >
                  {persona.role}
                </span>
                {persona.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs text-[#555] bg-[#f5f5f5] border border-[#e8e8e8] px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Info resumida */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#bbb] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#374151] truncate">{persona.company}</p>
                    <p className="text-[11px] text-[#aaa]">{persona.sector}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: accent }} />
                  <div>
                    <p className="text-xs font-semibold text-[#374151]">{persona.faturamento}</p>
                    <p className="text-[11px] text-[#aaa]">faturamento</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-[#bbb] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#555]">{persona.city}</p>
                </div>
              </div>

              <div className="border-t border-[#f0f0f0]" />

              {/* Bio */}
              <div>
                <p className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest mb-2">Sobre</p>
                <p className="text-sm text-[#555] leading-relaxed">{persona.bio}</p>
              </div>

              {/* Motivação */}
              <div>
                <p className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest mb-2">Motivação</p>
                <p className="text-sm text-[#555] leading-relaxed">{persona.motivacao}</p>
              </div>

              {/* Dores */}
              <div>
                <p className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest mb-2">Dores Principais</p>
                <div className="space-y-2">
                  {persona.dores.map((dor, i) => (
                    <div key={i} className="flex gap-2 text-sm text-[#555] bg-[#fafafa] rounded-lg px-3 py-2 border border-[#f0f0f0]">
                      <span className="flex-shrink-0 font-bold" style={{ color: accent }}>•</span>
                      {dor}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tom de voz */}
              <div>
                <p className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest mb-2">Tom de Voz</p>
                <p className="text-sm text-[#555] italic leading-relaxed">"{persona.tom}"</p>
              </div>

            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {showReport && (
        <InsightReportModal
          persona={persona}
          report={reportData}
          messageCount={messages.length}
          onClose={() => setShowReport(false)}
          onNewInterview={onReset}
        />
      )}
    </TooltipProvider>
  )
}
