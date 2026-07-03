import type { GoldBias } from '../types/trading'
import type { EconEvent } from './calendar'
import { fmtBrt } from './calendar'
import type { CorrelationResult, DailyClose } from './marketData'
import { computeXauUsdCorrelation, correlationRegime } from './marketData'

export interface BiasComponent {
  id: string
  label: string
  signal: GoldBias
  weight: number
  detail: string
}

export interface AutoBiasResult {
  bias: GoldBias
  score: number // soma ponderada: bullish +w, bearish -w
  maxScore: number
  components: BiasComponent[]
  caution: string | null // eventos de alto impacto hoje
  correlation: CorrelationResult
  computedAt: string
  source?: string // de onde vieram os candles (Twelve Data ou fontes gratuitas)
}

function asc(series: DailyClose[]): DailyClose[] {
  return [...series].sort((a, b) => a.date.localeCompare(b.date))
}

function sma(closes: number[], n: number): number {
  const window = closes.slice(-n)
  return window.reduce((s, v) => s + v, 0) / window.length
}

function pct(a: number, b: number): number {
  return (a / b - 1) * 100
}

// Viés automático do XAU a partir de preço, dólar, regime de correlação e calendário.
// spot (gold-api) refina a leitura intradiária; sem ele, usa o último fechamento.
export function computeAutoBias(
  xauDaily: DailyClose[],
  eurDaily: DailyClose[],
  spot: number | null,
  todayHighEvents: EconEvent[],
): AutoBiasResult {
  const xau = asc(xauDaily)
  const eur = asc(eurDaily)
  if (xau.length < 21 || eur.length < 21)
    throw new Error('Dados insuficientes para o viés automático (mínimo 21 dias).')

  const xauCloses = xau.map(d => d.close)
  const eurCloses = eur.map(d => d.close)
  const lastClose = xauCloses[xauCloses.length - 1]
  const price = spot ?? lastClose
  const components: BiasComponent[] = []

  // 1. Tendência (peso 2): preço vs média de 20 dias
  const xauSma20 = sma(xauCloses, 20)
  const trendDelta = pct(price, xauSma20)
  components.push({
    id: 'tendencia',
    label: 'Tendência (preço × média 20d)',
    signal: trendDelta > 0.1 ? 'bullish' : trendDelta < -0.1 ? 'bearish' : 'neutral',
    weight: 2,
    detail: `$${price.toFixed(2)} está ${trendDelta >= 0 ? '+' : ''}${trendDelta.toFixed(1)}% vs SMA20 ($${xauSma20.toFixed(0)})`,
  })

  // 2. Momentum (peso 1): retorno dos últimos 5 dias
  const roc5 = pct(lastClose, xauCloses[xauCloses.length - 6])
  components.push({
    id: 'momentum',
    label: 'Momentum (5 dias)',
    signal: roc5 > 0.5 ? 'bullish' : roc5 < -0.5 ? 'bearish' : 'neutral',
    weight: 1,
    detail: `${roc5 >= 0 ? '+' : ''}${roc5.toFixed(1)}% na semana`,
  })

  // 3. Dólar (peso 1): EUR/USD vs média 20d — euro acima = dólar fraco = vento a favor do ouro
  const eurLast = eurCloses[eurCloses.length - 1]
  const eurSma20 = sma(eurCloses, 20)
  const usdDelta = pct(eurLast, eurSma20)
  components.push({
    id: 'dolar',
    label: 'Dólar (proxy EUR/USD × média 20d)',
    signal: usdDelta > 0.1 ? 'bullish' : usdDelta < -0.1 ? 'bearish' : 'neutral',
    weight: 1,
    detail:
      usdDelta > 0.1
        ? `dólar fraco (EUR ${usdDelta >= 0 ? '+' : ''}${usdDelta.toFixed(1)}% vs SMA20)`
        : usdDelta < -0.1
          ? `dólar forte (EUR ${usdDelta.toFixed(1)}% vs SMA20)`
          : 'dólar lateral vs média de 20 dias',
  })

  // 4. Regime de correlação (peso 1): desacoplamento = demanda estrutural
  const correlation = computeXauUsdCorrelation(xauDaily, eurDaily)
  const regime = correlationRegime(correlation.corr)
  components.push({
    id: 'regime',
    label: 'Regime XAU × Dólar (20d)',
    signal: regime.tone === 'decoupled' ? 'bullish' : 'neutral',
    weight: 1,
    detail: `${correlation.corr >= 0 ? '+' : ''}${correlation.corr.toFixed(2)} — ${regime.label.toLowerCase()}${regime.tone === 'decoupled' ? ' (demanda estrutural comprando)' : ''}`,
  })

  // 5. Intradiário (peso 1): spot vs último fechamento diário
  if (spot !== null) {
    const dayChange = pct(spot, lastClose)
    components.push({
      id: 'intradia',
      label: 'Hoje (spot × fechamento anterior)',
      signal: dayChange > 0.3 ? 'bullish' : dayChange < -0.3 ? 'bearish' : 'neutral',
      weight: 1,
      detail: `${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)}% no dia`,
    })
  }

  const score = components.reduce(
    (s, c) => s + (c.signal === 'bullish' ? c.weight : c.signal === 'bearish' ? -c.weight : 0),
    0,
  )
  const maxScore = components.reduce((s, c) => s + c.weight, 0)
  const bias: GoldBias = score >= 2 ? 'bullish' : score <= -2 ? 'bearish' : 'neutral'

  const caution =
    todayHighEvents.length > 0
      ? `Hoje tem ${todayHighEvents.map(e => `${e.title} às ${fmtBrt(e.date)}`).join(' e ')} — o viés pode virar no dado; reduza risco na janela do evento.`
      : null

  return {
    bias,
    score,
    maxScore,
    components,
    caution,
    correlation,
    computedAt: new Date().toISOString(),
  }
}
