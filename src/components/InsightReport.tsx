import type { Persona } from '../data/personas'
import type { InsightReport } from '../hooks/useChat'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Printer, RotateCcw, MessageSquare, Target, Lightbulb, Quote } from 'lucide-react'

interface Props {
  persona: Persona
  report: InsightReport | null
  messageCount: number
  onClose: () => void
  onNewInterview: () => void
}

export function InsightReportModal({ persona, report, messageCount, onClose, onNewInterview }: Props) {
  if (!report) return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl border-zinc-200">
        <DialogHeader>
          <DialogTitle>Relatório indisponível</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500">Faça ao menos 3 perguntas antes de encerrar.</p>
        <Button variant="outline" onClick={onClose}>Voltar</Button>
      </DialogContent>
    </Dialog>
  )

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white rounded-2xl border-zinc-200 max-h-[88vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 rounded-xl border border-zinc-200">
              <AvatarImage src={persona.photo} className="object-cover" />
              <AvatarFallback className="bg-red-50 text-[#cc092f] font-semibold rounded-xl text-sm">
                {persona.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base text-zinc-900">Insights · {persona.name}</DialogTitle>
              <p className="text-xs text-zinc-400 mt-0.5">{persona.role} · {messageCount} mensagens</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-5">
          <div className="space-y-5">
            {/* Score */}
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-700">Satisfação percebida</span>
                <span className="text-2xl font-bold text-[#cc092f]">
                  {report.satisfacao}<span className="text-sm font-normal text-zinc-400">/10</span>
                </span>
              </div>
              <div className="h-1.5 bg-red-100 rounded-full mb-2">
                <div
                  className="h-full bg-[#cc092f] rounded-full transition-all duration-700"
                  style={{ width: `${report.satisfacao * 10}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{report.justificativa}</p>
            </div>

            {/* Temas */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <MessageSquare className="w-4 h-4 text-[#cc092f]" />
                <h4 className="text-sm font-semibold text-zinc-800">Temas levantados</h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.temas.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-zinc-100 text-zinc-700">{t}</Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Dores */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Target className="w-4 h-4 text-[#cc092f]" />
                <h4 className="text-sm font-semibold text-zinc-800">Dores confirmadas</h4>
              </div>
              <div className="space-y-1.5">
                {report.dores.map((d, i) => (
                  <div key={i} className="flex gap-2 text-sm text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2">
                    <span className="text-[#cc092f] flex-shrink-0">•</span>
                    {d}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Oportunidades */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Lightbulb className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-zinc-800">Oportunidades de produto</h4>
              </div>
              <div className="space-y-1.5">
                {report.oportunidades.map((o, i) => (
                  <div key={i} className="flex gap-2 text-sm text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2">
                    <span className="text-emerald-600 flex-shrink-0">→</span>
                    {o}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Frases */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Quote className="w-4 h-4 text-zinc-400" />
                <h4 className="text-sm font-semibold text-zinc-800">Frases marcantes</h4>
              </div>
              <div className="space-y-2">
                {report.frases.map((f, i) => (
                  <blockquote key={i} className="text-sm text-zinc-600 italic pl-3 border-l-2 border-[#cc092f] leading-relaxed">
                    "{f}"
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-zinc-600">
            <Printer className="w-3.5 h-3.5" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Continuar entrevista
          </Button>
          <Button size="sm" onClick={onNewInterview} className="bg-[#cc092f] hover:bg-[#a8071f] text-white gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Nova entrevista
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
