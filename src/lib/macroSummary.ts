import type { AutoBiasResult } from './autoBias'
import type { EconEvent } from './calendar'
import { fmtBrt } from './calendar'
import { biasLabel } from '../data/macroDrivers'

// Resumo macro em linguagem natural, gerado no próprio app (sem chave, sem chat).
// Aparece no card principal da Pré-Sessão logo depois de calcular o viés.

export interface EventReading {
  key: string
  timeBrt: string
  title: string
  forecast: string
  line: string // interpretação direcional: acima/abaixo do previsto → ouro sobe/desce
}

export interface MacroSummary {
  headline: string
  dollarLine: string
  correlationLine: string
  eventsIntro: string | null
  eventReadings: EventReading[]
}

type EventKind = 'usd_direct' | 'usd_inverted' | 'fed_tone' | 'eur' | 'cny' | 'other'

// Dado USD ACIMA do previsto = economia/inflação forte = dólar sobe = ouro tende a CAIR.
// Exceções: desemprego/pedidos de seguro (acima = economia fraca = ouro SOBE)
// e eventos do Fed, onde o que importa é o tom (hawkish/dovish), não um número.
function classifyEvent(e: EconEvent): EventKind {
  const t = e.title.toLowerCase()
  if (e.country === 'USD') {
    if (/fomc|fed chair|powell|federal funds|rate decision|press conference|beige book|monetary policy/.test(t))
      return 'fed_tone'
    if (/unemployment|jobless|claims/.test(t)) return 'usd_inverted'
    return 'usd_direct'
  }
  if (e.country === 'EUR') return 'eur'
  if (e.country === 'CNY') return 'cny'
  return 'other'
}

function directionLine(kind: EventKind): string {
  switch (kind) {
    case 'usd_direct':
      return 'se vier ACIMA do previsto → dólar sobe → ouro tende a CAIR; abaixo → ouro tende a SUBIR'
    case 'usd_inverted':
      return 'se vier ACIMA do previsto (economia fraca) → dólar cai → ouro tende a SUBIR; abaixo → ouro tende a CAIR'
    case 'fed_tone':
      return 'depende do TOM: mais duro (hawkish) → ouro tende a CAIR; mais suave (dovish) → ouro tende a SUBIR'
    case 'eur':
      return 'dado forte da zona do euro enfraquece o dólar → ouro tende a SUBIR; fraco → ouro tende a CAIR'
    case 'cny':
      return 'China forte = mais demanda física por ouro; fraca = aversão a risco — reação mista, espere o mercado digerir'
    default:
      return 'alto impacto — espere a reação do mercado antes de entrar'
  }
}

const MAX_EVENTS_IN_SUMMARY = 3

// "em 45 min" / "em 3h20" / "amanhã às 09:30"
function countdownTxt(iso: string, now: Date): string {
  const mins = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000)
  if (mins < 60) return `em ${mins} min`
  const todayBrt = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const evDayBrt = new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const hhmm = fmtBrt(iso)
  if (evDayBrt !== todayBrt) return `amanhã às ${hhmm}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `em ${h}h${m > 0 ? String(m).padStart(2, '0') : ''} (${hhmm})`
}

export function buildMacroSummary(
  result: AutoBiasResult,
  next24h: EconEvent[],
  now = new Date(),
  activeEvent: EconEvent | null = null,
): MacroSummary {
  const label = biasLabel(result.bias)
  const scoreTxt = `${result.score > 0 ? '+' : ''}${result.score}/${result.maxScore}`
  const headline =
    result.bias === 'bullish'
      ? `Viés ${label} (score ${scoreTxt}) — os indicadores apontam ouro para CIMA.`
      : result.bias === 'bearish'
        ? `Viés ${label} (score ${scoreTxt}) — os indicadores apontam ouro para BAIXO.`
        : `Viés ${label} (score ${scoreTxt}) — sem direção clara; espere confirmação no gráfico.`

  const dolar = result.components.find(c => c.id === 'dolar')
  const dollarLine =
    dolar?.signal === 'bullish'
      ? 'Dólar fraco (proxy do DXY abaixo da média) — vento a FAVOR do ouro.'
      : dolar?.signal === 'bearish'
        ? 'Dólar forte (proxy do DXY acima da média) — vento CONTRA o ouro.'
        : 'Dólar de lado — o DXY não está empurrando o ouro agora.'

  const corr = result.correlation.corr
  const corrTxt = `${corr >= 0 ? '+' : ''}${corr.toFixed(2)}`
  const correlationLine =
    corr <= -0.5
      ? `Correlação XAU×dólar clássica (${corrTxt}): dólar caindo tende a levar o ouro para cima (e vice-versa).`
      : corr >= 0.2
        ? `Ouro DESACOPLADO do dólar (${corrTxt}): demanda estrutural comprando — siga o fluxo do próprio ouro, não o DXY.`
        : `Correlação fraca (${corrTxt}): o dólar não está mandando no ouro nesta janela — priorize o técnico.`

  // Notícia é segunda etapa: primeiro diga QUANDO ela chega — até lá, o técnico manda
  const future = next24h.filter(e => new Date(e.date).getTime() > now.getTime())
  const upcoming = future.slice(0, MAX_EVENTS_IN_SUMMARY)
  const eventReadings: EventReading[] = upcoming.map((e, i) => ({
    key: `${e.date}_${i}`,
    timeBrt: fmtBrt(e.date, true),
    title: e.title,
    forecast: e.forecast,
    line: directionLine(classifyEvent(e)),
  }))

  const eventsIntro = activeEvent
    ? `🔴 ${activeEvent.title} está na janela AGORA (${fmtBrt(activeEvent.date)}) — spread e violência de preço; fique fora até o mercado digerir.`
    : future.length > 0
      ? `Sem notícia agora — a próxima é ${countdownTxt(future[0].date, now)}. Até lá, o técnico manda. Quando sair:`
      : null

  return { headline, dollarLine, correlationLine, eventsIntro, eventReadings }
}
