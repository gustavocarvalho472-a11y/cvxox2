export type Phase = 'challenge' | 'verification' | 'funded'

export interface AccountConfig {
  size: number
  phase: Phase
  riskPerTradePct: number
  maxTradesPerDay: number
  phaseStart: string // YYYY-MM-DD — trades a partir desta data contam para a fase
}

export const DEFAULT_ACCOUNT: AccountConfig = {
  size: 100_000,
  phase: 'challenge',
  riskPerTradePct: 0.5,
  maxTradesPerDay: 3,
  phaseStart: new Date().toISOString().slice(0, 10),
}

export type GoldBias = 'bullish' | 'bearish' | 'neutral'

export interface MacroChecklistState {
  date: string
  readings: Record<string, string | null> // driverId → optionId escolhido
  note: string
}

export type TradeDirection = 'long' | 'short'
export type TradeSession = 'asia' | 'london' | 'ny' | 'off'

export interface Trade {
  id: string
  date: string // YYYY-MM-DD
  direction: TradeDirection
  session: TradeSession
  setups: string[]
  riskUsd: number
  resultR: number // resultado em múltiplos de R (ex: +2, -1)
  followedPlan: boolean
  notes: string
}

export interface KeyLevel {
  id: string
  type: string
  price: number
  note: string
  createdAt: string
}

export interface TradeInput {
  direction: TradeDirection
  entry: number
  stop: number
  target: number
}

export type GuardSeverity = 'block' | 'warn' | 'info'

export interface GuardRail {
  severity: GuardSeverity
  message: string
}

export const SETUP_TAGS = [
  'Order Block',
  'FVG',
  'Liquidity Sweep',
  'BOS',
  'CHoCH',
  'Spring (Wyckoff)',
  'UTAD (Wyckoff)',
  'Supply Zone',
  'Demand Zone',
  'Breakout',
  'Reversão em nível',
  'Continuação',
] as const

export const LEVEL_TYPES = [
  'Máx Ásia',
  'Mín Ásia',
  'Máx Londres',
  'Mín Londres',
  'Máx NY',
  'Mín NY',
  'PDH (máx dia anterior)',
  'PDL (mín dia anterior)',
  'Supply Zone',
  'Demand Zone',
  'Order Block',
  'FVG',
  'Equal Highs (liquidez)',
  'Equal Lows (liquidez)',
  'Outro',
] as const
