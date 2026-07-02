import { Bot, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AccountConfig } from '../types/trading'
import type { AccountState } from '../lib/ftmo'
import { fmtSignedUsd, fmtUsd, phaseLabel } from '../lib/ftmo'
import { cn } from '@/lib/utils'

interface Props {
  account: AccountConfig
  state: AccountState
  onOpenSettings: () => void
  onOpenAgent: () => void
}

function riskColor(usedRatio: number): string {
  if (usedRatio >= 0.8) return 'bg-red-500'
  if (usedRatio >= 0.5) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function Meter({
  label,
  usedRatio,
  detail,
}: {
  label: string
  usedRatio: number
  detail: string
}) {
  return (
    <div className="min-w-[150px] flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</span>
        <span className="text-xs font-medium text-zinc-200 tabular-nums">{detail}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn('h-full rounded-full transition-all', riskColor(usedRatio))}
          style={{ width: `${Math.min(100, Math.round(usedRatio * 100))}%` }}
        />
      </div>
    </div>
  )
}

export function AccountBar({ account, state, onOpenSettings, onOpenAgent }: Props) {
  const dailyUsed = state.maxDailyLoss > 0 ? state.dailyLossUsed / state.maxDailyLoss : 0
  const totalUsed = state.maxTotalLoss > 0 ? state.totalLossUsed / state.maxTotalLoss : 0
  const critical = state.tradesLeftOnRisk < 2

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-lg">
            🥇
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">Gold Desk</div>
            <div className="text-[11px] text-zinc-500">{phaseLabel(account.phase)}</div>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">
          <div className="min-w-[110px]">
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">Saldo</div>
            <div className="text-sm font-semibold text-zinc-100 tabular-nums">
              ${fmtUsd(state.balance)}{' '}
              <span
                className={cn(
                  'text-xs font-medium',
                  state.dayPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {fmtSignedUsd(state.dayPnl)} hoje
              </span>
            </div>
          </div>

          <Meter
            label="Perda diária"
            usedRatio={dailyUsed}
            detail={`resta $${fmtUsd(state.dailyLossLeft)}`}
          />
          <Meter
            label="Drawdown total"
            usedRatio={totalUsed}
            detail={`resta $${fmtUsd(state.totalLossLeft)}`}
          />
          {state.target > 0 && (
            <div className="min-w-[150px] flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-zinc-400">
                  Meta da fase
                </span>
                <span className="text-xs font-medium text-zinc-200 tabular-nums">
                  {fmtSignedUsd(state.phasePnl)} / ${fmtUsd(state.target)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{ width: `${Math.round(state.targetProgress * 100)}%` }}
                />
              </div>
            </div>
          )}

          <Badge
            variant="outline"
            className={cn(
              'border-zinc-700 text-xs tabular-nums',
              critical
                ? 'animate-pulse border-red-500/60 bg-red-500/10 text-red-300'
                : 'text-zinc-300',
            )}
          >
            risco p/ ~{state.tradesLeftOnRisk} trades
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onOpenAgent}
            className="gap-1.5 bg-amber-500 text-zinc-950 hover:bg-amber-400"
          >
            <Bot className="h-4 w-4" /> Agente
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onOpenSettings}
            className="text-zinc-400 hover:text-zinc-100"
            aria-label="Configurações"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
