import type {
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts'
import type { VolumeProfile } from '../lib/volumeProfile'

// Primitive do lightweight-charts que desenha o perfil de volume como
// barras horizontais ancoradas na direita do gráfico. A própria lib chama
// updateAllViews/draw a cada frame, então zoom/arrasto reposicionam sozinhos.

interface MediaScope {
  context: CanvasRenderingContext2D
  mediaSize: { width: number; height: number }
}
interface RenderTarget {
  useMediaCoordinateSpace(cb: (scope: MediaScope) => void): void
}

interface Bar {
  yTop: number
  yBot: number
  rel: number // 0..1 vs bucket mais negociado
  inVA: boolean
  isPoc: boolean
}

const MAX_WIDTH_FRAC = 0.22 // barra maior ocupa até 22% da largura do painel

export class VolumeProfilePrimitive implements ISeriesPrimitive<Time> {
  private series: ISeriesApi<'Candlestick'> | null = null
  private bars: Bar[] = []
  private profile: VolumeProfile

  constructor(profile: VolumeProfile) {
    this.profile = profile
  }

  attached(param: SeriesAttachedParameter<Time>) {
    this.series = param.series as ISeriesApi<'Candlestick'>
    param.requestUpdate()
  }

  detached() {
    this.series = null
  }

  updateAllViews() {
    const series = this.series
    if (!series) {
      this.bars = []
      return
    }
    const { rows, step, maxVol, poc, vah, val } = this.profile
    const bars: Bar[] = []
    for (const row of rows) {
      if (row.vol <= 0) continue
      const yTop = series.priceToCoordinate(row.price + step / 2)
      const yBot = series.priceToCoordinate(row.price - step / 2)
      if (yTop === null || yBot === null) continue
      bars.push({
        yTop,
        yBot,
        rel: maxVol > 0 ? row.vol / maxVol : 0,
        inVA: row.price >= val && row.price <= vah,
        isPoc: row.price === poc,
      })
    }
    this.bars = bars
  }

  paneViews() {
    return [
      {
        zOrder: () => 'bottom' as const, // atrás dos candles
        renderer: () => ({
          draw: (target: RenderTarget) => {
            const bars = this.bars
            if (bars.length === 0) return
            target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
              const maxW = mediaSize.width * MAX_WIDTH_FRAC
              for (const b of bars) {
                const w = Math.max(1, b.rel * maxW)
                const h = Math.max(1, b.yBot - b.yTop - 1)
                ctx.fillStyle = b.isPoc
                  ? 'rgba(56,189,248,0.55)' // POC em azul-céu
                  : b.inVA
                    ? 'rgba(245,158,11,0.30)' // área de valor
                    : 'rgba(245,158,11,0.13)' // resto do perfil
                ctx.fillRect(mediaSize.width - w, b.yTop, w, h)
              }
            })
          },
        }),
      },
    ]
  }
}
