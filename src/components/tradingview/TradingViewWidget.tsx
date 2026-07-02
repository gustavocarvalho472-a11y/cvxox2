import { memo, useEffect, useRef } from 'react'

interface Props {
  src: string
  config: Record<string, unknown>
  height?: number | string
  className?: string
}

// Widgets de embed do TradingView: um <script> com a config em JSON no corpo.
// Recriado sempre que src/config mudam.
function TradingViewWidgetBase({ src, config, height = '100%', className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const configJson = JSON.stringify(config)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''

    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    widget.style.height = '100%'
    container.appendChild(widget)

    const script = document.createElement('script')
    script.src = src
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = configJson
    container.appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [src, configJson])

  return (
    <div
      ref={containerRef}
      className={`tradingview-widget-container ${className ?? ''}`}
      style={{ height, width: '100%' }}
    />
  )
}

export const TradingViewWidget = memo(TradingViewWidgetBase)
