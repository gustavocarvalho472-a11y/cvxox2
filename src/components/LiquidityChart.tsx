import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CandlestickSeries,
  HistogramSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
} from 'lightweight-charts'
import type { SeriesMarker, UTCTimestamp } from 'lightweight-charts'
import { computeAggression, computeLiquidity, fetchGold15m, resample30m } from '../lib/intraday'
import type { ICandle, LiquidityPool } from '../lib/intraday'
import { computeVolumeProfile } from '../lib/volumeProfile'
import { VolumeProfilePrimitive } from './volumeProfilePrimitive'

// Nosso próprio gráfico de 30m (lightweight-charts, roda 100% no app):
// candles PAXG ≈ XAUUSD, volume compra/venda embaixo, perfil de volume,
// bolhas de agressão compradora/vendedora e as linhas de liquidez
// desenhadas EM CIMA do gráfico — o que o widget embutido não permite.

const BRT_SHIFT = 3 * 3600 // BRT = UTC-3 fixo; desloca o eixo p/ horário de Brasília
const VISIBLE_BARS = 60 // ~30h de contexto na abertura; dá pra arrastar p/ trás

// Cache simples p/ não rebaixar a Coinbase a cada troca de aba
let cache: { at: number; c15: ICandle[] } | null = null
const CACHE_MS = 5 * 60_000

async function getC15(): Promise<ICandle[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.c15
  const c15 = await fetchGold15m()
  cache = { at: Date.now(), c15 }
  return c15
}

interface Props {
  pools?: LiquidityPool[]
  height?: number
}

export function LiquidityChart({ pools, height = 280 }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [c15, setC15] = useState<ICandle[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    getC15()
      .then(data => {
        if (alive) setC15(data)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const candles = useMemo(() => (c15 ? resample30m(c15) : null), [c15])

  // Liquidez: usa os pools do viés se existirem; senão o gráfico calcula sozinho
  const effectivePools = useMemo(() => {
    if (pools && pools.length > 0) return pools
    if (!c15 || c15.length === 0) return []
    const last = c15[c15.length - 1].close
    return computeLiquidity(c15, last).pools
  }, [pools, c15])

  // redesenha quando os pools mudam (novo cálculo do viés), sem refetch
  const poolsKey = effectivePools.map(p => `${p.side}${p.price.toFixed(1)}`).join(',')

  useEffect(() => {
    const box = boxRef.current
    if (!box || !candles || candles.length === 0) return

    const chart = createChart(box, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: '#a1a1aa',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { horzLine: { labelBackgroundColor: '#3f3f46' }, vertLine: { labelBackgroundColor: '#3f3f46' } },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      borderVisible: false,
    })
    candleSeries.setData(
      candles.map(c => ({
        time: (c.t - BRT_SHIFT) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: '',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    volumeSeries.setData(
      candles.map(c => ({
        time: (c.t - BRT_SHIFT) as UTCTimestamp,
        value: c.vol,
        color: c.close >= c.open ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)',
      })),
    )

    // Perfil de volume (range dos ~3 dias carregados) + POC no eixo
    const profile = computeVolumeProfile(candles)
    if (profile) {
      candleSeries.attachPrimitive(new VolumeProfilePrimitive(profile))
      candleSeries.createPriceLine({
        price: profile.poc,
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'POC',
      })
    }

    for (const pool of effectivePools) {
      candleSeries.createPriceLine({
        price: pool.price,
        color: pool.side === 'above' ? '#34d399' : '#f87171',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `💧 ${pool.side === 'above' ? 'topo' : 'fundo'} ${pool.touches}x`,
      })
    }

    // Bolhas de agressão: volume anômalo com direção definida
    // (azul embaixo = agressão compradora; vermelho em cima = vendedora)
    const marks = computeAggression(candles)
    if (marks.length > 0) {
      const markers: SeriesMarker<UTCTimestamp>[] = marks.map(m => ({
        time: (m.t - BRT_SHIFT) as UTCTimestamp,
        position: m.side === 'buy' ? 'belowBar' : 'aboveBar',
        shape: 'circle',
        color: m.side === 'buy' ? 'rgba(59,130,246,0.8)' : 'rgba(239,68,68,0.8)',
        size: Math.min(3, Math.max(1, Math.round(m.strength - 0.8))),
      }))
      createSeriesMarkers(candleSeries, markers)
    }

    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, candles.length - VISIBLE_BARS),
      to: candles.length + 2,
    })

    return () => chart.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, poolsKey])

  if (failed)
    return (
      <p className="px-3 py-6 text-center text-xs text-zinc-500">
        Não deu pra carregar os candles agora (Coinbase). Tente de novo em instantes.
      </p>
    )

  return (
    <div>
      <div ref={boxRef} style={{ height }} />
      <p className="px-2 pb-1 pt-1.5 text-[10px] leading-snug text-zinc-600">
        PAXG ≈ XAUUSD (Coinbase) · 30min · horário de Brasília · linhas tracejadas = liquidez
        mapeada (topos/fundos expressivos e duplos) · 🔵 = agressão compradora, 🔴 = vendedora
        (volume ≥1,8× a média; bolha maior = mais forte) · barras laterais = perfil de volume por
        preço (azul = POC; faixa mais forte = área de valor 70%)
      </p>
    </div>
  )
}
