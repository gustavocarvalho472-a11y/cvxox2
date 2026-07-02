import { useMemo, useState } from 'react'
import { Bot, Download, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AppState } from '../hooks/useAppState'
import type { Trade, TradeDirection, TradeSession } from '../types/trading'
import { SETUP_TAGS } from '../types/trading'
import { fmtSignedUsd, fmtUsd, todayStr, tradePnl } from '../lib/ftmo'
import { SESSION_LABELS, currentSession } from '../data/sessions'
import { buildDayReviewPrompt } from '../lib/agentPrompt'

interface Props {
  app: AppState
  onAskAgent: (prompt: string) => void
}

const inputCls =
  'rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-500'

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface GroupStats {
  count: number
  wins: number
  sumR: number
}

function accumulate(map: Map<string, GroupStats>, key: string, t: Trade) {
  const g = map.get(key) ?? { count: 0, wins: 0, sumR: 0 }
  g.count++
  if (t.resultR > 0) g.wins++
  g.sumR += t.resultR
  map.set(key, g)
}

export function PosSessao({ app, onAskAgent }: Props) {
  const { account, trades, setTrades, state } = app
  const [direction, setDirection] = useState<TradeDirection>('long')
  const [session, setSession] = useState<TradeSession>(currentSession().id)
  const [setups, setSetups] = useState<string[]>([])
  const [riskUsd, setRiskUsd] = useState('')
  const [resultR, setResultR] = useState('')
  const [followedPlan, setFollowedPlan] = useState(true)
  const [notes, setNotes] = useState('')

  const phaseTrades = useMemo(
    () =>
      trades
        .filter(t => t.date >= account.phaseStart)
        .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    [trades, account.phaseStart],
  )

  const stats = useMemo(() => {
    const n = phaseTrades.length
    if (n === 0) return null
    const wins = phaseTrades.filter(t => t.resultR > 0).length
    const sumR = phaseTrades.reduce((s, t) => s + t.resultR, 0)
    const offPlan = phaseTrades.filter(t => !t.followedPlan).length
    const bySetup = new Map<string, GroupStats>()
    const bySession = new Map<string, GroupStats>()
    for (const t of phaseTrades) {
      for (const s of t.setups.length ? t.setups : ['(sem tag)']) accumulate(bySetup, s, t)
      accumulate(bySession, SESSION_LABELS[t.session], t)
    }
    return {
      n,
      winrate: wins / n,
      avgR: sumR / n,
      sumR,
      offPlanPct: offPlan / n,
      bySetup: [...bySetup.entries()].sort((a, b) => b[1].sumR - a[1].sumR),
      bySession: [...bySession.entries()].sort((a, b) => b[1].sumR - a[1].sumR),
    }
  }, [phaseTrades])

  const addTrade = () => {
    const r = Number(resultR)
    if (Number.isNaN(r) || resultR.trim() === '') return
    const risk = Number(riskUsd) > 0 ? Number(riskUsd) : state.riskPerTradeUsd
    const trade: Trade = {
      id: `t${Date.now()}`,
      date: todayStr(),
      direction,
      session,
      setups,
      riskUsd: risk,
      resultR: r,
      followedPlan,
      notes: notes.trim(),
    }
    setTrades(prev => [...prev, trade])
    setResultR('')
    setNotes('')
    setSetups([])
    setFollowedPlan(true)
  }

  const exportCsv = () => {
    const header = 'data,direcao,sessao,setups,risco_usd,resultado_r,pnl_usd,seguiu_plano,notas'
    const rows = trades.map(t =>
      [
        t.date,
        t.direction,
        t.session,
        `"${t.setups.join('; ')}"`,
        t.riskUsd,
        t.resultR,
        tradePnl(t).toFixed(2),
        t.followedPlan ? 'sim' : 'nao',
        `"${t.notes.replace(/"/g, '""')}"`,
      ].join(','),
    )
    download(`golddesk_trades_${todayStr()}.csv`, [header, ...rows].join('\n'), 'text/csv')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Registrar trade */}
        <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registrar trade de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                className={inputCls}
                value={direction}
                onChange={e => setDirection(e.target.value as TradeDirection)}
              >
                <option value="long">Compra</option>
                <option value="short">Venda</option>
              </select>
              <select
                className={inputCls}
                value={session}
                onChange={e => setSession(e.target.value as TradeSession)}
              >
                {Object.entries(SESSION_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] uppercase text-zinc-500">Setup(s)</label>
              <div className="flex flex-wrap gap-1.5">
                {SETUP_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() =>
                      setSetups(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
                      )
                    }
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[11px] transition',
                      setups.includes(tag)
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-zinc-700 text-zinc-500 hover:border-zinc-500',
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] uppercase text-zinc-500">
                  Risco $ (padrão {fmtUsd(state.riskPerTradeUsd)})
                </label>
                <input
                  className={cn(inputCls, 'w-full tabular-nums')}
                  inputMode="decimal"
                  placeholder={fmtUsd(state.riskPerTradeUsd)}
                  value={riskUsd}
                  onChange={e => setRiskUsd(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase text-zinc-500">
                  Resultado em R
                </label>
                <input
                  className={cn(inputCls, 'w-full tabular-nums')}
                  inputMode="decimal"
                  placeholder="+2 ou -1"
                  value={resultR}
                  onChange={e => setResultR(e.target.value)}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={followedPlan}
                onChange={e => setFollowedPlan(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Segui o plano neste trade
            </label>

            <textarea
              rows={2}
              placeholder="Notas: o que vi, o que senti, o que faria diferente…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />

            <Button onClick={addTrade} className="w-full gap-2 bg-amber-500 text-zinc-950 hover:bg-amber-400">
              <Plus className="h-4 w-4" /> Registrar
            </Button>

            <Button
              variant="outline"
              disabled={state.dayTrades.length === 0}
              onClick={() => onAskAgent(buildDayReviewPrompt(state.dayTrades))}
              className="w-full gap-2 border-sky-500/50 text-sky-300 hover:bg-sky-500/10"
            >
              <Bot className="h-4 w-4" /> Review do dia com o agente
            </Button>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Estatísticas da fase</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={exportCsv} disabled={trades.length === 0} className="gap-1.5 text-zinc-400 hover:text-zinc-100">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={trades.length === 0}
                onClick={() =>
                  download(
                    `golddesk_trades_${todayStr()}.json`,
                    JSON.stringify(trades, null, 2),
                    'application/json',
                  )
                }
                className="gap-1.5 text-zinc-400 hover:text-zinc-100"
              >
                <Download className="h-3.5 w-3.5" /> JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <p className="text-sm text-zinc-500">
                Nenhum trade registrado nesta fase ainda. Registre cada trade — a estatística por
                setup e por sessão é o que mostra onde está o seu edge real.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { label: 'Trades', value: String(stats.n) },
                    { label: 'Winrate', value: `${Math.round(stats.winrate * 100)}%` },
                    { label: 'R médio', value: stats.avgR.toFixed(2) },
                    { label: 'R total', value: `${stats.sumR > 0 ? '+' : ''}${stats.sumR.toFixed(1)}R` },
                    {
                      label: 'Fora do plano',
                      value: `${Math.round(stats.offPlanPct * 100)}%`,
                      danger: stats.offPlanPct > 0.2,
                    },
                  ].map(kpi => (
                    <div key={kpi.label} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-center">
                      <div className="text-[11px] uppercase text-zinc-500">{kpi.label}</div>
                      <div
                        className={cn(
                          'text-lg font-bold tabular-nums',
                          'danger' in kpi && kpi.danger ? 'text-red-400' : 'text-zinc-100',
                        )}
                      >
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase text-zinc-500">Por setup</div>
                    <ul className="space-y-1">
                      {stats.bySetup.map(([name, g]) => (
                        <li key={name} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs">
                          <span className="text-zinc-300">{name}</span>
                          <span className="tabular-nums text-zinc-400">
                            {g.count}x · {Math.round((g.wins / g.count) * 100)}% ·{' '}
                            <span className={g.sumR >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {g.sumR > 0 ? '+' : ''}
                              {g.sumR.toFixed(1)}R
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase text-zinc-500">Por sessão</div>
                    <ul className="space-y-1">
                      {stats.bySession.map(([name, g]) => (
                        <li key={name} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs">
                          <span className="text-zinc-300">{name}</span>
                          <span className="tabular-nums text-zinc-400">
                            {g.count}x · {Math.round((g.wins / g.count) * 100)}% ·{' '}
                            <span className={g.sumR >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {g.sumR > 0 ? '+' : ''}
                              {g.sumR.toFixed(1)}R
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diário */}
      <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diário de trades</CardTitle>
        </CardHeader>
        <CardContent>
          {phaseTrades.length === 0 ? (
            <p className="text-sm text-zinc-500">Vazio por enquanto.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-[11px] uppercase text-zinc-500">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Dir.</th>
                    <th className="py-2 pr-3">Sessão</th>
                    <th className="py-2 pr-3">Setups</th>
                    <th className="py-2 pr-3 text-right">Risco</th>
                    <th className="py-2 pr-3 text-right">R</th>
                    <th className="py-2 pr-3 text-right">P&L</th>
                    <th className="py-2 pr-3">Plano</th>
                    <th className="py-2 pr-3">Notas</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {phaseTrades.map(t => (
                    <tr key={t.id} className="border-b border-zinc-800/60">
                      <td className="py-2 pr-3 tabular-nums text-zinc-400">{t.date}</td>
                      <td className={cn('py-2 pr-3 font-medium', t.direction === 'long' ? 'text-emerald-400' : 'text-red-400')}>
                        {t.direction === 'long' ? 'Compra' : 'Venda'}
                      </td>
                      <td className="py-2 pr-3 text-zinc-400">{SESSION_LABELS[t.session]}</td>
                      <td className="py-2 pr-3 text-zinc-400">{t.setups.join(', ') || '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-zinc-400">
                        ${fmtUsd(t.riskUsd)}
                      </td>
                      <td className={cn('py-2 pr-3 text-right font-semibold tabular-nums', t.resultR >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {t.resultR > 0 ? '+' : ''}
                        {t.resultR}R
                      </td>
                      <td className={cn('py-2 pr-3 text-right tabular-nums', tradePnl(t) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {fmtSignedUsd(tradePnl(t))}
                      </td>
                      <td className="py-2 pr-3">{t.followedPlan ? '✅' : '❌'}</td>
                      <td className="max-w-[220px] truncate py-2 pr-3 text-zinc-500">{t.notes || '—'}</td>
                      <td className="py-2">
                        <button
                          onClick={() => setTrades(prev => prev.filter(x => x.id !== t.id))}
                          className="text-zinc-600 transition hover:text-red-400"
                          aria-label="Excluir trade"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
