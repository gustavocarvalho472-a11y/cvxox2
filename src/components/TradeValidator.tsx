import { useMemo, useState } from 'react'
import { AlertTriangle, Ban, Bot, Info, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AppState } from '../hooks/useAppState'
import type { GuardRail, TradeDirection } from '../types/trading'
import { calcTrade, evaluateGuardRails, fmtUsd, roundLots } from '../lib/ftmo'
import { biasLabel } from '../data/macroDrivers'

interface Props {
  app: AppState
  onAskAgent: (prompt: string) => void
}

const inputCls =
  'w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 tabular-nums'

function RailIcon({ severity }: { severity: GuardRail['severity'] }) {
  if (severity === 'block') return <Ban className="h-4 w-4 shrink-0 text-red-400" />
  if (severity === 'warn') return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
  return <Info className="h-4 w-4 shrink-0 text-sky-400" />
}

export function TradeValidator({ app, onAskAgent }: Props) {
  const { account, state, biasInfo, checklistDone, highImpactSoon, setHighImpactSoon } = app
  const [direction, setDirection] = useState<TradeDirection>('long')
  const [entry, setEntry] = useState('')
  const [stop, setStop] = useState('')
  const [target, setTarget] = useState('')
  const [riskUsd, setRiskUsd] = useState<string>('')

  const effectiveRisk = Number(riskUsd) > 0 ? Number(riskUsd) : state.riskPerTradeUsd

  const calc = useMemo(
    () =>
      calcTrade(
        {
          direction,
          entry: Number(entry) || 0,
          stop: Number(stop) || 0,
          target: Number(target) || 0,
        },
        effectiveRisk,
        state.dailyLossLeft,
      ),
    [direction, entry, stop, target, effectiveRisk, state.dailyLossLeft],
  )

  const rails = useMemo(
    () =>
      evaluateGuardRails({
        account,
        state,
        calc,
        direction,
        bias: biasInfo.bias,
        checklistDone,
        highImpactSoon,
      }),
    [account, state, calc, direction, biasInfo.bias, checklistDone, highImpactSoon],
  )

  const blocked = rails.some(r => r.severity === 'block')

  const askAgent = () => {
    const lines = [
      `Valide este trade em XAUUSD:`,
      `- Direção: ${direction === 'long' ? 'COMPRA' : 'VENDA'}`,
      `- Entrada: ${entry} | Stop: ${stop}${target ? ` | Alvo: ${target}` : ' | Alvo: não definido'}`,
      `- Risco: $${fmtUsd(calc.riskUsd)} (${roundLots(calc.lots).toFixed(2)} lotes)${calc.rr > 0 ? ` | R:R 1:${calc.rr.toFixed(1)}` : ''}`,
      '',
      'Vou colar o print do gráfico. Analise a estrutura (SMC/Wyckoff), a confluência com meu viés e níveis, e dê o veredito de disciplina.',
    ]
    onAskAgent(lines.join('\n'))
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Validador de trade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDirection('long')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition',
              direction === 'long'
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500',
            )}
          >
            <TrendingUp className="h-4 w-4" /> Compra
          </button>
          <button
            onClick={() => setDirection('short')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition',
              direction === 'short'
                ? 'border-red-500 bg-red-500/15 text-red-300'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500',
            )}
          >
            <TrendingDown className="h-4 w-4" /> Venda
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[11px] uppercase text-zinc-500">Entrada</label>
            <input className={inputCls} inputMode="decimal" placeholder="2650.00" value={entry} onChange={e => setEntry(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase text-zinc-500">Stop</label>
            <input className={inputCls} inputMode="decimal" placeholder="2645.00" value={stop} onChange={e => setStop(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase text-zinc-500">Alvo</label>
            <input className={inputCls} inputMode="decimal" placeholder="2665.00" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] uppercase text-zinc-500">
            Risco em $ (padrão: ${fmtUsd(state.riskPerTradeUsd)} = {account.riskPerTradePct}%)
          </label>
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder={fmtUsd(state.riskPerTradeUsd)}
            value={riskUsd}
            onChange={e => setRiskUsd(e.target.value)}
          />
        </div>

        {calc.valid ? (
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center">
            <div>
              <div className="text-[11px] uppercase text-zinc-500">Lotes</div>
              <div className="text-lg font-bold text-amber-400 tabular-nums">
                {roundLots(calc.lots).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-zinc-500">R:R</div>
              <div
                className={cn(
                  'text-lg font-bold tabular-nums',
                  calc.rr >= 2 ? 'text-emerald-400' : calc.rr > 0 ? 'text-amber-400' : 'text-zinc-500',
                )}
              >
                {calc.rr > 0 ? `1:${calc.rr.toFixed(1)}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-zinc-500">Stop ($/oz)</div>
              <div className="text-lg font-bold text-zinc-200 tabular-nums">
                {calc.stopDistance.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          calc.error && <p className="text-xs text-amber-400">{calc.error}</p>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={highImpactSoon}
            onChange={e => setHighImpactSoon(e.target.checked)}
            className="h-4 w-4 accent-red-500"
          />
          Evento de alto impacto (NFP/CPI/FOMC) em menos de 30 min
        </label>

        {calc.valid && rails.length > 0 && (
          <ul className="space-y-1.5">
            {rails.map((rail, i) => (
              <li
                key={i}
                className={cn(
                  'flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs leading-relaxed',
                  rail.severity === 'block' && 'border-red-500/40 bg-red-500/10 text-red-200',
                  rail.severity === 'warn' && 'border-amber-500/40 bg-amber-500/10 text-amber-200',
                  rail.severity === 'info' && 'border-sky-500/40 bg-sky-500/10 text-sky-200',
                )}
              >
                <RailIcon severity={rail.severity} />
                <span>{rail.message}</span>
              </li>
            ))}
          </ul>
        )}

        {calc.valid && (
          <div
            className={cn(
              'rounded-md px-3 py-2 text-center text-sm font-semibold',
              blocked
                ? 'bg-red-500/15 text-red-300'
                : rails.some(r => r.severity === 'warn')
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-300',
            )}
          >
            {blocked
              ? '❌ Não entre neste trade'
              : rails.some(r => r.severity === 'warn')
                ? '⚠️ Possível, mas com ressalvas'
                : `✅ Dentro das regras — viés do dia: ${biasLabel(biasInfo.bias)}`}
          </div>
        )}

        <Button
          onClick={askAgent}
          disabled={!calc.valid}
          variant="outline"
          className="w-full gap-2 border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
        >
          <Bot className="h-4 w-4" /> Parecer do agente (cole o print no chat)
        </Button>
      </CardContent>
    </Card>
  )
}
