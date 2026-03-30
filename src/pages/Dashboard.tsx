import { useState, useMemo } from 'react'
import { ChevronLeft, BarChart2, TrendingUp, TrendingDown, Lightbulb, ChevronDown } from 'lucide-react'
import { BradescoLogo } from '../components/BradescoLogo'
import {
  businessUnits, businessLabels, periods, periodLabels, productsByBusiness,
  getDashboardData, getFilterLabel, computeRevPreserved,
  type BusinessUnit, type Period, type DashboardData,
  type LTVSegment, type NPSJornada, type SLAItem,
  type ChurnByTenure, type MonthlyRevenue, type NPSRenewal,
} from '../data/dashboardData'

interface Props { onBack: () => void }

// ── HELPERS ────────────────────────────────────────────────────────────────

const fmtR = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`
  return `R$ ${v.toLocaleString('pt-BR')}`
}
const fmtN = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(1)}k` : String(v)
const npsColor = (n: number) => n >= 70 ? '#22c55e' : n >= 55 ? '#f59e0b' : '#ef4444'
const npsLabel = (n: number) => n >= 70 ? 'Saudável' : n >= 55 ? 'Neutro' : 'Crítico'

// ── KPI CARD ───────────────────────────────────────────────────────────────

function KPICard({
  label, value, delta, deltaLabel, sub,
  progress, progressMeta, invertDelta,
}: {
  label: string; value: string; delta?: number; deltaLabel?: string
  sub?: string; progress?: number; progressMeta?: number; invertDelta?: boolean
}) {
  const good = invertDelta ? (delta ?? 0) <= 0 : (delta ?? 0) >= 0
  return (
    <div className="bradesco-card p-4 flex flex-col gap-2 min-h-[120px]">
      <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider leading-none">{label}</p>
      <p className="text-2xl font-bold text-[#1a1a2e] leading-none">{value}</p>
      {sub && <p className="text-[10px] text-[#aaa] leading-none">{sub}</p>}
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${good ? 'text-emerald-600' : 'text-red-500'}`}>
          {good ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{delta > 0 ? '+' : ''}{delta}{deltaLabel ?? ''}</span>
          <span className="text-[#bbb] font-normal ml-0.5">vs ant.</span>
        </div>
      )}
      {progress !== undefined && progressMeta !== undefined && (
        <div className="mt-auto space-y-1">
          <div className="flex justify-between text-[9px] text-[#bbb]">
            <span>Meta: {progressMeta}</span>
            <span>{Math.min(Math.round((progress / progressMeta) * 100), 100)}%</span>
          </div>
          <div className="h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min((progress / progressMeta) * 100, 100)}%`,
                backgroundColor: '#CC092F',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── LINE SVG ───────────────────────────────────────────────────────────────

function LineSVG({
  series, labels,
}: {
  series: { values: number[]; color: string; dashed?: boolean }[]
  labels: string[]
}) {
  const W = 400, H = 100, PL = 28, PR = 8, PT = 6, PB = 20
  const chartW = W - PL - PR
  const chartH = H - PT - PB
  const allVals = series.flatMap(s => s.values)
  const minV = Math.min(...allVals) - 2
  const maxV = Math.max(...allVals) + 2
  const range = maxV - minV || 1
  const xStep = chartW / Math.max(labels.length - 1, 1)
  const yOf = (v: number) => PT + chartH - ((v - minV) / range) * chartH
  const xOf = (i: number) => PL + i * xStep
  const pathOf = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={PL} x2={W - PR}
          y1={PT + chartH * (1 - t)} y2={PT + chartH * (1 - t)}
          stroke="#f0f0f0" strokeWidth="1" />
      ))}
      {series.map((s, si) => (
        <path key={si} d={pathOf(s.values)} fill="none" stroke={s.color} strokeWidth="1.8"
          strokeDasharray={s.dashed ? '4 3' : undefined} strokeLinejoin="round" />
      ))}
      {labels.map((l, i) => i % 3 === 0 && (
        <text key={i} x={xOf(i)} y={H - 4} fontSize="7" fill="#9ca3af" textAnchor="middle">{l}</text>
      ))}
      {[0, 0.5, 1].map((t, i) => (
        <text key={i} x={PL - 2} y={PT + chartH * (1 - t) + 3} fontSize="7" fill="#9ca3af" textAnchor="end">
          {Math.round(minV + range * t)}
        </text>
      ))}
    </svg>
  )
}

// ── STACKED BAR SVG ────────────────────────────────────────────────────────

function StackedBarSVG({ data }: { data: MonthlyRevenue[] }) {
  const W = 400, H = 100, PL = 8, PR = 8, PT = 8, PB = 18
  const chartW = W - PL - PR
  const chartH = H - PT - PB
  const maxTotal = Math.max(...data.map(d => d.nova + d.expandida + d.recuperada)) * 1.05
  const gap = chartW / data.length
  const barW = gap * 0.65
  const xOf = (i: number) => PL + i * gap + (gap - barW) / 2
  const hOf = (v: number) => (v / maxTotal) * chartH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={PL} x2={W - PR}
          y1={PT + chartH * (1 - t)} y2={PT + chartH * (1 - t)}
          stroke="#f0f0f0" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const total = d.nova + d.expandida + d.recuperada
        const y0 = PT + chartH - hOf(total)
        const h0 = hOf(d.nova)
        const h1 = hOf(d.expandida)
        const h2 = hOf(d.recuperada)
        const x = xOf(i)
        return (
          <g key={i}>
            <rect x={x} y={y0} width={barW} height={h0} fill="#96001F" rx="1" />
            <rect x={x} y={y0 + h0} width={barW} height={h1} fill="#CC092F" />
            <rect x={x} y={y0 + h0 + h1} width={barW} height={h2} fill="#D12344" />
          </g>
        )
      })}
      {data.map((d, i) => i % 3 === 0 && (
        <text key={i} x={xOf(i) + barW / 2} y={H - 4} fontSize="7" fill="#9ca3af" textAnchor="middle">
          {d.month}
        </text>
      ))}
    </svg>
  )
}

// ── CHART CARD WRAPPER ─────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#e8e8e8] p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-[#1a1a2e]">{title}</p>
        <p className="text-[10px] text-[#aaa] mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

// ── LTV CHART ─────────────────────────────────────────────────────────────

function LTVChart({ data }: { data: LTVSegment[] }) {
  const max = Math.max(...data.map(s => s.meta)) * 1.1
  return (
    <div className="space-y-3">
      {data.map(seg => {
        const improved = Math.round(seg.atual * 1.08)
        return (
          <div key={seg.label} className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-[#374151]">{seg.label}</span>
              <span className="text-[10px] text-[#aaa]">R${seg.atual}k → R${improved}k / meta R${seg.meta}k</span>
            </div>
            <div className="relative h-5 bg-[#f5f5f5] rounded overflow-visible">
              {/* meta marker */}
              <div className="absolute top-0 bottom-0 w-px bg-[#ccc] z-10"
                style={{ left: `${Math.min((seg.meta / max) * 100, 100)}%` }} />
              {/* atual */}
              <div className="absolute top-1 bottom-1 rounded-sm bg-[#CC092F]"
                style={{ width: `${(seg.atual / max) * 100}%` }} />
              {/* improved dashed */}
              <div className="absolute top-0 bottom-0 rounded border-2 border-dashed border-[#CC092F]/50 bg-[#CC092F]/10"
                style={{ width: `${(improved / max) * 100}%` }} />
            </div>
          </div>
        )
      })}
      <div className="flex gap-4 pt-1">
        {[
          { color: 'bg-[#CC092F]', label: 'Atual' },
          { color: 'bg-[#CC092F]/10 border border-dashed border-[#CC092F]/50', label: '+5pp NPS' },
          { color: 'bg-[#ccc]', label: 'Meta' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-2 rounded-sm ${l.color}`} />
            <span className="text-[10px] text-[#888]">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── NPS JORNADA CHART ──────────────────────────────────────────────────────

function NPSJornadaChart({ data }: { data: NPSJornada[] }) {
  return (
    <div className="space-y-2.5">
      {data.map(item => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] font-medium text-[#374151]">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold" style={{ color: npsColor(item.nps) }}>
                {item.nps}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white"
                style={{ backgroundColor: npsColor(item.nps) }}>
                {npsLabel(item.nps)}
              </span>
            </div>
          </div>
          <div className="relative h-3 bg-[#f5f5f5] rounded-full overflow-visible">
            {/* meta */}
            <div className="absolute top-0 bottom-0 w-px bg-[#ccc] z-10"
              style={{ left: `${item.meta}%` }} />
            <div className="h-full rounded-full"
              style={{ width: `${item.nps}%`, backgroundColor: npsColor(item.nps), opacity: 0.85 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── SLA CHART ─────────────────────────────────────────────────────────────

function SLAChart({ data }: { data: SLAItem[] }) {
  const max = Math.max(...data.map(s => Math.max(s.avg, s.meta))) * 1.2
  return (
    <div className="space-y-2.5">
      {data.map(item => {
        const ok = item.avg <= item.meta
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-medium text-[#374151] truncate max-w-[55%]">{item.label}</span>
              <span className={`text-[10px] font-semibold ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
                {item.avg}{item.unit} <span className="text-[#bbb] font-normal">/ meta {item.meta}{item.unit}</span>
              </span>
            </div>
            <div className="relative h-3 bg-[#f5f5f5] rounded-full">
              {/* meta marker */}
              <div className="absolute top-0 bottom-0 w-px bg-[#999] z-10"
                style={{ left: `${(item.meta / max) * 100}%` }} />
              <div className="h-full rounded-full"
                style={{
                  width: `${(item.avg / max) * 100}%`,
                  backgroundColor: ok ? '#22c55e' : '#ef4444',
                  opacity: 0.8,
                }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── CHURN BY TENURE CHART ──────────────────────────────────────────────────

function ChurnTenureChart({ data }: { data: ChurnByTenure[] }) {
  const maxPct = Math.max(...data.map(d => d.churnPct))
  const maxR = Math.max(...data.map(d => d.churnR))
  return (
    <div className="space-y-2.5">
      {data.map(item => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] font-medium text-[#374151]">{item.label}</span>
            <span className="text-[10px] text-[#888]">
              <span className="font-semibold text-[#CC092F]">{item.churnPct}%</span>
              <span className="mx-1 text-[#ccc]">·</span>
              <span className="text-[#ef4444]">{fmtR(item.churnR)}</span>
            </span>
          </div>
          <div className="relative h-3 bg-[#f5f5f5] rounded-full overflow-hidden">
            {/* R$ in risk (background gray) */}
            <div className="absolute inset-0 rounded-full bg-[#fee2e2]"
              style={{ width: `${(item.churnR / maxR) * 100}%` }} />
            {/* % churn (foreground red) */}
            <div className="absolute top-0.5 bottom-0.5 rounded-full bg-[#CC092F]"
              style={{ width: `${(item.churnPct / maxPct) * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="flex gap-4 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-[#CC092F]" />
          <span className="text-[10px] text-[#888]">% Churn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-[#fee2e2]" />
          <span className="text-[10px] text-[#888]">R$ em risco</span>
        </div>
      </div>
    </div>
  )
}

// ── FUNNEL ─────────────────────────────────────────────────────────────────

const FUNNEL_COLORS = ['#8B0A1E', '#A8142E', '#CC092F', '#CC1060']

function FunnelSection({ data }: { data: DashboardData }) {
  const stages = data.funnelStages
  const maxVal = stages[0]?.value ?? 1
  return (
    <div className="bg-white rounded-xl border border-[#e8e8e8] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-[#1a1a2e]">Funil de Resultados PJ</p>
          <p className="text-[10px] text-[#aaa] mt-0.5">Ciclo de vida do cliente · volume proporcional</p>
        </div>
        <BarChart2 className="w-4 h-4 text-[#CC092F]" />
      </div>
      <div className="flex flex-col items-center gap-0">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1
          const widthPct = isLast ? 45 : Math.max((stage.value / maxVal) * 100, 35)
          const color = FUNNEL_COLORS[Math.min(i, FUNNEL_COLORS.length - 1)]
          return (
            <div key={stage.label} className="w-full flex flex-col items-center">
              {/* Stage bar */}
              <div
                className="rounded-lg flex items-center justify-between px-4 py-2.5 transition-all"
                style={{
                  width: `${widthPct}%`,
                  minWidth: '55%',
                  backgroundColor: isLast ? 'white' : color,
                  border: isLast ? `2px solid ${FUNNEL_COLORS[FUNNEL_COLORS.length - 1]}` : 'none',
                }}
              >
                <div>
                  <p className={`text-xs font-semibold ${isLast ? 'text-[#1a1a2e]' : 'text-white'}`}>
                    {stage.label}
                  </p>
                  <div className={`flex items-center gap-1.5 mt-0.5`}>
                    <span className={`text-[10px] ${isLast ? 'text-[#888]' : 'text-white/70'}`}>
                      {stage.delta > 0 ? '+' : ''}{stage.delta}% vs ant.
                    </span>
                  </div>
                </div>
                <p className={`text-base font-bold ${isLast ? 'text-[#CC092F]' : 'text-white'}`}>
                  {isLast ? fmtR(stage.value) : fmtN(stage.value)}
                </p>
              </div>
              {/* Connector with convRate */}
              {!isLast && (
                <div className="flex flex-col items-center py-1">
                  <ChevronDown className="w-3.5 h-3.5 text-[#ccc]" />
                  {stages[i + 1]?.convRate !== undefined && (
                    <span className="text-[9px] font-semibold text-[#CC092F] -mt-0.5">
                      {stages[i + 1].convRate}% conv.
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN DASHBOARD ─────────────────────────────────────────────────────────

export function Dashboard({ onBack }: Props) {
  const [business, setBusiness] = useState<BusinessUnit>('todos')
  const [product, setProduct] = useState<string>('todos')
  const [period, setPeriod] = useState<Period>('month')

  const data = useMemo(() => getDashboardData(business, product, period), [business, product, period])

  const filterLabel = getFilterLabel(business, product)
  const revPreserved = computeRevPreserved(data.kpi, period)
  const argumento = `${filterLabel} apresenta NPS de ${data.kpi.nps}, com churn de ${data.kpi.churnPct}%. ` +
    `Uma melhora de 5pp no NPS representa ${fmtR(revPreserved)} em receita preservada anualmente ` +
    `(elasticidade: 0,4% de redução de churn por pp de NPS).`

  const products = business !== 'todos' ? productsByBusiness[business] : []

  const months = data.npsRenewal.map(d => d.month)

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bradesco-header flex-shrink-0 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center h-14 gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Início</span>
          </button>
          <div className="h-5 w-px bg-white/30" />
          <BradescoLogo height={13} color="white" />
          <div className="h-5 w-px bg-white/30" />
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-sm">Dashboard CX</span>
            <span className="text-white/50 text-xs hidden sm:block">· Produtos PJ</span>
          </div>
        </div>
      </header>

      {/* ── CONTENT ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-5 space-y-4">

          {/* ── FILTERS ──────────────────────────────────────────────── */}
          <div className="space-y-2">
            {/* Business tabs + Period */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-white rounded-xl border border-[#e8e8e8] p-1 flex gap-1 overflow-x-auto flex-1 min-w-0">
                {businessUnits.map(b => (
                  <button
                    key={b}
                    onClick={() => { setBusiness(b); setProduct('todos') }}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
                    style={
                      business === b
                        ? { background: 'linear-gradient(90deg,#8B0A1E 0%,#CC092F 45%,#CC1060 100%)', color: 'white' }
                        : { color: '#666' }
                    }
                  >
                    {businessLabels[b]}
                  </button>
                ))}
              </div>
              <div className="flex gap-0.5 bg-white rounded-lg border border-[#e8e8e8] p-1 flex-shrink-0">
                {periods.map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                      period === p ? 'bg-[#f5f5f5] text-[#1a1a2e]' : 'text-[#999] hover:text-[#666]'
                    }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>
            </div>
            {/* Product chips */}
            {products.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProduct(p.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      product === p.id
                        ? 'border-[#CC092F] text-[#CC092F] bg-[#fff0f2]'
                        : 'border-[#e8e8e8] text-[#666] hover:border-[#CC092F]/40 hover:text-[#CC092F]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── ZONE 1: KPI CARDS ────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              label="NPS Geral"
              value={String(data.kpi.nps)}
              delta={data.kpi.npsDelta}
              deltaLabel=" pp"
              progress={data.kpi.nps}
              progressMeta={data.kpi.npsMeta}
            />
            <KPICard
              label="Clientes PJ Ativos"
              value={fmtN(data.kpi.clientsActive)}
              delta={data.kpi.clientsDelta}
              deltaLabel="%"
            />
            <KPICard
              label="Churn Mensal"
              value={`${data.kpi.churnPct}%`}
              delta={data.kpi.churnDelta}
              deltaLabel=" pp"
              sub={`${fmtR(data.kpi.churnRevRisk)} em risco`}
              invertDelta
            />
            <KPICard
              label="Receita Total"
              value={fmtR(data.kpi.revenue)}
              delta={data.kpi.revenueDelta}
              deltaLabel="%"
              progress={data.kpi.revenue}
              progressMeta={data.kpi.revenueMeta}
            />
            <KPICard
              label="Manifestações"
              value={fmtN(data.kpi.manifestacoes)}
              delta={data.kpi.manifestacoesDelta}
              deltaLabel="%"
              invertDelta
            />
            <KPICard
              label="Taxa de Renovação"
              value={`${data.kpi.renewalRate}%`}
              delta={data.kpi.renewalDelta}
              deltaLabel=" pp"
            />
          </div>

          {/* ── ARGUMENTO EXECUTIVO ───────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#e8e8e8] border-l-4 border-l-[#CC092F] px-5 py-4 flex gap-3 items-start">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: '#fff0f2' }}>
              <Lightbulb className="w-4 h-4 text-[#CC092F]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#CC092F] uppercase tracking-wider mb-1">Argumento Executivo</p>
              <p className="text-sm text-[#374151] leading-relaxed">{argumento}</p>
            </div>
          </div>

          {/* ── ZONE 2: FUNNEL ───────────────────────────────────────── */}
          <FunnelSection data={data} />

          {/* ── ZONE 3: CHARTS ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            <ChartCard
              title="LTV por Segmento PJ"
              subtitle="Atual vs Meta (R$ mil) · Cenário +5pp NPS com elasticidade 0,4%"
            >
              <LTVChart data={data.ltvSegmentos} />
            </ChartCard>

            <ChartCard
              title="NPS por Etapa da Jornada"
              subtitle="Saúde colorida · linha = meta"
            >
              <NPSJornadaChart data={data.npsJornada} />
            </ChartCard>

            <ChartCard
              title="SLA de Atendimento"
              subtitle="Tempo médio vs meta por etapa · verde = dentro / vermelho = acima"
            >
              <SLAChart data={data.sla} />
            </ChartCard>

            <ChartCard
              title="Churn por Tempo de Carteira"
              subtitle="% churn (vermelho) · R$ em risco (rosa) por faixa de maturidade"
            >
              <ChurnTenureChart data={data.churnByTenure} />
            </ChartCard>

            <ChartCard
              title="Composição da Receita"
              subtitle="Nova · Expandida · Recuperada — últimos 12 meses"
            >
              <StackedBarSVG data={data.monthlyRevenue} />
              <div className="flex gap-4">
                {[
                  { color: '#96001F', label: 'Nova' },
                  { color: '#CC092F', label: 'Expandida' },
                  { color: '#D12344', label: 'Recuperada' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
                    <span className="text-[10px] text-[#888]">{l.label}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              title="NPS × Renovação"
              subtitle="Correlação de tendência — últimos 12 meses"
            >
              <LineSVG
                series={[
                  { values: data.npsRenewal.map((d: NPSRenewal) => d.nps), color: '#CC092F' },
                  { values: data.npsRenewal.map((d: NPSRenewal) => d.renewal), color: '#374151', dashed: true },
                ]}
                labels={months}
              />
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-0.5 bg-[#CC092F]" />
                  <span className="text-[10px] text-[#888]">NPS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-0.5 bg-[#374151] border-dashed border-t-2 border-[#374151]" />
                  <span className="text-[10px] text-[#888]">Renovação %</span>
                </div>
              </div>
            </ChartCard>

          </div>
        </div>
      </main>
    </div>
  )
}
