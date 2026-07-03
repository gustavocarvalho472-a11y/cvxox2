import type { KeyLevel } from '../types/trading'

export interface GoldPrice {
  price: number
  updatedAt: string // ISO
  source?: 'XAU' | 'PAXG'
}

export interface Candle {
  datetime: string // "YYYY-MM-DD HH:MM:SS" no fuso America/Sao_Paulo
  high: number
  low: number
}

// gold-api.com (XAU spot) com fallback no ticker PAXG da Coinbase
export async function fetchGoldPrice(): Promise<GoldPrice> {
  try {
    const res = await fetch('https://api.gold-api.com/price/XAU')
    if (!res.ok) throw new Error(`gold-api respondeu ${res.status}`)
    const data = (await res.json()) as { price: number; updatedAt: string }
    if (typeof data.price !== 'number') throw new Error('resposta inesperada da gold-api')
    return { price: data.price, updatedAt: data.updatedAt, source: 'XAU' }
  } catch {
    const res = await fetch('https://api.exchange.coinbase.com/products/PAXG-USD/ticker')
    if (!res.ok) throw new Error(`Coinbase respondeu ${res.status}`)
    const data = (await res.json()) as { price: string; time: string }
    const price = Number(data.price)
    if (!price) throw new Error('resposta inesperada da Coinbase')
    return { price, updatedAt: data.time, source: 'PAXG' }
  }
}

// Twelve Data: candles 15min de XAU/USD já no fuso BRT (250 candles ≈ 2,6 dias)
export async function fetchXauCandles(tdKey: string): Promise<Candle[]> {
  const url =
    'https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=15min&outputsize=250' +
    `&timezone=America/Sao_Paulo&apikey=${encodeURIComponent(tdKey)}`
  const res = await fetch(url)
  const data = await res.json()

  if (data.status === 'error') {
    if (data.code === 401) throw new Error('Chave Twelve Data inválida. Confira nas Configurações.')
    if (data.code === 429)
      throw new Error('Limite do plano gratuito atingido (8 req/min). Aguarde 1 minuto e tente de novo.')
    throw new Error(`Twelve Data: ${data.message ?? 'erro desconhecido'}`)
  }
  if (!Array.isArray(data.values)) throw new Error('Resposta inesperada da Twelve Data.')

  return (data.values as { datetime: string; high: string; low: string }[]).map(v => ({
    datetime: v.datetime,
    high: Number(v.high),
    low: Number(v.low),
  }))
}

export interface DailyClose {
  date: string
  close: number
}

// Fecha diário via Twelve Data (newest-first na API; retornamos como veio)
export async function fetchDailyCloses(
  symbol: string,
  tdKey: string,
  outputsize = 40,
): Promise<DailyClose[]> {
  const url =
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}` +
    `&interval=1day&outputsize=${outputsize}&apikey=${encodeURIComponent(tdKey)}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status === 'error') {
    if (data.code === 401) throw new Error('Chave Twelve Data inválida. Confira nas Configurações.')
    if (data.code === 429)
      throw new Error('Limite do plano gratuito atingido (8 req/min). Aguarde 1 minuto e tente de novo.')
    throw new Error(`Twelve Data: ${data.message ?? 'erro desconhecido'}`)
  }
  if (!Array.isArray(data.values)) throw new Error('Resposta inesperada da Twelve Data.')
  return (data.values as { datetime: string; close: string }[]).map(v => ({
    date: v.datetime.slice(0, 10),
    close: Number(v.close),
  }))
}

// ── Fontes SEM chave (fallback quando não há Twelve Data) ─────────────────
// Coinbase PAXG-USD: ouro tokenizado, segue o XAU ~1:1. CORS liberado.
// Formato Coinbase: [[time, low, high, open, close, volume], ...] (mais recente primeiro)

export async function fetchGoldDailyFree(): Promise<DailyClose[]> {
  const res = await fetch(
    'https://api.exchange.coinbase.com/products/PAXG-USD/candles?granularity=86400',
  )
  if (!res.ok) throw new Error(`Coinbase respondeu ${res.status}`)
  const rows = (await res.json()) as number[][]
  if (!Array.isArray(rows) || rows.length === 0)
    throw new Error('Resposta inesperada da Coinbase.')
  return rows.map(r => ({
    date: new Date(r[0] * 1000).toISOString().slice(0, 10),
    close: r[4],
  }))
}

// EUR/USD diário do BCE (Frankfurter) — dias úteis, sem chave, CORS liberado
export async function fetchEurDailyFree(): Promise<DailyClose[]> {
  const end = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - 70 * 86400_000).toISOString().slice(0, 10)
  const res = await fetch(
    `https://api.frankfurter.dev/v1/${startDate}..${end}?base=EUR&symbols=USD`,
  )
  if (!res.ok) throw new Error(`Frankfurter respondeu ${res.status}`)
  const data = (await res.json()) as { rates: Record<string, { USD: number }> }
  if (!data.rates) throw new Error('Resposta inesperada do Frankfurter.')
  return Object.entries(data.rates)
    .map(([date, r]) => ({ date, close: r.USD }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

const brtStamp = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// Candles 15min do ouro (PAXG) sem chave — ~3 dias, p/ níveis de sessão aproximados
export async function fetchGoldCandles15mFree(): Promise<Candle[]> {
  const res = await fetch(
    'https://api.exchange.coinbase.com/products/PAXG-USD/candles?granularity=900',
  )
  if (!res.ok) throw new Error(`Coinbase respondeu ${res.status}`)
  const rows = (await res.json()) as number[][]
  if (!Array.isArray(rows) || rows.length === 0)
    throw new Error('Resposta inesperada da Coinbase.')
  return rows.map(r => {
    const parts = brtStamp.formatToParts(new Date(r[0] * 1000))
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
    return {
      datetime: `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`,
      low: r[1],
      high: r[2],
    }
  })
}

export interface CorrelationResult {
  corr: number // correlação XAU × dólar (proxy EUR/USD invertido), -1..+1
  days: number
  computedAt: string
}

function pearson(a: number[], b: number[]): number {
  const n = a.length
  const meanA = a.reduce((s, v) => s + v, 0) / n
  const meanB = b.reduce((s, v) => s + v, 0) / n
  let cov = 0
  let varA = 0
  let varB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA
    const db = b[i] - meanB
    cov += da * db
    varA += da * da
    varB += db * db
  }
  const denom = Math.sqrt(varA * varB)
  return denom === 0 ? 0 : cov / denom
}

// Correlação de 20 dias entre retornos do XAU e força do dólar.
// EUR/USD é ~57,6% do DXY → corr(XAU, USD) ≈ −corr(XAU, EURUSD).
export function computeXauUsdCorrelation(
  xau: DailyClose[],
  eur: DailyClose[],
  window = 20,
): CorrelationResult {
  const eurByDate = new Map(eur.map(d => [d.date, d.close]))
  const paired = xau
    .filter(d => eurByDate.has(d.date))
    .sort((a, b) => a.date.localeCompare(b.date))

  const xauRet: number[] = []
  const eurRet: number[] = []
  for (let i = 1; i < paired.length; i++) {
    xauRet.push(Math.log(paired[i].close / paired[i - 1].close))
    const e1 = eurByDate.get(paired[i].date)!
    const e0 = eurByDate.get(paired[i - 1].date)!
    eurRet.push(Math.log(e1 / e0))
  }
  const n = Math.min(window, xauRet.length)
  if (n < 10) throw new Error('Dados insuficientes para calcular a correlação (mínimo 10 dias).')

  const corr = -pearson(xauRet.slice(-n), eurRet.slice(-n))
  return { corr: Math.round(corr * 100) / 100, days: n, computedAt: new Date().toISOString() }
}

export interface CorrelationRegime {
  label: string
  detail: string
  tone: 'classic' | 'weak' | 'decoupled'
}

export function correlationRegime(corr: number): CorrelationRegime {
  if (corr <= -0.5)
    return {
      label: 'Regime clássico',
      detail:
        'Dólar mandando no ouro: correlação inversa forte. A leitura do DXY no seu checklist vale em dobro — dólar caindo é vento a favor de compras.',
      tone: 'classic',
    }
  if (corr < 0.2)
    return {
      label: 'Correlação fraca',
      detail:
        'O ouro está ouvindo o dólar só em parte (ou nada). Dê mais peso aos juros reais, fluxos e geopolítica do que ao DXY nesta fase.',
      tone: 'weak',
    }
  return {
    label: 'DESACOPLADO',
    detail:
      'Ouro andando junto (ou apesar) do dólar: demanda estrutural mandando — padrão de compras de bancos centrais/busca por proteção. Historicamente um sinal de força do ouro; quedas tendem a ser compradas.',
    tone: 'decoupled',
  }
}

function brtNow(now = new Date()): { date: string; hour: number } {
  // Mesma aproximação UTC-3 usada em data/sessions.ts
  const brt = new Date(now.getTime() - 3 * 3600 * 1000)
  return { date: brt.toISOString().slice(0, 10), hour: brt.getUTCHours() }
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function rangeOf(candles: Candle[], from: string, to: string): { high: number; low: number } | null {
  const inWindow = candles.filter(c => c.datetime >= from && c.datetime < to)
  if (inWindow.length === 0) return null
  return {
    high: Math.max(...inWindow.map(c => c.high)),
    low: Math.min(...inWindow.map(c => c.low)),
  }
}

// PDH/PDL do dia anterior + máx/mín das sessões já iniciadas (janelas BRT de data/sessions.ts)
export function computeSessionLevels(candles: Candle[], now = new Date()): KeyLevel[] {
  const { date: today, hour } = brtNow(now)
  const yesterday = shiftDate(today, -1)
  const tomorrow = shiftDate(today, 1)
  const stamp = new Date().toISOString()
  const levels: KeyLevel[] = []

  const push = (type: string, price: number, note: string) =>
    levels.push({ id: `auto_${type}_${stamp}`, type, price: Math.round(price * 100) / 100, note, createdAt: stamp, auto: true })

  const prevDay = rangeOf(candles, `${yesterday} 00:00`, `${today} 00:00`)
  if (prevDay) {
    push('PDH (máx dia anterior)', prevDay.high, yesterday)
    push('PDL (mín dia anterior)', prevDay.low, yesterday)
  }

  // Ásia: 20h–04h BRT (atravessa a meia-noite). Depois das 20h, a sessão vigente é a da noite atual.
  const asia =
    hour >= 20
      ? rangeOf(candles, `${today} 20:00`, `${tomorrow} 04:00`)
      : rangeOf(candles, `${yesterday} 20:00`, `${today} 04:00`)
  if (asia) {
    push('Máx Ásia', asia.high, 'sessão atual')
    push('Mín Ásia', asia.low, 'sessão atual')
  }

  if (hour >= 4 && hour < 20) {
    const london = rangeOf(candles, `${today} 04:00`, `${today} 09:00`)
    if (london) {
      push('Máx Londres', london.high, 'hoje')
      push('Mín Londres', london.low, 'hoje')
    }
  }

  if (hour >= 9 && hour < 20) {
    const ny = rangeOf(candles, `${today} 09:00`, `${today} 17:00`)
    if (ny) {
      push('Máx NY', ny.high, 'hoje')
      push('Mín NY', ny.low, 'hoje')
    }
  }

  return levels
}
