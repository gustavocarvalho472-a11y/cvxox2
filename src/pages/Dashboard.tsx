import { useState, useMemo } from 'react'
import { ChevronLeft, BarChart2, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react'
import { BradescoLogo } from '../components/BradescoLogo'
import {
  businessUnits, businessLabels, periods, periodLabels, productsByBusiness,
  getDashboardData, getFilterLabel, computeRevPreserved,
  type BusinessUnit, type Period, type DashboardData,
  type FunnelStage, type LTVSegment, type NPSJornada,
  type SLAItem, type NPSRenewal,
  type SegmentRevenue, type ChannelPenetration,
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

// ── SIMPLE FUNNEL ──────────────────────────────────────────────────────────

function CascadeFunnel({ stages }: { stages: FunnelStage[] }) {
  // Only first 3 stages
  const s = stages.slice(0, 3)
  const top = s[0]?.value ?? 1
  const conv12 = s[1]?.convRate ?? Math.round((s[1]?.value / top) * 100)
  const conv23 = s[2]?.convRate ?? Math.round((s[2]?.value / (s[1]?.value ?? 1)) * 100)
  const totalConv = Math.round((s[2]?.value / top) * 100)

  const COLORS = ['#8B0A1E', '#CC092F', '#CC3060']

  return (
    <div className="flex gap-3 h-full min-h-0">

      {/* ── BARS ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center gap-3 min-w-0">
        {s.map((stage, i) => {
          const pct = Math.max((stage.value / top) * 100, 12)
          return (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between items-baseline gap-1">
                <span className="text-[10px] font-semibold text-[#555] truncate">{stage.label}</span>
                <div className="flex items-baseline gap-1 flex-shrink-0">
                  <span className="text-sm font-bold text-[#1a1a2e]">{fmtN(stage.value)}</span>
                  <span className={`text-[9px] font-semibold ${stage.delta >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {stage.delta > 0 ? '+' : ''}{stage.delta}%
                  </span>
                </div>
              </div>
              <div className="h-7 bg-[#f5f5f5] rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: COLORS[i] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── RATES ─────────────────────────────────────────────────────── */}
      <div className="w-[72px] flex flex-col justify-center gap-2 flex-shrink-0">
        <div className="rounded-xl border border-[#ffd0d8] bg-[#fff8f9] p-2.5 text-center">
          <p className="text-[8px] text-[#ccc] font-medium leading-none mb-1">Sim → Prop</p>
          <p className="text-lg font-bold text-[#CC092F] leading-none">{conv12}%</p>
        </div>
        <div className="rounded-xl border border-[#ffd0d8] bg-[#fff8f9] p-2.5 text-center">
          <p className="text-[8px] text-[#ccc] font-medium leading-none mb-1">Prop → Cont</p>
          <p className="text-lg font-bold text-[#CC092F] leading-none">{conv23}%</p>
        </div>
        <div className="rounded-xl p-2.5 text-center"
          style={{ background: 'linear-gradient(135deg,#8B0A1E 0%,#CC092F 100%)' }}>
          <p className="text-[8px] text-white/60 font-medium leading-none mb-1">Conv. Total</p>
          <p className="text-lg font-bold text-white leading-none">{totalConv}%</p>
        </div>
      </div>

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

            {/* 4. Penetração por canal */}
            <ChartCard title="Penetração por Canal" subtitle="% da base PJ ativa por canal de relacionamento">
              <div className="flex flex-col gap-2 justify-between h-full">
                {data.channelPenetration.map((item: ChannelPenetration) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-semibold text-[#374151]">{item.label}</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-[#CC092F]">{item.pct}%</span>
                        <span className="text-[9px] text-[#bbb]">{fmtN(item.clients)} clientes</span>
                        <span className={`text-[9px] font-semibold ${item.delta >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                          {item.delta > 0 ? '+' : ''}{item.delta}%
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-[#f5f5f5] rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${item.pct}%`, backgroundColor: '#CC092F', opacity: 0.85 }} />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* 5. Receita por segmento */}
            <ChartCard title="Composição da Receita" subtitle="Por segmento PJ — MEI · Negócios · Empresas">
              <div className="flex flex-col gap-2 justify-between h-full">
                {data.segmentRevenue.map((seg: SegmentRevenue, i: number) => {
                  const COLORS = ['#8B0A1E', '#CC092F', '#D12344']
                  const maxPct = 100
                  return (
                    <div key={seg.label} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-[10px] font-semibold text-[#374151]">{seg.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-[#1a1a2e]">{fmtR(seg.value)}</span>
                          <span className="text-[9px] font-semibold text-[#CC092F]">{seg.pct}%</span>
                          <span className={`text-[9px] font-semibold ${seg.delta >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {seg.delta > 0 ? '+' : ''}{seg.delta}%
                          </span>
                        </div>
                      </div>
                      <div className="h-3 bg-[#f5f5f5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${(seg.pct / maxPct) * 100}%`, backgroundColor: COLORS[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
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
