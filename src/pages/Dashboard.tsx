import { useState, useMemo } from 'react'
import { ChevronLeft, BarChart2, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react'
import { BradescoLogo } from '../components/BradescoLogo'
import {
  businessUnits, businessLabels, periods, periodLabels, productsByBusiness,
  getDashboardData, getFilterLabel, computeRevPreserved,
  type BusinessUnit, type Period, type DashboardData,
  type FunnelStage, type LTVSegment, type NPSJornada,
  type SLAItem, type ChurnByTenure, type MonthlyRevenue, type NPSRenewal,
} from '../data/dashboardData'

interface Props { onBack: () => void }

// ── HELPERS ────────────────────────────────────────────────────────────────

const fmtR = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)}K`
  : `R$ ${v.toLocaleString('pt-BR')}`

const fmtN = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `${(v / 1_000).toFixed(1)}k`
  : String(v)

const npsColor = (n: number) => n >= 70 ? '#22c55e' : n >= 55 ? '#f59e0b' : '#ef4444'

// ── COMPACT KPI CARD ───────────────────────────────────────────────────────

function KPICard({ label, value, delta, deltaLabel, sub, invertDelta, accent }: {
  label: string; value: string; delta?: number; deltaLabel?: string
  sub?: string; invertDelta?: boolean; accent?: string
}) {
  const good = invertDelta ? (delta ?? 0) <= 0 : (delta ?? 0) >= 0
  return (
    <div className="bradesco-card px-3 pt-3 pb-2.5 flex flex-col gap-1 min-w-0">
      <p className="text-[9px] font-semibold text-[#999] uppercase tracking-wider truncate">{label}</p>
      <p className="text-xl font-bold text-[#1a1a2e] leading-none" style={accent ? { color: accent } : {}}>
        {value}
      </p>
      {sub && <p className="text-[9px] text-[#bbb] leading-none truncate">{sub}</p>}
      {delta !== undefined && (
        <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${good ? 'text-emerald-600' : 'text-red-500'}`}>
          {good ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          <span>{delta > 0 ? '+' : ''}{delta}{deltaLabel ?? ''}</span>
          <span className="text-[#ccc] font-normal ml-0.5">ant.</span>
        </div>
      )}
    </div>
  )
}

// ── CASCADE FUNNEL ─────────────────────────────────────────────────────────

const STAGE_BG = ['#8B0A1E', '#A8152E', '#CC092F', '#CC3060']

function CascadeFunnel({ stages }: { stages: FunnelStage[] }) {
  const firstVal = stages[0]?.value ?? 1

  return (
    <div className="flex flex-col w-full gap-0">
      {stages.map((stage, i) => {
        const isLast = i === stages.length - 1
        const ratio = isLast ? 1 : stage.value / firstVal
        const barPct = Math.max(ratio * 100, 26)
        const bgColor = STAGE_BG[Math.min(i, STAGE_BG.length - 1)]
        const dropPct = i > 0 && !isLast
          ? Math.round((1 - stage.value / stages[i - 1].value) * 100)
          : null

        return (
          <div key={i} className="w-full">

            {/* ── CONNECTOR ───────────────────────────────────────────── */}
            {i > 0 && (
              <div className="flex items-stretch h-7">
                {/* vertical line on the left */}
                <div className="flex flex-col items-center w-7 flex-shrink-0">
                  <div className="w-px flex-1 bg-[#e0e0e0]" />
                </div>
                {/* conv badge + drop */}
                <div className="flex items-center gap-2 flex-1 pl-1">
                  {stage.convRate !== undefined && (
                    <div className="flex items-center gap-1 bg-[#fff8f9] border border-[#ffd0d8] rounded-full px-2 py-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#CC092F]" />
                      <span className="text-[9px] font-bold text-[#CC092F]">{stage.convRate}%</span>
                      <span className="text-[9px] text-[#ccc]">conv.</span>
                    </div>
                  )}
                  {dropPct !== null && (
                    <span className="text-[9px] text-[#bbb] ml-auto pr-1">
                      −{dropPct}% drop
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── STAGE ───────────────────────────────────────────────── */}
            {isLast ? (
              /* Revenue — full-width gradient card */
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'linear-gradient(120deg,#8B0A1E 0%,#CC092F 55%,#CC1060 100%)' }}>
                <div className="px-3.5 py-2.5 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] text-white/60 font-medium uppercase tracking-wide mb-0.5">
                      {stage.label}
                    </p>
                    <p className="text-lg font-bold text-white leading-none">{fmtR(stage.value)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-white/50 mb-0.5">vs anterior</p>
                    <p className="text-sm font-bold text-white">
                      {stage.delta > 0 ? '+' : ''}{stage.delta}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Regular stage — shrinking bar */
              <div className="relative h-11 rounded-xl overflow-hidden bg-[#f5f5f5]">
                {/* Colored fill — shrinks with each stage */}
                <div
                  className="absolute inset-y-0 left-0 rounded-xl"
                  style={{ width: `${barPct}%`, backgroundColor: bgColor }}
                />
                {/* Text layer — always full width, always readable */}
                <div className="absolute inset-0 flex items-center px-3 gap-2">
                  {/* Step number */}
                  <span className={`text-[9px] font-bold w-4 flex-shrink-0 ${barPct > 18 ? 'text-white/60' : 'text-[#ccc]'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {/* Label */}
                  <span className={`text-[10px] font-semibold flex-1 min-w-0 truncate ${barPct > 35 ? 'text-white' : 'text-[#555]'}`}>
                    {stage.label}
                  </span>
                  {/* Value + delta */}
                  <div className="flex-shrink-0 text-right flex items-baseline gap-1">
                    <span className={`text-sm font-bold ${barPct > 75 ? 'text-white' : 'text-[#1a1a2e]'}`}>
                      {fmtN(stage.value)}
                    </span>
                    <span className={`text-[9px] font-semibold ${
                      stage.delta >= 0
                        ? (barPct > 75 ? 'text-green-300' : 'text-emerald-500')
                        : 'text-red-400'
                    }`}>
                      {stage.delta > 0 ? '+' : ''}{stage.delta}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── LINE SVG ───────────────────────────────────────────────────────────────

function LineSVG({ series, labels }: {
  series: { values: number[]; color: string; dashed?: boolean }[]
  labels: string[]
}) {
  const W = 300, H = 80, PL = 24, PR = 6, PT = 4, PB = 16
  const chartW = W - PL - PR
  const chartH = H - PT - PB
  const allVals = series.flatMap(s => s.values)
  const minV = Math.min(...allVals) - 1
  const maxV = Math.max(...allVals) + 1
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
        <path key={si} d={pathOf(s.values)} fill="none" stroke={s.color}
          strokeWidth="1.8" strokeDasharray={s.dashed ? '4 3' : undefined}
          strokeLinejoin="round" />
      ))}
      {labels.map((l, i) => i % 3 === 0 && (
        <text key={i} x={xOf(i)} y={H - 3} fontSize="7" fill="#bbb" textAnchor="middle">{l}</text>
      ))}
      {[0, 1].map(t => (
        <text key={t} x={PL - 2} y={PT + chartH * (1 - t) + 3} fontSize="6.5" fill="#bbb" textAnchor="end">
          {Math.round(minV + range * t)}
        </text>
      ))}
    </svg>
  )
}

// ── STACKED BAR SVG ────────────────────────────────────────────────────────

function StackedBarSVG({ data }: { data: MonthlyRevenue[] }) {
  const W = 300, H = 80, PL = 4, PR = 4, PT = 4, PB = 16
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
        return (
          <g key={i}>
            <rect x={xOf(i)} y={y0} width={barW} height={h0} fill="#96001F" rx="1" />
            <rect x={xOf(i)} y={y0 + h0} width={barW} height={h1} fill="#CC092F" />
            <rect x={xOf(i)} y={y0 + h0 + h1} width={barW} height={h2} fill="#D12344" />
          </g>
        )
      })}
      {data.map((d, i) => i % 3 === 0 && (
        <text key={i} x={xOf(i) + barW / 2} y={H - 3} fontSize="7" fill="#bbb" textAnchor="middle">
          {d.month}
        </text>
      ))}
    </svg>
  )
}

// ── HORIZONTAL BAR ─────────────────────────────────────────────────────────

function HBar({ items, colorFn, metaKey }: {
  items: { label: string; value: number; meta?: number; sub?: string }[]
  colorFn: (v: number, meta?: number) => string
  metaKey?: string
}) {
  const max = Math.max(...items.map(d => Math.max(d.value, d.meta ?? 0))) * 1.1
  return (
    <div className="flex flex-col gap-1.5 justify-between h-full">
      {items.map(item => (
        <div key={item.label} className="space-y-0.5">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-medium text-[#555] truncate max-w-[55%]">{item.label}</span>
            <span className="text-[10px] font-semibold" style={{ color: colorFn(item.value, item.meta) }}>
              {item.value}{item.sub ?? ''}
              {item.meta !== undefined && (
                <span className="text-[#ccc] font-normal ml-1">/ {item.meta}{metaKey ?? ''}</span>
              )}
            </span>
          </div>
          <div className="relative h-2.5 bg-[#f5f5f5] rounded-full overflow-visible">
            {item.meta !== undefined && (
              <div className="absolute top-0 bottom-0 w-px bg-[#bbb] z-10"
                style={{ left: `${Math.min((item.meta / max) * 100, 100)}%` }} />
            )}
            <div className="h-full rounded-full"
              style={{
                width: `${Math.min((item.value / max) * 100, 100)}%`,
                backgroundColor: colorFn(item.value, item.meta),
                opacity: 0.85,
              }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── CHART CARD ─────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, legend, children }: {
  title: string; subtitle: string; legend?: { color: string; label: string }[]; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e8e8e8] p-3 flex flex-col gap-2 overflow-hidden min-h-0">
      <div className="flex-shrink-0">
        <p className="text-[11px] font-semibold text-[#1a1a2e] leading-none">{title}</p>
        <p className="text-[9px] text-[#bbb] mt-0.5 leading-none">{subtitle}</p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      {legend && (
        <div className="flex gap-3 flex-wrap flex-shrink-0">
          {legend.map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-2.5 h-1.5 rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="text-[9px] text-[#999]">{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MAIN DASHBOARD ─────────────────────────────────────────────────────────

export function Dashboard({ onBack }: Props) {
  const [business, setBusiness] = useState<BusinessUnit>('todos')
  const [product, setProduct] = useState<string>('todos')
  const [period, setPeriod] = useState<Period>('month')

  const data = useMemo<DashboardData>(
    () => getDashboardData(business, product, period),
    [business, product, period],
  )

  const filterLabel = getFilterLabel(business, product)
  const revPreserved = computeRevPreserved(data.kpi, period)
  const argumento =
    `${filterLabel} — NPS ${data.kpi.nps}, churn ${data.kpi.churnPct}%. ` +
    `+5pp NPS preserva ${fmtR(revPreserved)}/ano (0,4% churn/pp).`

  const products = business !== 'todos' ? productsByBusiness[business] : []
  const months = data.npsRenewal.map((d: NPSRenewal) => d.month)

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#f0f0f0]">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bradesco-header flex-shrink-0 px-4 md:px-6">
        <div className="max-w-[1600px] mx-auto flex items-center h-12 gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1 text-white/80 hover:text-white text-xs font-medium transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Início</span>
          </button>
          <div className="h-4 w-px bg-white/30" />
          <BradescoLogo height={12} color="white" />
          <div className="h-4 w-px bg-white/30" />
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-white" />
            <span className="text-white font-bold text-xs">Dashboard CX</span>
            <span className="text-white/50 text-[10px] hidden sm:block">· Produtos PJ</span>
          </div>
        </div>
      </header>

      {/* ── MAIN AREA ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden px-3 md:px-4 pt-3 pb-3 gap-2.5 max-w-[1600px] mx-auto w-full">

        {/* FILTERS */}
        <div className="flex-shrink-0 flex items-center gap-2 flex-wrap">
          {/* Business tabs */}
          <div className="bg-white rounded-lg border border-[#e8e8e8] p-0.5 flex gap-0.5 overflow-x-auto">
            {businessUnits.map(b => (
              <button key={b}
                onClick={() => { setBusiness(b); setProduct('todos') }}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors"
                style={business === b
                  ? { background: 'linear-gradient(90deg,#8B0A1E 0%,#CC092F 45%,#CC1060 100%)', color: 'white' }
                  : { color: '#777' }}>
                {businessLabels[b]}
              </button>
            ))}
          </div>

          {/* Product chips */}
          {products.map(p => (
            <button key={p.id}
              onClick={() => setProduct(p.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
                product === p.id
                  ? 'border-[#CC092F] text-[#CC092F] bg-[#fff0f2]'
                  : 'border-[#e0e0e0] text-[#777] bg-white hover:border-[#CC092F]/40 hover:text-[#CC092F]'
              }`}>
              {p.label}
            </button>
          ))}

          {/* Period */}
          <div className="flex gap-0.5 bg-white rounded-lg border border-[#e8e8e8] p-0.5 ml-auto">
            {periods.map(p => (
              <button key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  period === p ? 'bg-[#f5f5f5] text-[#1a1a2e]' : 'text-[#aaa] hover:text-[#666]'
                }`}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {/* KPI ROW */}
        <div className="flex-shrink-0 grid grid-cols-6 gap-2">
          <KPICard label="NPS Geral" value={String(data.kpi.nps)}
            delta={data.kpi.npsDelta} deltaLabel=" pp"
            sub={`meta ${data.kpi.npsMeta}`} />
          <KPICard label="Clientes PJ" value={fmtN(data.kpi.clientsActive)}
            delta={data.kpi.clientsDelta} deltaLabel="%" />
          <KPICard label="Churn Mensal" value={`${data.kpi.churnPct}%`}
            delta={data.kpi.churnDelta} deltaLabel=" pp"
            sub={`${fmtR(data.kpi.churnRevRisk)} em risco`} invertDelta />
          <KPICard label="Receita" value={fmtR(data.kpi.revenue)}
            delta={data.kpi.revenueDelta} deltaLabel="%"
            sub={`meta ${fmtR(data.kpi.revenueMeta)}`} />
          <KPICard label="Manifestações" value={fmtN(data.kpi.manifestacoes)}
            delta={data.kpi.manifestacoesDelta} deltaLabel="%" invertDelta />
          <KPICard label="Renovação" value={`${data.kpi.renewalRate}%`}
            delta={data.kpi.renewalDelta} deltaLabel=" pp" />
        </div>

        {/* BOTTOM AREA: Funnel + Charts */}
        <div className="flex-1 grid gap-2.5 overflow-hidden min-h-0"
          style={{ gridTemplateColumns: '240px 1fr' }}>

          {/* LEFT: Funil */}
          <div className="bg-white rounded-xl border border-[#e8e8e8] p-3 flex flex-col overflow-hidden min-h-0">
            <div className="flex-shrink-0 mb-2">
              <p className="text-[11px] font-semibold text-[#1a1a2e]">Funil de Resultados</p>
              <p className="text-[9px] text-[#bbb] mt-0.5">Ciclo de vida do cliente PJ</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <CascadeFunnel stages={data.funnelStages} />
            </div>
            {/* Argumento inline */}
            <div className="flex-shrink-0 mt-2 border-t border-[#f0f0f0] pt-2 flex gap-2 items-start">
              <Lightbulb className="w-3 h-3 text-[#CC092F] flex-shrink-0 mt-0.5" />
              <p className="text-[9px] text-[#666] leading-relaxed">{argumento}</p>
            </div>
          </div>

          {/* RIGHT: Charts 3×2 */}
          <div className="grid grid-cols-3 grid-rows-2 gap-2.5 overflow-hidden min-h-0">

            {/* 1. LTV por segmento */}
            <ChartCard title="LTV por Segmento PJ" subtitle="Atual vs Meta (R$k) · +5pp NPS">
              <div className="flex flex-col gap-2 justify-between h-full">
                {data.ltvSegmentos.map((seg: LTVSegment) => {
                  const improved = Math.round(seg.atual * 1.08)
                  const max = Math.max(...data.ltvSegmentos.map((s: LTVSegment) => s.meta)) * 1.1
                  return (
                    <div key={seg.label} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] font-semibold text-[#374151]">{seg.label}</span>
                        <span className="text-[9px] text-[#bbb]">R${seg.atual}k / meta R${seg.meta}k</span>
                      </div>
                      <div className="relative h-3 bg-[#f5f5f5] rounded-full">
                        <div className="absolute top-0 bottom-0 w-px bg-[#ccc] z-10"
                          style={{ left: `${Math.min((seg.meta / max) * 100, 100)}%` }} />
                        <div className="absolute top-0.5 bottom-0.5 rounded-full bg-[#CC092F]"
                          style={{ width: `${(seg.atual / max) * 100}%` }} />
                        <div className="absolute top-0 bottom-0 rounded-full border border-dashed border-[#CC092F]/50 bg-[#CC092F]/10"
                          style={{ width: `${(improved / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div className="flex gap-3 mt-auto pt-1">
                  {[
                    { color: '#CC092F', label: 'Atual' },
                    { color: '#CC092F', label: '+5pp NPS', dashed: true },
                    { color: '#ccc', label: 'Meta' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className={`w-2.5 h-1.5 rounded-sm ${l.dashed ? 'border border-dashed border-[#CC092F]/50 bg-[#CC092F]/10' : ''}`}
                        style={!l.dashed ? { backgroundColor: l.color } : {}} />
                      <span className="text-[9px] text-[#999]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            {/* 2. NPS por etapa */}
            <ChartCard title="NPS por Etapa da Jornada" subtitle="Saúde colorida · linha = meta">
              <div className="flex flex-col gap-1.5 justify-between h-full">
                {data.npsJornada.map((item: NPSJornada) => (
                  <div key={item.label} className="space-y-0.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-medium text-[#555] truncate max-w-[55%]">{item.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold" style={{ color: npsColor(item.nps) }}>{item.nps}</span>
                        <span className="text-[8px] px-1 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: npsColor(item.nps) }}>
                          {item.nps >= 70 ? '✓' : item.nps >= 55 ? '~' : '!'}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2.5 bg-[#f5f5f5] rounded-full">
                      <div className="absolute top-0 bottom-0 w-px bg-[#ccc] z-10"
                        style={{ left: `${item.meta}%` }} />
                      <div className="h-full rounded-full"
                        style={{ width: `${item.nps}%`, backgroundColor: npsColor(item.nps), opacity: 0.85 }} />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* 3. SLA */}
            <ChartCard title="SLA de Atendimento" subtitle="Médio vs meta · verde = OK · vermelho = acima">
              <HBar
                items={data.sla.map((s: SLAItem) => ({
                  label: s.label, value: s.avg, meta: s.meta, sub: s.unit,
                }))}
                colorFn={(v, meta) => meta !== undefined && v <= meta ? '#22c55e' : '#ef4444'}
              />
            </ChartCard>

            {/* 4. Churn por tenure */}
            <ChartCard title="Churn por Tempo de Carteira" subtitle="% churn (vermelho) · R$ em risco (rosa)"
              legend={[{ color: '#CC092F', label: '% Churn' }, { color: '#fecaca', label: 'R$ em risco' }]}>
              <div className="flex flex-col gap-1.5 justify-between h-full">
                {data.churnByTenure.map((item: ChurnByTenure) => {
                  const maxPct = Math.max(...data.churnByTenure.map((d: ChurnByTenure) => d.churnPct))
                  const maxR = Math.max(...data.churnByTenure.map((d: ChurnByTenure) => d.churnR))
                  return (
                    <div key={item.label} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] font-medium text-[#555]">{item.label}</span>
                        <span className="text-[9px]">
                          <span className="font-bold text-[#CC092F]">{item.churnPct}%</span>
                          <span className="text-[#bbb] mx-1">·</span>
                          <span className="text-[#ef4444]">{fmtR(item.churnR)}</span>
                        </span>
                      </div>
                      <div className="relative h-2.5 bg-[#f5f5f5] rounded-full overflow-hidden">
                        <div className="absolute inset-0 rounded-full bg-[#fecaca]"
                          style={{ width: `${(item.churnR / maxR) * 100}%` }} />
                        <div className="absolute top-0.5 bottom-0.5 rounded-full bg-[#CC092F]"
                          style={{ width: `${(item.churnPct / maxPct) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </ChartCard>

            {/* 5. Receita empilhada */}
            <ChartCard title="Composição da Receita" subtitle="Nova · Expandida · Recuperada — 12 meses"
              legend={[{ color: '#96001F', label: 'Nova' }, { color: '#CC092F', label: 'Expandida' }, { color: '#D12344', label: 'Recuperada' }]}>
              <StackedBarSVG data={data.monthlyRevenue} />
            </ChartCard>

            {/* 6. NPS × Renovação */}
            <ChartCard title="NPS × Renovação" subtitle="Correlação — 12 meses"
              legend={[{ color: '#CC092F', label: 'NPS' }, { color: '#374151', label: 'Renovação %' }]}>
              <LineSVG
                series={[
                  { values: data.npsRenewal.map((d: NPSRenewal) => d.nps), color: '#CC092F' },
                  { values: data.npsRenewal.map((d: NPSRenewal) => d.renewal), color: '#374151', dashed: true },
                ]}
                labels={months}
              />
            </ChartCard>

          </div>
        </div>
      </div>
    </div>
  )
}
