import type { GoldBias, MacroChecklistState } from '../types/trading'

export interface DriverOption {
  id: string
  label: string
  goldImpact: GoldBias
}

export interface MacroDriver {
  id: string
  name: string
  question: string
  options: DriverOption[]
  why: string
  tvSymbol?: string // símbolo p/ mini-chart TradingView
  links?: { label: string; url: string }[]
}

export const MACRO_DRIVERS: MacroDriver[] = [
  {
    id: 'dxy',
    name: 'DXY — Índice do Dólar',
    question: 'Como está o DXY agora?',
    tvSymbol: 'TVC:DXY',
    options: [
      { id: 'down', label: 'Caindo / fraco', goldImpact: 'bullish' },
      { id: 'up', label: 'Subindo / forte', goldImpact: 'bearish' },
      { id: 'flat', label: 'Lateral', goldImpact: 'neutral' },
    ],
    why: 'Ouro é cotado em dólar: dólar fraco torna o ouro mais barato para o resto do mundo → demanda sobe. Correlação inversa clássica, especialmente em tendências fortes do DXY.',
  },
  {
    id: 'yields',
    name: 'US10Y — Juros americanos (proxy de juros reais)',
    question: 'Os yields de 10 anos estão…',
    tvSymbol: 'TVC:US10Y',
    options: [
      { id: 'down', label: 'Caindo', goldImpact: 'bullish' },
      { id: 'up', label: 'Subindo', goldImpact: 'bearish' },
      { id: 'flat', label: 'Lateral', goldImpact: 'neutral' },
    ],
    why: 'O ouro não paga juros. Quando os juros REAIS (nominal − inflação) sobem, segurar ouro custa caro em custo de oportunidade. É historicamente a correlação inversa mais forte do ouro — mais que o DXY.',
    links: [
      { label: 'Juros reais (FRED — TIPS 10Y)', url: 'https://fred.stlouisfed.org/series/DFII10' },
      { label: 'Expectativa do Fed (FedWatch)', url: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html' },
    ],
  },
  {
    id: 'risk',
    name: 'Sentimento de risco — VIX / bolsas',
    question: 'O mercado está…',
    tvSymbol: 'TVC:VIX',
    options: [
      { id: 'riskoff', label: 'Risk-off (medo, VIX alto)', goldImpact: 'bullish' },
      { id: 'riskon', label: 'Risk-on (apetite, bolsas subindo)', goldImpact: 'bearish' },
      { id: 'mixed', label: 'Misto / indefinido', goldImpact: 'neutral' },
    ],
    why: 'Em pânico e aversão a risco, o ouro é o hedge clássico. Atenção: em crashes de liquidez o ouro pode cair junto no primeiro momento (venda forçada para cobrir margem) e subir depois.',
  },
  {
    id: 'oil',
    name: 'Petróleo (WTI) — proxy de inflação',
    question: 'O petróleo está…',
    tvSymbol: 'TVC:USOIL',
    options: [
      { id: 'up', label: 'Subindo forte', goldImpact: 'bullish' },
      { id: 'down', label: 'Caindo', goldImpact: 'bearish' },
      { id: 'flat', label: 'Estável', goldImpact: 'neutral' },
    ],
    why: 'Petróleo caro pressiona inflação → mercado espera juros altos por mais tempo (ruim p/ ouro no curto prazo), MAS inflação persistente sustenta o ouro como reserva de valor no médio prazo. Use como leitura de contexto, não de gatilho.',
  },
  {
    id: 'geo',
    name: 'Geopolítica — guerras e tensões',
    question: 'O cenário geopolítico hoje está…',
    options: [
      { id: 'escalating', label: 'Escalando (novo conflito/ataque)', goldImpact: 'bullish' },
      { id: 'calm', label: 'Estável / desescalando', goldImpact: 'bearish' },
      { id: 'background', label: 'Tenso mas sem novidade', goldImpact: 'neutral' },
    ],
    why: 'Choques geopolíticos geram spikes de compra de ouro (flight to safety). Cuidado: o prêmio geopolítico evapora rápido quando não há escalada — spikes de manchete são frequentemente revertidos.',
  },
]

export interface StructuralDriver {
  name: string
  detail: string
  links: { label: string; url: string }[]
}

// Drivers estruturais: não entram no checklist diário, mas definem o pano de fundo
export const STRUCTURAL_DRIVERS: StructuralDriver[] = [
  {
    name: 'Compras de bancos centrais',
    detail:
      'China, Índia, Turquia e outros vêm comprando ouro em ritmo recorde desde 2022 (desdolarização). É o suporte estrutural do bull market — explica por que quedas têm sido compradas.',
    links: [{ label: 'World Gold Council — demanda', url: 'https://www.gold.org/goldhub/data' }],
  },
  {
    name: 'Fluxos de ETF (GLD)',
    detail:
      'Entradas/saídas dos ETFs de ouro mostram o apetite do investidor ocidental. ETF entrando + banco central comprando = vento de cauda duplo.',
    links: [{ label: 'Holdings do GLD', url: 'https://www.spdrgoldshares.com/usa/' }],
  },
  {
    name: 'Posicionamento COT (futuros CME)',
    detail:
      'O relatório semanal Commitment of Traders mostra onde os grandes especuladores estão. Posição comprada extrema = risco de correção (mercado lotado); pessimismo extremo = combustível de alta.',
    links: [{ label: 'CFTC — COT Reports', url: 'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm' }],
  },
  {
    name: 'Calendário: NFP, CPI e FOMC',
    detail:
      'Os 3 eventos que mais movem o ouro. NFP (1ª sexta do mês), CPI (~dia 10-13) e FOMC (8x/ano). Nesses dias o ouro anda $30-60 em minutos — spread abre, stop curto vira loteria.',
    links: [{ label: 'FTMO — calendário econômico', url: 'https://ftmo.com/en/economic-calendar/' }],
  },
]

export function computeBias(
  checklist: MacroChecklistState | null,
): { bias: GoldBias; score: number; filled: number; total: number } {
  const total = MACRO_DRIVERS.length
  if (!checklist) return { bias: 'neutral', score: 0, filled: 0, total }

  let score = 0
  let filled = 0
  for (const driver of MACRO_DRIVERS) {
    const optionId = checklist.readings[driver.id]
    if (!optionId) continue
    const option = driver.options.find(o => o.id === optionId)
    if (!option) continue
    filled++
    if (option.goldImpact === 'bullish') score++
    if (option.goldImpact === 'bearish') score--
  }
  const bias: GoldBias = score >= 2 ? 'bullish' : score <= -2 ? 'bearish' : 'neutral'
  return { bias, score, filled, total }
}

export function biasLabel(bias: GoldBias): string {
  if (bias === 'bullish') return 'ALTISTA'
  if (bias === 'bearish') return 'BAIXISTA'
  return 'NEUTRO'
}
