import { useState } from 'react'
import { segments } from '../data/personas'
import type { SegmentId } from '../data/personas'
import { Settings, ChevronRight, Briefcase, TrendingUp, Building2 } from 'lucide-react'
import { BradescoLogo } from '../components/BradescoLogo'
import { BradescoGrafismo } from '../components/BradescoGrafismo'

interface Props {
  onSelect: (segmentId: SegmentId) => void
  onOpenConfig?: () => void
}

// Apenas a família vermelha Bradesco — tons do brand kit
const segmentConfig: Record<SegmentId, {
  colorBar: string
  iconBg: string
  iconText: string
  icon: React.ReactNode
  tagline: string
}> = {
  mei: {
    colorBar: '#D12344',
    iconBg: '#FFF0F3',
    iconText: '#D12344',
    icon: <Briefcase className="w-5 h-5" />,
    tagline: 'Conta PJ · PIX · Maquininha',
  },
  negocios: {
    colorBar: '#CC092F',
    iconBg: '#FFF0F2',
    iconText: '#CC092F',
    icon: <TrendingUp className="w-5 h-5" />,
    tagline: 'Crédito · Seguro · Consórcio',
  },
  empresas: {
    colorBar: '#96001F',
    iconBg: '#F9E6EA',
    iconText: '#96001F',
    icon: <Building2 className="w-5 h-5" />,
    tagline: 'Câmbio · Estruturado · Private',
  },
}

export function SegmentSelect({ onSelect, onOpenConfig }: Props) {
  const [hovered, setHovered] = useState<SegmentId | null>(null)

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── HEADER BRADESCO ─────────────────────────────────────── */}
      <header className="bradesco-header px-8 py-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <BradescoLogo height={16} color="white" />
            <div className="h-5 w-px bg-white/30" />
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm tracking-wide">CXVox</span>
              <span className="text-white/50 text-xs">·</span>
              <span className="text-white/70 text-xs font-medium">Pesquisa PJ</span>
            </div>
          </div>
          {onOpenConfig && (
            <button
              onClick={onOpenConfig}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium transition-colors py-1.5 px-3 rounded hover:bg-white/10"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurar
            </button>
          )}
        </div>
      </header>

      {/* ── HERO STRIP ──────────────────────────────────────────── */}
      <div className="relative bg-[#f9f9f9] border-b border-[#e8e8e8] overflow-hidden">
        {/* Grafismo canto direito */}
        <BradescoGrafismo position="top-right" opacity={0.18} />

        <div className="max-w-6xl mx-auto px-8 py-10 relative z-10">
          <p className="text-xs font-bold text-[#CC092F] uppercase tracking-widest mb-3">
            Pesquisa Qualitativa
          </p>
          <h1 className="text-3xl font-bold text-[#1a1a2e] leading-tight mb-2">
            Com qual segmento você<br />quer conversar?
          </h1>
          <p className="text-[#6b7280] text-sm">
            Selecione o perfil de cliente PJ para iniciar uma entrevista com persona sintética.
          </p>
        </div>
      </div>

      {/* ── CARDS DE SEGMENTO ───────────────────────────────────── */}
      <main className="flex-1 py-10 relative overflow-hidden">
        {/* Grafismo canto inferior esquerdo */}
        <BradescoGrafismo position="bottom-left" opacity={0.07} />

        <div className="max-w-6xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.values(segments) as typeof segments[SegmentId][]).map((segment) => {
              const cfg = segmentConfig[segment.id]
              const isHovered = hovered === segment.id
              return (
                <button
                  key={segment.id}
                  onClick={() => onSelect(segment.id)}
                  onMouseEnter={() => setHovered(segment.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="text-left rounded-lg border border-[#e8e8e8] bg-white overflow-hidden
                    transition-all duration-200 cursor-pointer group
                    hover:shadow-lg hover:-translate-y-1 hover:border-[#d0d0d0]
                    focus:outline-none focus:ring-2 focus:ring-[#cc092f]/30"
                >
                  {/* Barra colorida no topo */}
                  <div className="h-1 w-full" style={{ backgroundColor: cfg.colorBar }} />

                  <div className="p-7">
                    {/* Ícone */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-5 transition-all duration-200"
                      style={isHovered
                        ? { backgroundColor: cfg.colorBar, color: '#ffffff', transform: 'scale(1.1)' }
                        : { backgroundColor: cfg.iconBg, color: cfg.iconText }
                      }
                    >
                      {cfg.icon}
                    </div>

                    <h3 className="text-xl font-bold text-[#1a1a2e] mb-1">
                      {segment.label}
                    </h3>
                    <p className="text-xs font-semibold mb-3" style={{ color: cfg.colorBar }}>
                      {segment.sublabel}
                    </p>
                    <p className="text-sm text-[#6b7280] leading-relaxed mb-6">
                      {segment.description}
                    </p>

                    <p className="text-[11px] text-[#aaa] font-medium uppercase tracking-wider mb-5">
                      {cfg.tagline}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-[#f0f0f0]">
                      <span className="text-xs text-[#999]">
                        {segment.personas.length} personas disponíveis
                      </span>
                      <div
                        className="flex items-center gap-1 text-xs font-semibold transition-colors duration-200"
                        style={{ color: isHovered ? cfg.colorBar : '#bbb' }}
                      >
                        Selecionar
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-12 pt-8 border-t border-[#f0f0f0]">
            <p className="text-xs text-[#bbb] text-center">
              Plataforma de pesquisa qualitativa com personas sintéticas PJ · Bradesco
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
