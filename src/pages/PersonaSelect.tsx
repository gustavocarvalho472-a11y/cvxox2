import { useState } from 'react'
import { personas, segments } from '../data/personas'
import type { SegmentId, Persona } from '../data/personas'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Building2, TrendingUp, MapPin, X, ChevronRight } from 'lucide-react'
import { BradescoLogo } from '../components/BradescoLogo'
import { BradescoGrafismo } from '../components/BradescoGrafismo'

interface Props {
  segmentId: SegmentId
  onSelect: (persona: Persona, productFocus?: string) => void
  onBack: () => void
}

const segmentProducts: Record<SegmentId, string[]> = {
  mei: [
    'Conta PJ', 'PIX', 'Maquininha', 'Boleto', 'Cartão PJ',
    'Antecipação', 'Empréstimo PJ',
  ],
  negocios: [
    'Capital de Giro', 'Antecipação', 'Seguro Empresarial',
    'Consórcio Veículos', 'Consórcio Imóvel', 'Folha de Pagamento',
    'Conta Salário', 'Crédito para Equipamentos',
  ],
  empresas: [
    'Câmbio', 'Carta de Crédito', 'Hedge Cambial', 'CCB / FINAME',
    'Consórcio Industrial', 'Previdência Privada',
    'Planejamento Patrimonial', 'Conta Investimento PJ',
  ],
}

// Apenas tons da família vermelha Bradesco (brand kit)
const segmentColor: Record<SegmentId, string> = {
  mei: '#D12344',     // vermelho vibrante — ton 1
  negocios: '#CC092F', // vermelho institucional
  empresas: '#96001F', // vermelho escuro — ton 5
}

export function PersonaSelect({ segmentId, onSelect, onBack }: Props) {
  const segment = segments[segmentId]
  const segmentPersonas = segment.personas.map(id => personas[id])
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const products = segmentProducts[segmentId]
  const accentColor = segmentColor[segmentId]

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── HEADER BRADESCO ──────────────────────────────────────── */}
      <header className="bradesco-header px-8 py-0 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14">

          {/* Voltar + Brand */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Segmentos
            </button>
            <div className="h-5 w-px bg-white/30" />
            <BradescoLogo height={15} color="white" />
            <div className="h-5 w-px bg-white/30" />
            <span className="text-white font-bold text-sm tracking-wide">CXVox</span>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <span>Segmentos</span>
            <ChevronRight className="w-3 h-3" />
            <span
              className="font-semibold px-2 py-0.5 rounded text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              {segment.label}
            </span>
          </div>
        </div>
      </header>

      {/* ── HERO STRIP ───────────────────────────────────────────── */}
      <div className="relative border-b border-[#e8e8e8] bg-[#f9f9f9] overflow-hidden">
        <BradescoGrafismo position="top-right" opacity={0.14} />
        <div className="max-w-6xl mx-auto px-8 py-8 relative z-10">
          <div className="flex items-start gap-3">
            {/* Indicador colorido */}
            <div
              className="w-1 h-12 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: accentColor }}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: accentColor }}>
                {segment.label} — {segment.sublabel}
              </p>
              <h1 className="text-2xl font-bold text-[#1a1a2e]">
                Escolha uma persona para entrevistar
              </h1>
              <p className="text-sm text-[#6b7280] mt-1">{segment.description}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 py-8">
        <div className="max-w-6xl mx-auto px-8">

          {/* ── FOCO DE PRODUTO ──────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-[#e8e8e8] p-5 mb-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
              <p className="text-sm font-semibold text-[#1a1a2e]">
                Foco de produto
              </p>
              <span className="text-xs text-[#aaa]">— opcional, direciona a entrevista</span>
              {selectedProduct && (
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="ml-auto flex items-center gap-1 text-xs text-[#999] hover:text-[#1a1a2e] transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {products.map(product => (
                <button
                  key={product}
                  onClick={() => setSelectedProduct(prev => prev === product ? null : product)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                    selectedProduct === product
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-[#f5f5f5] text-[#555] border-[#e8e8e8] hover:border-[#cc092f]/30 hover:text-[#cc092f] hover:bg-[#fff0f2]'
                  }`}
                  style={selectedProduct === product ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                >
                  {product}
                </button>
              ))}
            </div>
            {selectedProduct && (
              <p className="mt-3 text-xs font-medium" style={{ color: accentColor }}>
                ✓ A conversa vai aprofundar a experiência com {selectedProduct}
              </p>
            )}
          </div>

          {/* ── PERSONA CARDS ────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {segmentPersonas.map((persona) => (
              <div
                key={persona.id}
                className="bg-white rounded-lg border border-[#e8e8e8] overflow-hidden
                  cursor-pointer group
                  transition-all duration-200
                  hover:shadow-xl hover:-translate-y-1 hover:border-[#d0d0d0]"
                onClick={() => onSelect(persona, selectedProduct ?? undefined)}
              >
                {/* Barra colorida no topo */}
                <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

                {/* Hero photo */}
                <div className="relative overflow-hidden h-52">
                  <img
                    src={persona.photo}
                    alt={persona.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {/* Badge role */}
                  <span
                    className="absolute bottom-3 left-3 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm"
                    style={{ backgroundColor: accentColor }}
                  >
                    {persona.role}
                  </span>
                </div>

                {/* Info */}
                <div className="p-5 flex flex-col gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#1a1a2e] leading-tight">{persona.name}</h3>
                    <p className="text-xs text-[#aaa] mt-0.5">{persona.age} anos</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[#bbb] mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#374151] leading-tight truncate">{persona.company}</p>
                        <p className="text-xs text-[#aaa]">{persona.sector}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accentColor }} />
                      <p className="text-sm text-[#555]">{persona.faturamento}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#bbb] flex-shrink-0" />
                      <p className="text-sm text-[#777]">{persona.city}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#888] leading-relaxed line-clamp-2 border-t border-[#f0f0f0] pt-3">
                    {persona.bio}
                  </p>

                  <Button
                    className="w-full text-white text-sm font-semibold mt-1 rounded-md shadow-none transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accentColor }}
                    onClick={(e) => { e.stopPropagation(); onSelect(persona, selectedProduct ?? undefined) }}
                  >
                    {selectedProduct ? `Entrevistar sobre ${selectedProduct}` : 'Iniciar Entrevista'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
