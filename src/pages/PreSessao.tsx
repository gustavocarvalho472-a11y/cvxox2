import { useState } from 'react'
import { CalendarDays, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AppState } from '../hooks/useAppState'
import { MACRO_DRIVERS, STRUCTURAL_DRIVERS, biasLabel } from '../data/macroDrivers'
import { EconomicCalendar, MiniChart } from '../components/tradingview/widgets'
import { todayStr } from '../lib/ftmo'
import { fmtBrt } from '../lib/calendar'
import { fetchDailyCloses, fetchEurDailyFree, fetchGoldDailyFree } from '../lib/marketData'
import { computeAutoBias } from '../lib/autoBias'
import type { AutoBiasResult } from '../lib/autoBias'

interface Props {
  app: AppState
  agentReady: boolean
  onSendAgent: (prompt: string) => void
}

function briefingPrompt(result: AutoBiasResult): string {
  return `Acabei de atualizar o viés automático: ${biasLabel(result.bias)} (score ${result.score > 0 ? '+' : ''}${result.score}/${result.maxScore}). Com base no breakdown do viés, nos eventos do calendário e nos meus níveis (tudo no seu contexto), e buscando as notícias de AGORA na web, escreva o briefing da sessão: 1) valide ou conteste o viés com o macro atual; 2) eventos das próximas 24h (horário BRT) e como operar em volta deles; 3) plano objetivo para a sessão de hoje; 4) os 2-3 riscos que invalidam essa leitura. Seja direto.`
}

const detailsCls = 'rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-100'
const summaryCls =
  'cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-300 transition hover:text-zinc-100'

export function PreSessao({ app, agentReady, onSendAgent }: Props) {
  const {
    checklist,
    setChecklist,
    biasInfo,
    calendar,
    tdKey,
    setCorrelation,
    autoBias,
    setAutoBias,
    autoBiasFresh,
    gold,
  } = app
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [briefingSent, setBriefingSent] = useState(false)

  const setReading = (driverId: string, optionId: string) => {
    const base = checklist ?? { date: todayStr(), readings: {}, note: '' }
    const current = base.readings[driverId]
    setChecklist({
      ...base,
      date: todayStr(),
      readings: { ...base.readings, [driverId]: current === optionId ? null : optionId },
    })
  }

  // Um clique: candles → viés + correlação; com chave Anthropic, o agente já escreve o briefing
  const refreshAutoBias = async () => {
    setBusy(true)
    setError(null)
    setBriefingSent(false)
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
      if (agentReady) {
        onSendAgent(briefingPrompt(result))
        setBriefingSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao calcular o viés.')
    } finally {
      setBusy(false)
    }
  }

  const biasTone =
    autoBias?.bias === 'bullish'
      ? { text: 'text-emerald-400', border: 'border-emerald-500/60' }
      : autoBias?.bias === 'bearish'
        ? { text: 'text-red-400', border: 'border-red-500/60' }
        : { text: 'text-zinc-200', border: 'border-zinc-600' }

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
                  Aperte o botão: o app lê tendência, momentum, dólar, regime de correlação e o
                  calendário{agentReady ? ' — e o agente já escreve o briefing do dia' : ''}.
                </p>
              )}
              {autoBias && (
                <p className="mt-1 text-[11px] text-zinc-500">
                  calculado {new Date(autoBias.computedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {gold ? ` · spot $${gold.price.toFixed(2)}` : ''}
                  {autoBias.source ? ` · fonte: ${autoBias.source}` : ''}
                  {briefingSent ? ' · briefing enviado ao agente →' : ''}
                </p>
              )}
            </div>

            <Button
              onClick={refreshAutoBias}
              disabled={busy}
              size="lg"
              className="gap-2 bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              {agentReady ? 'Viés + briefing do dia' : autoBias ? 'Atualizar agora' : 'Calcular viés agora'}
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
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-200">
              <CalendarDays className="h-4 w-4 text-amber-400" /> Calendário econômico (alto/médio
              impacto)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <EconomicCalendar height={430} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-200">DXY — Dólar</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <MiniChart symbol="TVC:DXY" height={160} />
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-200">US10Y — Juros</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <MiniChart symbol="TVC:US10Y" height={160} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Nota do dia — o agente lê */}
      <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100">
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Leitura manual — opcional, recolhida */}
      <details className={detailsCls}>
        <summary className={summaryCls}>
          Sua leitura manual (opcional) — checklist dos 5 drivers
          {biasInfo.filled > 0 && (
            <span className="ml-2 text-xs text-zinc-500">
              Viés: {biasLabel(biasInfo.bias)} ({biasInfo.score > 0 ? '+' : ''}
              {biasInfo.score})
            </span>
          )}
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <p className="text-xs text-zinc-500">
            O viés automático já cobre os indicadores — use este checklist quando quiser registrar
            a SUA leitura (geopolítica e Fed o indicador não captura). O agente compara as duas.
          </p>
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
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-zinc-600 hover:text-zinc-400">
                    por quê importa?
                  </summary>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{driver.why}</p>
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
                </details>
              </div>
            )
          })}
        </div>
      </details>

      {/* Educacional — recolhido */}
      <details className={detailsCls}>
        <summary className={summaryCls}>Pano de fundo estrutural do ouro (leitura)</summary>
        <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
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
        </div>
      </details>
    </div>
  )
}
