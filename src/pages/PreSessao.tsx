import { useState } from 'react'
import { CalendarDays, ExternalLink, Loader2, Newspaper, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AppState } from '../hooks/useAppState'
import { MACRO_DRIVERS, STRUCTURAL_DRIVERS, biasLabel } from '../data/macroDrivers'
import { EconomicCalendar, MiniChart, NewsTimeline } from '../components/tradingview/widgets'
import { todayStr } from '../lib/ftmo'
import { QUICK_PROMPTS } from '../lib/agentPrompt'
import { fmtBrt } from '../lib/calendar'
import {
  correlationRegime,
  fetchDailyCloses,
  fetchEurDailyFree,
  fetchGoldDailyFree,
} from '../lib/marketData'
import { computeAutoBias } from '../lib/autoBias'

interface Props {
  app: AppState
  onAskAgent: (prompt: string) => void
}

const CORR_TTL_MS = 12 * 60 * 60 * 1000

export function PreSessao({ app, onAskAgent }: Props) {
  const {
    checklist,
    setChecklist,
    biasInfo,
    checklistDone,
    calendar,
    tdKey,
    correlation,
    setCorrelation,
    autoBias,
    setAutoBias,
    autoBiasFresh,
    gold,
  } = app
  const [corrBusy, setCorrBusy] = useState(false)
  const [corrError, setCorrError] = useState<string | null>(null)

  const corrStale =
    !correlation || Date.now() - new Date(correlation.computedAt).getTime() > CORR_TTL_MS

  // Um clique: baixa candles XAU + EUR e calcula viés + correlação juntos.
  // Com chave Twelve Data usa XAU spot real; sem chave, cai nas fontes gratuitas
  // (Coinbase PAXG ≈ ouro tokenizado + EUR/USD do BCE) — zero cadastro.
  const refreshAutoBias = async () => {
    setCorrBusy(true)
    setCorrError(null)
    try {
      const useTd = tdKey.trim().length > 0
      const [xau, eur] = useTd
        ? await Promise.all([
            fetchDailyCloses('XAU/USD', tdKey.trim()),
            fetchDailyCloses('EUR/USD', tdKey.trim()),
          ])
        : await Promise.all([fetchGoldDailyFree(), fetchEurDailyFree()])
      const result = computeAutoBias(
        xau,
        eur,
        useTd ? (gold?.price ?? null) : null,
        calendar.todayHigh,
      )
      result.source = useTd ? 'Twelve Data (XAU spot)' : 'Coinbase PAXG + BCE (sem chave)'
      setAutoBias(result)
      setCorrelation(result.correlation)
    } catch (err) {
      setCorrError(err instanceof Error ? err.message : 'Erro ao calcular o viés.')
    } finally {
      setCorrBusy(false)
    }
  }

  const setReading = (driverId: string, optionId: string) => {
    const base = checklist ?? { date: todayStr(), readings: {}, note: '' }
    const current = base.readings[driverId]
    setChecklist({
      ...base,
      date: todayStr(),
      readings: { ...base.readings, [driverId]: current === optionId ? null : optionId },
    })
  }

  const biasColor =
    biasInfo.bias === 'bullish'
      ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10'
      : biasInfo.bias === 'bearish'
        ? 'text-red-400 border-red-500/50 bg-red-500/10'
        : 'text-zinc-300 border-zinc-600 bg-zinc-800/60'

  const biasTone =
    autoBias?.bias === 'bullish'
      ? { text: 'text-emerald-400', border: 'border-emerald-500/60', bg: 'bg-emerald-500/10' }
      : autoBias?.bias === 'bearish'
        ? { text: 'text-red-400', border: 'border-red-500/60', bg: 'bg-red-500/10' }
        : { text: 'text-zinc-200', border: 'border-zinc-600', bg: 'bg-zinc-800/40' }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      {/* CARD PRINCIPAL — viés automático do XAU */}
      <Card className={cn('border-2 bg-zinc-900/80 text-zinc-100', biasTone.border)}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[220px] flex-1">
              <div className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Viés automático do XAU — indicadores + notícias
              </div>
              {autoBias ? (
                <div className="mt-1 flex items-baseline gap-3">
                  <span className={cn('text-3xl font-black tracking-tight', biasTone.text)}>
                    {biasLabel(autoBias.bias)}
                  </span>
                  <span className="text-sm text-zinc-400 tabular-nums">
                    score {autoBias.score > 0 ? '+' : ''}
                    {autoBias.score}/{autoBias.maxScore}
                  </span>
                  {!autoBiasFresh && (
                    <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-300">
                      desatualizado — atualize
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-zinc-400">
                  Aperte <strong>Atualizar</strong>: o app baixa os candles, lê tendência,
                  momentum, dólar, regime de correlação e o calendário — e te dá o viés do
                  momento em segundos.
                </p>
              )}
              {autoBias && (
                <p className="mt-1 text-[11px] text-zinc-500">
                  calculado {new Date(autoBias.computedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {gold ? ` · spot $${gold.price.toFixed(2)}` : ''}
                  {autoBias.source ? ` · fonte: ${autoBias.source}` : ''}
                </p>
              )}
            </div>

            <Button
              onClick={refreshAutoBias}
              disabled={corrBusy}
              size="lg"
              className="gap-2 bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400"
            >
              {corrBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              {autoBias ? 'Atualizar agora' : 'Calcular viés agora'}
            </Button>
          </div>

          {autoBias && (
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {autoBias.components.map(c => (
                <div
                  key={c.id}
                  className="flex items-start gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs"
                >
                  <span
                    className={cn(
                      'font-bold',
                      c.signal === 'bullish' && 'text-emerald-400',
                      c.signal === 'bearish' && 'text-red-400',
                      c.signal === 'neutral' && 'text-zinc-500',
                    )}
                  >
                    {c.signal === 'bullish' ? '↑' : c.signal === 'bearish' ? '↓' : '→'}
                  </span>
                  <span>
                    <span className="text-zinc-300">{c.label}:</span>{' '}
                    <span className="text-zinc-500">{c.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {autoBias?.caution && (
            <p className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200">
              ⚠️ {autoBias.caution}
            </p>
          )}
          {corrError && <p className="mt-2 text-xs text-red-400">{corrError}</p>}
        </CardContent>
      </Card>

      {calendar.todayHigh.length > 0 && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <strong>🔴 Hoje é dia de evento de alto impacto (USD):</strong>{' '}
          {calendar.todayHigh
            .map(e => `${e.title} às ${fmtBrt(e.date)} BRT${e.forecast ? ` (prev. ${e.forecast})` : ''}`)
            .join(' · ')}
          {' — '}reduza o risco ou não opere a janela do evento. O validador vai bloquear
          entradas nos 30 min antes de cada um.
        </div>
      )}

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
        <strong>Ritual pré-sessão:</strong> confira o calendário do dia, leia os 5 drivers e
        registre seu viés antes de abrir o gráfico. Em dia de NFP, CPI ou FOMC, o ouro anda $30–60
        em minutos — reduza o risco ou não opere o horário do evento.
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Checklist macro */}
        <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Checklist macro do dia (sua leitura)</CardTitle>
            <Badge variant="outline" className={cn('text-xs font-bold', biasColor)}>
              Viés: {biasLabel(biasInfo.bias)} ({biasInfo.score > 0 ? '+' : ''}
              {biasInfo.score})
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {!checklistDone && (
              <p className="text-xs text-zinc-500">
                Preencha pelo menos 3 leituras — sem viés definido, o validador de trade vai te
                avisar que você está operando sem plano.
              </p>
            )}
            {MACRO_DRIVERS.map(driver => {
              const selected = checklist?.readings[driver.id] ?? null
              return (
                <div key={driver.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-200">{driver.name}</span>
                    <span className="text-xs text-zinc-500">{driver.question}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {driver.options.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setReading(driver.id, opt.id)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs transition',
                          selected === opt.id
                            ? opt.goldImpact === 'bullish'
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                              : opt.goldImpact === 'bearish'
                                ? 'border-red-500 bg-red-500/15 text-red-300'
                                : 'border-zinc-500 bg-zinc-700/50 text-zinc-200'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-500',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{driver.why}</p>
                  {driver.links && (
                    <div className="mt-1 flex flex-wrap gap-3">
                      {driver.links.map(l => (
                        <a
                          key={l.url}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                        >
                          {l.label} <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <div>
              <label className="mb-1 block text-[11px] uppercase text-zinc-500">
                Nota do dia (opcional — o agente lê isso)
              </label>
              <textarea
                rows={2}
                value={checklist?.note ?? ''}
                onChange={e =>
                  setChecklist({
                    date: todayStr(),
                    readings: checklist?.readings ?? {},
                    note: e.target.value,
                  })
                }
                placeholder="Ex.: esperando CPI às 09h30 BRT; só opero depois do dado…"
                className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
              />
            </div>
            <Button
              variant="outline"
              className="w-full border-sky-500/50 text-sky-300 hover:bg-sky-500/10"
              onClick={() => onAskAgent(QUICK_PROMPTS[0].prompt)}
            >
              <Newspaper className="mr-2 h-4 w-4" /> Pedir resumo macro do dia ao agente
            </Button>
          </CardContent>
        </Card>

        {/* Mini charts dos drivers */}
        <div className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm text-zinc-200">Correlação XAU × Dólar (20d)</CardTitle>
              <button
                onClick={refreshAutoBias}
                disabled={corrBusy}
                className="text-zinc-500 transition hover:text-amber-300"
                aria-label="Recalcular correlação"
                title="Recalcular (2 requisições Twelve Data)"
              >
                {corrBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            </CardHeader>
            <CardContent className="space-y-2">
              {correlation ? (
                (() => {
                  const regime = correlationRegime(correlation.corr)
                  return (
                    <>
                      <div className="flex items-baseline justify-between">
                        <span
                          className={cn(
                            'text-xl font-bold tabular-nums',
                            regime.tone === 'classic' && 'text-emerald-400',
                            regime.tone === 'weak' && 'text-zinc-300',
                            regime.tone === 'decoupled' && 'text-amber-400',
                          )}
                        >
                          {correlation.corr > 0 ? '+' : ''}
                          {correlation.corr.toFixed(2)}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            regime.tone === 'classic' && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
                            regime.tone === 'weak' && 'border-zinc-600 text-zinc-300',
                            regime.tone === 'decoupled' && 'border-amber-500/50 bg-amber-500/10 text-amber-300',
                          )}
                        >
                          {regime.label}
                        </Badge>
                      </div>
                      {/* régua -1 .. +1 */}
                      <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-emerald-500/60 via-zinc-600/60 to-amber-500/60">
                        <div
                          className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded bg-white shadow"
                          style={{ left: `${((correlation.corr + 1) / 2) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-600">
                        <span>-1 inversa</span>
                        <span>0</span>
                        <span>+1 junto</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-500">{regime.detail}</p>
                      <p className="text-[10px] text-zinc-600">
                        {correlation.days} dias · proxy EUR/USD invertido · calc.{' '}
                        {new Date(correlation.computedAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {corrStale && ' · desatualizada, recalcule ↻'}
                      </p>
                    </>
                  )
                })()
              ) : (
                <p className="text-xs text-zinc-500">
                  Clique em ↻ para calcular com dados reais (usa 2 requisições da sua chave Twelve
                  Data). Mostra se o dólar está mandando no ouro ou se o ouro desacoplou — cada
                  regime pede uma leitura diferente.
                </p>
              )}
              {corrError && <p className="text-[11px] text-red-400">{corrError}</p>}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-200">DXY — Dólar</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <MiniChart symbol="TVC:DXY" height={180} />
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-200">US10Y — Juros</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <MiniChart symbol="TVC:US10Y" height={180} />
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-200">WTI — Petróleo</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <MiniChart symbol="TVC:USOIL" height={180} />
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-200">VIX — Medo</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <MiniChart symbol="TVC:VIX" height={180} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-200">
              <CalendarDays className="h-4 w-4 text-amber-400" /> Calendário econômico (alto/médio
              impacto)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <EconomicCalendar height={420} />
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-200">
              <Newspaper className="h-4 w-4 text-amber-400" /> Notícias do mercado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <NewsTimeline height={420} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pano de fundo estrutural do ouro</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {STRUCTURAL_DRIVERS.map(d => (
            <div key={d.name} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="text-sm font-medium text-zinc-200">{d.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{d.detail}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {d.links.map(l => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                  >
                    {l.label} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
