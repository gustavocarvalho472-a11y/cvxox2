// Leitura operacional de AGORA: momentum 15min/1h/4h, pressão de volume,
// confluência com o dólar intradiário e mapa de liquidez no gráfico de 30m.
// Tudo sem chave: candles PAXG-USD da Coinbase (volume incluído) e
// EUR/USD intradiário derivado da razão BTC-USD / BTC-EUR.

export interface ICandle {
  t: number // epoch segundos
  open: number
  high: number
  low: number
  close: number
  vol: number
}

const CB = 'https://api.exchange.coinbase.com/products'
const FETCH_TIMEOUT_MS = 8000

async function fetchCb15m(product: string): Promise<ICandle[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${CB}/${product}/candles?granularity=900`, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`Coinbase respondeu ${res.status}`)
  const rows = (await res.json()) as number[][]
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Resposta inesperada da Coinbase.')
  return rows
    .map(r => ({ t: r[0], low: r[1], high: r[2], open: r[3], close: r[4], vol: r[5] }))
    .sort((a, b) => a.t - b.t)
}

export const fetchGold15m = () => fetchCb15m('PAXG-USD')

// EUR/USD 15min sem chave: BTC cotado em USD e em EUR ao mesmo tempo → a razão é o câmbio
export async function fetchEurUsd15m(): Promise<{ t: number; close: number }[]> {
  const [usd, eur] = await Promise.all([fetchCb15m('BTC-USD'), fetchCb15m('BTC-EUR')])
  const eurByT = new Map(eur.map(c => [c.t, c.close]))
  return usd
    .filter(c => eurByT.has(c.t))
    .map(c => ({ t: c.t, close: c.close / (eurByT.get(c.t) as number) }))
}

export type Dir = 'up' | 'down' | 'flat'

export interface TfMove {
  pct: number
  dir: Dir
}

export interface NowReading {
  price: number
  m15: TfMove
  h1: TfMove
  h4: TfMove
  buyRatio4h: number // fração do volume em candles de alta (últimas 4h)
  volumeTone: 'comprador' | 'vendedor' | 'equilibrado'
  dollarH1: Dir
  dollarH4: Dir
  headline: string
  confluence: string
}

function move(closes: number[], back: number, deadbandPct: number): TfMove {
  const last = closes[closes.length - 1]
  const ref = closes[closes.length - 1 - back]
  const pct = (last / ref - 1) * 100
  return { pct, dir: pct > deadbandPct ? 'up' : pct < -deadbandPct ? 'down' : 'flat' }
}

const dirWord = (d: Dir, up: string, down: string, flat: string) =>
  d === 'up' ? up : d === 'down' ? down : flat

export function computeNowReading(
  xau15: ICandle[],
  eur15: { t: number; close: number }[],
): NowReading {
  if (xau15.length < 20 || eur15.length < 20)
    throw new Error('Poucos candles intradiários para a leitura de agora.')

  const closes = xau15.map(c => c.close)
  const price = closes[closes.length - 1]
  const m15 = move(closes, 1, 0.04)
  const h1 = move(closes, 4, 0.08)
  const h4 = move(closes, 16, 0.15)

  // Pressão: volume dos candles de alta vs baixa nas últimas 4h (proxy PAXG)
  const last4h = xau15.slice(-16)
  let buyVol = 0
  let sellVol = 0
  for (const c of last4h) {
    if (c.close > c.open) buyVol += c.vol
    else if (c.close < c.open) sellVol += c.vol
  }
  const totVol = buyVol + sellVol
  const buyRatio4h = totVol > 0 ? buyVol / totVol : 0.5
  const volumeTone = buyRatio4h >= 0.55 ? 'comprador' : buyRatio4h <= 0.45 ? 'vendedor' : 'equilibrado'

  // Dólar agora: EUR/USD subindo = dólar caindo (deadbands menores — FX anda menos)
  const eurCloses = eur15.map(c => c.close)
  const eurH1 = move(eurCloses, 4, 0.04)
  const eurH4 = move(eurCloses, 16, 0.08)
  const flip = (d: Dir): Dir => (d === 'up' ? 'down' : d === 'down' ? 'up' : 'flat')
  const dollarH1 = flip(eurH1.dir)
  const dollarH4 = flip(eurH4.dir)

  const goldDir = h4.dir !== 'flat' ? h4.dir : h1.dir
  const usdDir = dollarH4 !== 'flat' ? dollarH4 : dollarH1
  let confluence: string
  if (goldDir === 'up' && usdDir === 'down')
    confluence = 'DXY caindo enquanto o ouro sobe — confluência A FAVOR da alta.'
  else if (goldDir === 'down' && usdDir === 'up')
    confluence = 'DXY subindo enquanto o ouro cai — confluência A FAVOR da baixa.'
  else if (goldDir === 'up' && usdDir === 'up')
    confluence = 'Ouro subindo MESMO com dólar forte — compra estrutural, sinal de força do ouro.'
  else if (goldDir === 'down' && usdDir === 'down')
    confluence = 'Ouro caindo mesmo com dólar fraco — fraqueza própria do ouro, cuidado com compras.'
  else confluence = 'Sem confluência clara com o DXY nesta janela — deixe o gráfico decidir.'

  const tone =
    volumeTone === 'comprador' && goldDir !== 'down'
      ? 'mais COMPRADOR'
      : volumeTone === 'vendedor' && goldDir !== 'up'
        ? 'mais VENDEDOR'
        : volumeTone === 'equilibrado'
          ? 'dividido'
          : `com fluxo ${volumeTone} contra a direção — atenção`
  const headline = `Ouro ${tone} agora: 4h ${dirWord(h4.dir, 'subindo', 'caindo', 'de lado')} (${h4.pct >= 0 ? '+' : ''}${h4.pct.toFixed(2)}%), 1h ${dirWord(h1.dir, 'subindo', 'caindo', 'de lado')} (${h1.pct >= 0 ? '+' : ''}${h1.pct.toFixed(2)}%), ${Math.round(buyRatio4h * 100)}% do volume comprador (PAXG 4h); dólar ${dirWord(usdDir, 'subindo', 'caindo', 'de lado')}.`

  return { price, m15, h1, h4, buyRatio4h, volumeTone, dollarH1, dollarH4, headline, confluence }
}

// ── Liquidez no 30m: fundos/topos iguais onde os stops se acumulam ────────

export interface LiquidityPool {
  price: number
  side: 'above' | 'below'
  touches: number
  kind: string // "fundo duplo", "topo do período"…
  distPct: number // distância absoluta até o spot, em %
}

export interface LiquidityMap {
  pools: LiquidityPool[]
  narrative: string | null
}

export function resample30m(c15: ICandle[]): ICandle[] {
  const byBucket = new Map<number, ICandle>()
  for (const c of c15) {
    const b = Math.floor(c.t / 1800) * 1800
    const cur = byBucket.get(b)
    if (!cur) byBucket.set(b, { ...c, t: b })
    else {
      cur.high = Math.max(cur.high, c.high)
      cur.low = Math.min(cur.low, c.low)
      cur.close = c.close // candles chegam em ordem ascendente
      cur.vol += c.vol
    }
  }
  return [...byBucket.values()].sort((a, b) => a.t - b.t)
}

interface Swing {
  price: number
  idx: number
}

function findSwings(c30: ICandle[], k = 2): { highs: Swing[]; lows: Swing[] } {
  const highs: Swing[] = []
  const lows: Swing[] = []
  for (let i = k; i < c30.length - k; i++) {
    let isHigh = true
    let isLow = true
    for (let j = 1; j <= k; j++) {
      if (c30[i].high < c30[i - j].high || c30[i].high < c30[i + j].high) isHigh = false
      if (c30[i].low > c30[i - j].low || c30[i].low > c30[i + j].low) isLow = false
    }
    if (isHigh) highs.push({ price: c30[i].high, idx: i })
    if (isLow) lows.push({ price: c30[i].low, idx: i })
  }
  return { highs, lows }
}

function cluster(swings: Swing[], tol: number): { price: number; touches: number }[] {
  const sorted = [...swings].sort((a, b) => a.price - b.price)
  const out: { price: number; touches: number }[] = []
  for (const s of sorted) {
    const last = out[out.length - 1]
    if (last && Math.abs(s.price - last.price) <= tol) {
      last.price = (last.price * last.touches + s.price) / (last.touches + 1)
      last.touches++
    } else {
      out.push({ price: s.price, touches: 1 })
    }
  }
  return out
}

function kindLabel(base: 'fundo' | 'topo', touches: number): string {
  if (touches >= 3) return `${base} triplo (${touches} toques)`
  if (touches === 2) return `${base} duplo`
  return `${base} local`
}

const MAX_POOLS_PER_SIDE = 3

export function computeLiquidity(c15: ICandle[], spot: number): LiquidityMap {
  const c30 = resample30m(c15)
  if (c30.length < 10) return { pools: [], narrative: null }
  const tol = spot * 0.0008 // ~US$3,4 a 4.200 — "fundos iguais" na prática
  const { highs, lows } = findSwings(c30)

  const periodHigh = Math.max(...c30.map(c => c.high))
  const periodLow = Math.min(...c30.map(c => c.low))

  const pools: LiquidityPool[] = []
  for (const cl of cluster(lows, tol)) {
    if (cl.price >= spot) continue // fundo já rompido não guarda stop abaixo do preço
    const isPeriodLow = Math.abs(cl.price - periodLow) <= tol
    if (cl.touches < 2 && !isPeriodLow) continue
    pools.push({
      price: cl.price,
      side: 'below',
      touches: cl.touches,
      kind: isPeriodLow ? `fundo do período (${cl.touches} toque${cl.touches > 1 ? 's' : ''})` : kindLabel('fundo', cl.touches),
      distPct: ((spot - cl.price) / spot) * 100,
    })
  }
  for (const cl of cluster(highs, tol)) {
    if (cl.price <= spot) continue
    const isPeriodHigh = Math.abs(cl.price - periodHigh) <= tol
    if (cl.touches < 2 && !isPeriodHigh) continue
    pools.push({
      price: cl.price,
      side: 'above',
      touches: cl.touches,
      kind: isPeriodHigh ? `topo do período (${cl.touches} toque${cl.touches > 1 ? 's' : ''})` : kindLabel('topo', cl.touches),
      distPct: ((cl.price - spot) / spot) * 100,
    })
  }

  pools.sort((a, b) => a.distPct - b.distPct)
  const below = pools.filter(p => p.side === 'below').slice(0, MAX_POOLS_PER_SIDE)
  const above = pools.filter(p => p.side === 'above').slice(0, MAX_POOLS_PER_SIDE)
  const final = [...above.reverse(), ...below] // de cima pra baixo, como no gráfico

  // Cenário: pra onde o preço está indo buscar liquidez?
  const closes = c15.map(c => c.close)
  const h1 = move(closes, Math.min(4, closes.length - 1), 0.08)
  const nearBelow = below[0]
  const nearAbove = above[0]
  let narrative: string | null = null
  const near = [nearBelow, nearAbove].filter(Boolean).find(p => (p as LiquidityPool).distPct <= 0.15) as
    | LiquidityPool
    | undefined
  if (near) {
    narrative = `Preço colado na liquidez de $${near.price.toFixed(0)} (${near.kind}) — espere a reação: sweep e reversão, ou rompimento com volume.`
  } else if (h1.dir === 'down' && nearBelow && nearBelow.distPct <= 0.6) {
    narrative = `Cenário: preço caindo em direção à liquidez do ${nearBelow.kind} em $${nearBelow.price.toFixed(0)} (${nearBelow.distPct.toFixed(2)}% abaixo) — alvo provável antes de qualquer reação.`
  } else if (h1.dir === 'up' && nearAbove && nearAbove.distPct <= 0.6) {
    narrative = `Cenário: preço subindo em direção à liquidez do ${nearAbove.kind} em $${nearAbove.price.toFixed(0)} (${nearAbove.distPct.toFixed(2)}% acima) — alvo provável antes de qualquer reação.`
  }

  return { pools: final, narrative }
}
