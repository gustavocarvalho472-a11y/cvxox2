import { TradingViewWidget } from './TradingViewWidget'

const EMBED = 'https://s3.tradingview.com/external-embedding'

export function MiniChart({ symbol, height = 220 }: { symbol: string; height?: number }) {
  return (
    <TradingViewWidget
      src={`${EMBED}/embed-widget-mini-symbol-overview.js`}
      height={height}
      config={{
        symbol,
        width: '100%',
        height,
        locale: 'br',
        dateRange: '1M',
        colorTheme: 'dark',
        isTransparent: true,
        autosize: true,
        largeChartUrl: '',
      }}
    />
  )
}

export function AdvancedChart({ height = '100%' }: { height?: number | string }) {
  return (
    <TradingViewWidget
      src={`${EMBED}/embed-widget-advanced-chart.js`}
      height={height}
      config={{
        autosize: true,
        symbol: 'OANDA:XAUUSD',
        interval: '15',
        timezone: 'America/Sao_Paulo',
        theme: 'dark',
        style: '1',
        locale: 'br',
        withdateranges: true,
        allow_symbol_change: true,
        details: false,
        hotlist: false,
        calendar: false,
        studies: ['STD;Visible%1Average%1Price'],
        support_host: 'https://www.tradingview.com',
      }}
    />
  )
}

export function EconomicCalendar({ height = 420 }: { height?: number }) {
  return (
    <TradingViewWidget
      src={`${EMBED}/embed-widget-events.js`}
      height={height}
      config={{
        colorTheme: 'dark',
        isTransparent: true,
        width: '100%',
        height,
        locale: 'br',
        importanceFilter: '0,1', // alto e médio impacto
        countryFilter: 'us,eu,cn',
      }}
    />
  )
}
