import { CalendarDays, ExternalLink, Newspaper } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AppState } from '../hooks/useAppState'
import { MACRO_DRIVERS, STRUCTURAL_DRIVERS, biasLabel } from '../data/macroDrivers'
import { EconomicCalendar, MiniChart, NewsTimeline } from '../components/tradingview/widgets'
import { todayStr } from '../lib/ftmo'
import { QUICK_PROMPTS } from '../lib/agentPrompt'

interface Props {
  app: AppState
  onAskAgent: (prompt: string) => void
}

export function PreSessao({ app, onAskAgent }: Props) {
  const { checklist, setChecklist, biasInfo, checklistDone } = app

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

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
        <strong>Ritual pré-sessão:</strong> confira o calendário do dia, leia os 5 drivers e
        registre seu viés antes de abrir o gráfico. Em dia de NFP, CPI ou FOMC, o ouro anda $30–60
        em minutos — reduza o risco ou não opere o horário do evento.
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Checklist macro */}
        <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Checklist macro do dia</CardTitle>
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
