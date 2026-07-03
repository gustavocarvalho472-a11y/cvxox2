import { useMemo, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { useEconCalendar } from './useEconCalendar'
import { useGoldPrice } from './useGoldPrice'
import type { AutoBiasResult } from '../lib/autoBias'
import { DEFAULT_ACCOUNT } from '../types/trading'
import type {
  AccountConfig,
  KeyLevel,
  MacroChecklistState,
  Trade,
} from '../types/trading'
import { computeAccountState, todayStr } from '../lib/ftmo'
import { computeBias } from '../data/macroDrivers'
import type { CorrelationResult } from '../lib/marketData'

export function useAppState() {
  const [account, setAccount] = useLocalStorage<AccountConfig>('gd_account', DEFAULT_ACCOUNT)
  const [apiKey, setApiKey] = useLocalStorage<string>('gd_apikey', '')
  const [tdKey, setTdKey] = useLocalStorage<string>('gd_tdkey', '')
  const [trades, setTrades] = useLocalStorage<Trade[]>('gd_trades', [])
  const [levels, setLevels] = useLocalStorage<KeyLevel[]>('gd_levels', [])
  const [rawChecklist, setChecklist] = useLocalStorage<MacroChecklistState | null>(
    'gd_checklist',
    null,
  )
  const [correlation, setCorrelation] = useLocalStorage<CorrelationResult | null>('gd_corr', null)
  const [autoBias, setAutoBias] = useLocalStorage<AutoBiasResult | null>('gd_autobias', null)
  // Override manual do guard-rail de notícia (além da detecção automática do calendário)
  const [highImpactSoon, setHighImpactSoon] = useState(false)
  const calendar = useEconCalendar()
  const { gold } = useGoldPrice()

  // Checklist é diário: o de ontem não vale hoje
  const checklist = rawChecklist && rawChecklist.date === todayStr() ? rawChecklist : null

  const state = useMemo(() => computeAccountState(account, trades), [account, trades])
  const biasInfo = useMemo(() => computeBias(checklist), [checklist])
  const checklistDone = biasInfo.filled >= 3

  // Viés efetivo (guard-rails + agente): automático quando fresco (12h), senão o do checklist
  const autoBiasFresh =
    autoBias !== null && Date.now() - new Date(autoBias.computedAt).getTime() < 12 * 3600 * 1000
  const effectiveBias = autoBiasFresh ? autoBias.bias : biasInfo.bias
  const effectiveBiasSource: 'auto' | 'manual' = autoBiasFresh ? 'auto' : 'manual'
  const biasDefined = autoBiasFresh || checklistDone

  return {
    account,
    setAccount,
    apiKey,
    setApiKey,
    tdKey,
    setTdKey,
    trades,
    setTrades,
    levels,
    setLevels,
    checklist,
    setChecklist,
    highImpactSoon,
    setHighImpactSoon,
    calendar,
    gold,
    correlation,
    setCorrelation,
    autoBias,
    setAutoBias,
    autoBiasFresh,
    effectiveBias,
    effectiveBiasSource,
    biasDefined,
    state,
    biasInfo,
    checklistDone,
  }
}

export type AppState = ReturnType<typeof useAppState>
