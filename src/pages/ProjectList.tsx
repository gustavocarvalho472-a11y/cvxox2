import { useState } from 'react'
import {
  ChevronLeft, Trash2, MessageSquare, Target, Lightbulb, Quote, FolderOpen,
} from 'lucide-react'
import { BradescoLogo } from '../components/BradescoLogo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { SavedProject } from '../hooks/useProjects'

const segmentLabels: Record<string, string> = {
  mei: 'MEI',
  negocios: 'Negócios',
  empresas: 'Empresas',
}

const segmentColors: Record<string, string> = {
  mei: '#D12344',
  negocios: '#CC092F',
  empresas: '#96001F',
}

interface Props {
  projects: SavedProject[]
  onDelete: (id: string) => void
  onBack: () => void
}

export function ProjectList({ projects, onDelete, onBack }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* Header */}
      <header className="bradesco-header px-6 py-0 flex-shrink-0">
        <div className="flex items-center gap-3 h-14">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Início
          </button>
          <div className="h-5 w-px bg-white/30" />
          <BradescoLogo height={15} color="white" />
          <div className="h-5 w-px bg-white/30" />
          <span className="text-white font-bold text-sm">CXVox</span>
          <span className="text-white/50 text-sm ml-1">/ Projetos</span>
          {projects.length > 0 && (
            <span className="ml-1 bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {projects.length}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderOpen className="w-12 h-12 text-[#ddd] mb-4" />
            <h3 className="text-lg font-semibold text-[#555] mb-2">Nenhum projeto salvo</h3>
            <p className="text-sm text-[#aaa] max-w-sm leading-relaxed">
              Realize uma entrevista, gere os insights e clique em "Salvar projeto" para que ele apareça aqui.
            </p>
            <Button
              onClick={onBack}
              className="mt-6 bg-[#CC092F] hover:bg-[#a8071f] text-white shadow-none"
            >
              Iniciar entrevista
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(project => {
              const accent = segmentColors[project.segment] ?? '#CC092F'
              const isExpanded = expanded === project.id
              const date = new Date(project.createdAt)

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden shadow-sm"
                >
                  {/* Project header — clickable to expand */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : project.id)}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-10 h-10 rounded-xl border border-[#e8e8e8] overflow-hidden">
                        <AvatarImage src={project.personaPhoto} className="object-cover object-top" />
                        <AvatarFallback
                          className="text-white font-semibold text-sm rounded-xl"
                          style={{ backgroundColor: accent }}
                        >
                          {project.personaInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
                          flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: accent }}
                      >
                        {project.insights.satisfacao}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-[#1a1a2e] truncate">
                          {project.personaName}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-[#e8e8e8] text-[#888] flex-shrink-0"
                        >
                          {segmentLabels[project.segment]}
                        </Badge>
                        {project.productFocus && (
                          <Badge
                            variant="outline"
                            className="text-[10px] flex-shrink-0"
                            style={{ borderColor: `${accent}40`, color: accent }}
                          >
                            {project.productFocus}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#aaa]">
                        {project.personaRole} · {project.messageCount} mensagens ·{' '}
                        {date.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-[#aaa]">Satisfação</p>
                        <p className="text-lg font-bold leading-none" style={{ color: accent }}>
                          {project.insights.satisfacao}
                          <span className="text-xs font-normal text-[#ccc]">/10</span>
                        </p>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (confirm('Excluir este projeto?')) onDelete(project.id)
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#ccc]
                          hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded insights */}
                  {isExpanded && (
                    <div className="border-t border-[#f0f0f0]">
                      <ScrollArea className="max-h-[420px]">
                        <div className="p-5 space-y-4">
                          {/* Score */}
                          <div className="rounded-xl p-3 border" style={{ backgroundColor: `${accent}08`, borderColor: `${accent}30` }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-[#555]">Satisfação percebida</span>
                              <span className="text-xl font-bold" style={{ color: accent }}>
                                {project.insights.satisfacao}
                                <span className="text-xs font-normal text-[#aaa]">/10</span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#f0f0f0] rounded-full mb-2">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${project.insights.satisfacao * 10}%`, backgroundColor: accent }}
                              />
                            </div>
                            <p className="text-xs text-[#777] leading-relaxed">{project.insights.justificativa}</p>
                          </div>

                          {/* Temas */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-3.5 h-3.5 text-[#CC092F]" />
                              <h4 className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Temas</h4>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {project.insights.temas.map((t, i) => (
                                <Badge key={i} variant="secondary" className="text-xs bg-[#f5f5f5] text-[#666]">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Dores */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="w-3.5 h-3.5 text-[#CC092F]" />
                              <h4 className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Dores confirmadas</h4>
                            </div>
                            <div className="space-y-1.5">
                              {project.insights.dores.map((d, i) => (
                                <div key={i} className="flex gap-2 text-xs text-[#555] bg-[#f9f9f9] rounded-lg px-3 py-2">
                                  <span style={{ color: accent }} className="flex-shrink-0">•</span>
                                  {d}
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Oportunidades */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                              <h4 className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Oportunidades</h4>
                            </div>
                            <div className="space-y-1.5">
                              {project.insights.oportunidades.map((o, i) => (
                                <div key={i} className="flex gap-2 text-xs text-[#555] bg-[#f9f9f9] rounded-lg px-3 py-2">
                                  <span className="text-emerald-600 flex-shrink-0">→</span>
                                  {o}
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Frases */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Quote className="w-3.5 h-3.5 text-[#aaa]" />
                              <h4 className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Frases marcantes</h4>
                            </div>
                            <div className="space-y-2">
                              {project.insights.frases.map((f, i) => (
                                <blockquote
                                  key={i}
                                  className="text-xs text-[#555] italic pl-3 border-l-2 leading-relaxed"
                                  style={{ borderColor: accent }}
                                >
                                  "{f}"
                                </blockquote>
                              ))}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
