import { useState } from 'react'
import { Clock, Loader2, Plus, Trash2, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AppState } from '../hooks/useAppState'
import { LEVEL_TYPES } from '../types/trading'
import { AdvancedChart } from '../components/tradingview/widgets'
import { TradeValidator } from '../components/TradeValidator'
import { SESSIONS, currentSession } from '../data/sessions'
import { computeSessionLevels, fetchXauCandles } from '../lib/marketData'

interface Props {
  app: AppState
  onAskAgent: (prompt: string) => void
  onOpenSettings: () => void
}

const inputCls =
  'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-500'

export function SalaDeTrade({ app, onAskAgent, onOpenSettings }: Props) {
  const { levels, setLevels, checklistDone, tdKey } = app
  const [levelType, setLevelType] = useState<string>(LEVEL_TYPES[0])
  const [levelPrice, setLevelPrice] = useState('')
  const [levelNote, setLevelNote] = useState('')
  const [autoBusy, setAutoBusy] = useState(false)
  const [autoError, setAutoError] = useState<string | null>(null)
  const session = currentSession()

  const pullAutoLevels = async () => {
    if (!tdKey.trim()) {
      setAutoError('no-key')
      return
    }
    setAutoBusy(true)
    setAutoError(null)
    try {
      const candles = await fetchXauCandles(tdKey.trim())
      const autoLevels = computeSessionLevels(candles)
      if (autoLevels.length === 0) {
        setAutoError('Nenhum candle retornado para calcular níveis. Tente de novo em instantes.')
      } else {
        setLevels(prev => [...prev.filter(l => !l.auto), ...autoLevels])
      }
    } catch (err) {
      setAutoError(err instanceof Error ? err.message : 'Erro ao buscar candles.')
    } finally {
      setAutoBusy(false)
    }
  }

  const addLevel = () => {
    const price = Number(levelPrice)
    if (!price) return
    setLevels(prev => [
      ...prev,
      {
        id: `lv${Date.now()}`,
        type: levelType,
        price,
        note: levelNote.trim(),
        createdAt: new Date().toISOString(),
      },
    ])
    setLevelPrice('')
    setLevelNote('')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      {!checklistDone && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          ⚠️ Você está operando <strong>sem plano</strong>: o checklist macro de hoje não foi
          preenchido na Pré-Sessão.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardContent className="p-1">
              <div style={{ height: 560 }}>
                <AdvancedChart height={558} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-amber-400" /> Sessões do ouro (BRT)
                <Badge variant="outline" className="ml-auto border-amber-500/50 bg-amber-500/10 text-xs text-amber-300">
                  agora: {session.name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {SESSIONS.map(s => (
                <div
                  key={s.id}
                  className={cn(
                    'rounded-lg border p-3',
                    s.id === session.id
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-zinc-800 bg-zinc-950/60',
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-zinc-200">{s.name}</span>
                    <span className="text-xs text-zinc-500 tabular-nums">{s.hoursBrt}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{s.behavior}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <TradeValidator app={app} onAskAgent={onAskAgent} />

          <Card className="border-zinc-800 bg-zinc-900/60 text-zinc-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Níveis de liquidez</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[11px] text-zinc-500">
                Marque máx/mín de sessão, PDH/PDL, zonas e order blocks. O agente recebe esses
                níveis em toda análise.
              </p>

              <Button
                onClick={pullAutoLevels}
                disabled={autoBusy}
                variant="outline"
                className="w-full gap-2 border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
              >
                {autoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Puxar níveis automáticos (PDH/PDL + sessões)
              </Button>
              {autoError === 'no-key' ? (
                <p className="text-[11px] text-amber-300">
                  Precisa da chave gratuita da Twelve Data.{' '}
                  <button onClick={onOpenSettings} className="underline hover:text-amber-200">
                    Abrir Configurações
                  </button>
                </p>
              ) : (
                autoError && <p className="text-[11px] text-red-400">{autoError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <select
                  className={cn(inputCls, 'flex-1')}
                  value={levelType}
                  onChange={e => setLevelType(e.target.value)}
                >
                  {LEVEL_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  className={cn(inputCls, 'w-24 tabular-nums')}
                  placeholder="preço"
                  inputMode="decimal"
                  value={levelPrice}
                  onChange={e => setLevelPrice(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLevel()}
                />
                <input
                  className={cn(inputCls, 'flex-1')}
                  placeholder="nota (opcional)"
                  value={levelNote}
                  onChange={e => setLevelNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLevel()}
                />
                <button
                  onClick={addLevel}
                  className="rounded-md border border-amber-500/50 px-2 text-amber-300 transition hover:bg-amber-500/10"
                  aria-label="Adicionar nível"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {levels.length === 0 ? (
                <p className="text-xs text-zinc-600">Nenhum nível marcado ainda.</p>
              ) : (
                <ul className="space-y-1">
                  {[...levels]
                    .sort((a, b) => b.price - a.price)
                    .map(level => (
                      <li
                        key={level.id}
                        className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs"
                      >
                        <span className="font-semibold text-amber-300 tabular-nums">
                          {level.price.toFixed(2)}
                        </span>
                        <span className="text-zinc-300">{level.type}</span>
                        {level.auto && (
                          <span className="rounded bg-sky-500/15 px-1 text-[10px] text-sky-300">auto</span>
                        )}
                        {level.note && <span className="truncate text-zinc-500">— {level.note}</span>}
                        <button
                          onClick={() => setLevels(prev => prev.filter(l => l.id !== level.id))}
                          className="ml-auto text-zinc-600 transition hover:text-red-400"
                          aria-label="Remover nível"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
