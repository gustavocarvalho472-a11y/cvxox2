import type {
  AccountConfig,
  GoldBias,
  GuardRail,
  Trade,
  TradeInput,
} from '../types/trading'

// XAUUSD: 1 lote = 100 oz → movimento de $1,00 no preço = $100 por lote
export const USD_PER_DOLLAR_MOVE_PER_LOT = 100

export const DAILY_LOSS_PCT = 0.05
export const TOTAL_LOSS_PCT = 0.1

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function phaseTargetPct(phase: AccountConfig['phase']): number {
  if (phase === 'challenge') return 0.1
  if (phase === 'verification') return 0.05
  return 0
}

export function phaseLabel(phase: AccountConfig['phase']): string {
  if (phase === 'challenge') return 'Fase 1 — Challenge'
  if (phase === 'verification') return 'Fase 2 — Verification'
  return 'Conta Financiada'
}

export function tradePnl(t: Trade): number {
  return t.resultR * t.riskUsd
}

export interface AccountState {
  balance: number
  phasePnl: number
  dayPnl: number
  dayTrades: Trade[]
  target: number
  targetProgress: number // 0..1 (funded → 0)
  maxDailyLoss: number
  dailyLossUsed: number // >= 0
  dailyLossLeft: number
  maxTotalLoss: number
  totalLossUsed: number // >= 0
  totalLossLeft: number
  riskPerTradeUsd: number
  tradesLeftOnRisk: number // quantos trades a risco padrão cabem na perda diária restante
}

export function computeAccountState(
  account: AccountConfig,
  trades: Trade[],
): AccountState {
  const today = todayStr()
  const phaseTrades = trades.filter(t => t.date >= account.phaseStart)
  const phasePnl = phaseTrades.reduce((s, t) => s + tradePnl(t), 0)
  const dayTrades = phaseTrades.filter(t => t.date === today)
  const dayPnl = dayTrades.reduce((s, t) => s + tradePnl(t), 0)

  const balance = account.size + phasePnl
  const target = account.size * phaseTargetPct(account.phase)
  const maxDailyLoss = account.size * DAILY_LOSS_PCT
  const maxTotalLoss = account.size * TOTAL_LOSS_PCT

  const dailyLossUsed = Math.max(0, -dayPnl)
  const totalLossUsed = Math.max(0, -phasePnl)
  const dailyLossLeft = Math.max(0, maxDailyLoss - dailyLossUsed)
  const totalLossLeft = Math.max(0, maxTotalLoss - totalLossUsed)
  const riskPerTradeUsd = account.size * (account.riskPerTradePct / 100)

  const effectiveLossLeft = Math.min(dailyLossLeft, totalLossLeft)

  return {
    balance,
    phasePnl,
    dayPnl,
    dayTrades,
    target,
    targetProgress: target > 0 ? Math.min(1, Math.max(0, phasePnl / target)) : 0,
    maxDailyLoss,
    dailyLossUsed,
    dailyLossLeft,
    maxTotalLoss,
    totalLossUsed,
    totalLossLeft,
    riskPerTradeUsd,
    tradesLeftOnRisk:
      riskPerTradeUsd > 0 ? Math.floor(effectiveLossLeft / riskPerTradeUsd) : 0,
  }
}

export interface TradeCalc {
  valid: boolean
  error?: string
  stopDistance: number
  targetDistance: number
  rr: number
  riskUsd: number
  lots: number
  riskPctOfDailyLeft: number
}

export function calcTrade(
  input: TradeInput,
  riskUsd: number,
  dailyLossLeft: number,
): TradeCalc {
  const { direction, entry, stop, target } = input
  const invalid: TradeCalc = {
    valid: false,
    stopDistance: 0,
    targetDistance: 0,
    rr: 0,
    riskUsd,
    lots: 0,
    riskPctOfDailyLeft: 0,
  }
  if (!entry || !stop) return { ...invalid, error: 'Informe entrada e stop.' }
  if (direction === 'long' && stop >= entry)
    return { ...invalid, error: 'Long: o stop deve estar abaixo da entrada.' }
  if (direction === 'short' && stop <= entry)
    return { ...invalid, error: 'Short: o stop deve estar acima da entrada.' }
  if (target) {
    if (direction === 'long' && target <= entry)
      return { ...invalid, error: 'Long: o alvo deve estar acima da entrada.' }
    if (direction === 'short' && target >= entry)
      return { ...invalid, error: 'Short: o alvo deve estar abaixo da entrada.' }
  }

  const stopDistance = Math.abs(entry - stop)
  const targetDistance = target ? Math.abs(target - entry) : 0
  const rr = targetDistance > 0 ? targetDistance / stopDistance : 0
  const lots = riskUsd / (stopDistance * USD_PER_DOLLAR_MOVE_PER_LOT)

  return {
    valid: true,
    stopDistance,
    targetDistance,
    rr,
    riskUsd,
    lots,
    riskPctOfDailyLeft: dailyLossLeft > 0 ? riskUsd / dailyLossLeft : 1,
  }
}

export function roundLots(lots: number): number {
  // MT5: passo mínimo de 0.01 lote — arredonda para baixo para nunca exceder o risco
  return Math.floor(lots * 100) / 100
}

export interface GuardContext {
  account: AccountConfig
  state: AccountState
  calc: TradeCalc
  direction: TradeInput['direction']
  bias: GoldBias | null
  checklistDone: boolean
  highImpactSoon: boolean // evento de alto impacto em <30min (marcado pelo usuário)
}

export function evaluateGuardRails(ctx: GuardContext): GuardRail[] {
  const { account, state, calc, direction, bias, checklistDone, highImpactSoon } = ctx
  const rails: GuardRail[] = []
  if (!calc.valid) return rails

  if (calc.riskUsd > state.dailyLossLeft) {
    rails.push({
      severity: 'block',
      message: `Risco de $${fmtUsd(calc.riskUsd)} excede sua perda diária restante ($${fmtUsd(state.dailyLossLeft)}). Este trade pode ELIMINAR sua conta hoje.`,
    })
  } else if (calc.riskPctOfDailyLeft > 0.5) {
    rails.push({
      severity: 'block',
      message: `Este trade arrisca ${Math.round(calc.riskPctOfDailyLeft * 100)}% do seu limite diário restante. Um stop e você fica sem margem para operar.`,
    })
  } else if (calc.riskPctOfDailyLeft > 0.34) {
    rails.push({
      severity: 'warn',
      message: `Risco alto: ${Math.round(calc.riskPctOfDailyLeft * 100)}% do limite diário restante em um único trade.`,
    })
  }

  if (calc.riskUsd > state.totalLossLeft) {
    rails.push({
      severity: 'block',
      message: `Risco excede o drawdown total restante ($${fmtUsd(state.totalLossLeft)}). Violação de conta.`,
    })
  }

  if (state.dailyLossUsed >= state.maxDailyLoss * 0.6) {
    rails.push({
      severity: 'warn',
      message: `Você já consumiu ${Math.round((state.dailyLossUsed / state.maxDailyLoss) * 100)}% da perda diária. Dia difícil — considere parar e voltar amanhã.`,
    })
  }

  if (calc.rr > 0 && calc.rr < 2) {
    rails.push({
      severity: 'warn',
      message: `R:R de 1:${calc.rr.toFixed(1)} — abaixo de 1:2. Com winrate típico de SMC, esse trade tem expectativa fraca.`,
    })
  }
  if (calc.rr === 0) {
    rails.push({ severity: 'info', message: 'Sem alvo definido — defina o alvo antes de entrar, não depois.' })
  }

  if (highImpactSoon) {
    rails.push({
      severity: 'block',
      message: 'Evento de alto impacto em menos de 30 minutos. Spread e slippage explodem no ouro — não entre agora.',
    })
  }

  if (!checklistDone) {
    rails.push({
      severity: 'warn',
      message: 'Checklist macro de hoje não foi preenchido. Você está operando sem viés definido.',
    })
  } else if (bias && bias !== 'neutral') {
    const against =
      (bias === 'bullish' && direction === 'short') ||
      (bias === 'bearish' && direction === 'long')
    if (against) {
      rails.push({
        severity: 'warn',
        message: `Trade ${direction === 'long' ? 'comprado' : 'vendido'} CONTRA o seu viés macro do dia (${bias === 'bullish' ? 'altista' : 'baixista'}). Contra-tendência exige confluência extra.`,
      })
    }
  }

  if (state.dayTrades.length >= account.maxTradesPerDay) {
    rails.push({
      severity: 'block',
      message: `Você já fez ${state.dayTrades.length} trades hoje (limite: ${account.maxTradesPerDay}). Mais um agora é overtrading, não análise.`,
    })
  } else if (state.dayTrades.length === account.maxTradesPerDay - 1) {
    rails.push({
      severity: 'info',
      message: 'Último trade do dia pelo seu limite. Faça valer.',
    })
  }

  const lastTwo = state.dayTrades.slice(-2)
  if (lastTwo.length === 2 && lastTwo.every(t => t.resultR < 0)) {
    rails.push({
      severity: 'warn',
      message: '2 perdas seguidas hoje. Pausa de 30 minutos antes do próximo trade — revenge trading reprova mais que análise ruim.',
    })
  }

  return rails
}

export function fmtUsd(v: number): string {
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function fmtSignedUsd(v: number): string {
  const s = Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
  return v < 0 ? `-$${s}` : `+$${s}`
}
