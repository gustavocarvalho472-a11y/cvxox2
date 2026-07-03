import { useMemo, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { useEconCalendar } from './useEconCalendar'
import { DEFAULT_ACCOUNT } from '../types/trading'
import type {
  AccountConfig,
  KeyLevel,
  MacroChecklistState,
  Trade,
} from '../types/trading'
import { computeAccountState, todayStr } from '../lib/ftmo'
import { computeBias } from '../data/macroDrivers'

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
  // Override manual do guard-rail de notícia (além da detecção automática do calendário)
  const [highImpactSoon, setHighImpactSoon] = useState(false)
  const calendar = useEconCalendar()

  // Checklist é diário: o de ontem não vale hoje
  const checklist = rawChecklist && rawChecklist.date === todayStr() ? rawChecklist : null

  const state = useMemo(() => computeAccountState(account, trades), [account, trades])
  const biasInfo = useMemo(() => computeBias(checklist), [checklist])
  const checklistDone = biasInfo.filled >= 3

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
    state,
    biasInfo,
    checklistDone,
  }
}

export type AppState = ReturnType<typeof useAppState>
