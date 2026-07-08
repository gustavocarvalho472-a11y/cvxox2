import type { ICandle } from './intraday'

// Perfil de volume por preço (estilo "Fixed Range Volume Profile"):
// distribui o volume de cada candle proporcionalmente pela faixa high–low
// e acumula em buckets de preço. POC = bucket mais negociado; área de
// valor = faixa em torno do POC que concentra 70% do volume.

export interface VolumeProfile {
  rows: { price: number; vol: number }[] // price = centro do bucket, ordem crescente
  step: number
  maxVol: number
  poc: number
  vah: number // topo da área de valor (70%)
  val: number // base da área de valor
  totalVol: number
}

export function computeVolumeProfile(candles: ICandle[], nBuckets = 40): VolumeProfile | null {
  if (candles.length === 0) return null
  let min = Infinity
  let max = -Infinity
  for (const c of candles) {
    if (c.low < min) min = c.low
    if (c.high > max) max = c.high
  }
  if (!(max > min)) return null

  const step = (max - min) / nBuckets
  const vols = new Array<number>(nBuckets).fill(0)
  let total = 0
  for (const c of candles) {
    const lo = Math.max(min, c.low)
    const hi = Math.min(max, c.high)
    const span = hi - lo
    total += c.vol
    const b0 = Math.min(nBuckets - 1, Math.max(0, Math.floor((lo - min) / step)))
    if (span <= 0) {
      vols[b0] += c.vol
      continue
    }
    const b1 = Math.min(nBuckets - 1, Math.max(0, Math.floor((hi - min) / step - 1e-9)))
    for (let b = b0; b <= b1; b++) {
      const bLo = min + b * step
      const overlap = Math.min(hi, bLo + step) - Math.max(lo, bLo)
      if (overlap > 0) vols[b] += c.vol * (overlap / span)
    }
  }

  let pocIdx = 0
  for (let b = 1; b < nBuckets; b++) if (vols[b] > vols[pocIdx]) pocIdx = b

  // Área de valor: expande a partir do POC pro lado com mais volume até somar 70%
  let acc = vols[pocIdx]
  let up = pocIdx + 1
  let dn = pocIdx - 1
  while (acc < total * 0.7 && (up < nBuckets || dn >= 0)) {
    const vUp = up < nBuckets ? vols[up] : -1
    const vDn = dn >= 0 ? vols[dn] : -1
    if (vUp >= vDn) {
      acc += vUp
      up++
    } else {
      acc += vDn
      dn--
    }
  }

  const center = (b: number) => min + (b + 0.5) * step
  return {
    rows: vols.map((v, b) => ({ price: center(b), vol: v })),
    step,
    maxVol: Math.max(...vols),
    poc: center(pocIdx),
    vah: center(Math.min(nBuckets - 1, up - 1)),
    val: center(Math.max(0, dn + 1)),
    totalVol: total,
  }
}
