import type {
  AccountConfig,
  GoldBias,
  KeyLevel,
  MacroChecklistState,
  Trade,
} from '../types/trading'
import type { AccountState } from './ftmo'
import type { CorrelationResult, GoldPrice } from './marketData'
import { correlationRegime } from './marketData'
import type { EconEvent } from './calendar'
import { fmtBrt } from './calendar'
import { fmtSignedUsd, fmtUsd, phaseLabel, tradePnl } from './ftmo'
import { MACRO_DRIVERS, biasLabel } from '../data/macroDrivers'
import { SESSION_LABELS, currentSession } from '../data/sessions'

export const SYSTEM_PROMPT = `Você é o copiloto de trading de um trader brasileiro que opera exclusivamente XAUUSD (ouro) em uma conta FTMO. Sua função é dupla:

1. ANALISTA TÉCNICO-MACRO especialista em ouro:
- Smart Money Concepts (SMC): estrutura de mercado (BOS/CHoCH), order blocks, fair value gaps (FVG), liquidity sweeps/grabs, inducement, premium/discount, kill zones.
- Wyckoff: fases de acumulação/distribuição (A-E), spring, upthrust/UTAD, sign of strength/weakness, effort vs result no volume.
- Supply & Demand: zonas de origem de movimento impulsivo, zonas frescas vs testadas, flip zones.
- Sessões do ouro: acumulação asiática, Judas swing/sweep de Londres, expansão em NY, overlap Londres+NY como janela de maior volume, fixing de Londres.
- Macro do ouro em ordem de importância: (1) juros reais americanos/US10Y — correlação inversa mais forte; (2) DXY; (3) sentimento de risco/VIX; (4) geopolítica (prêmio evapora sem escalada); (5) petróleo como proxy de inflação; pano de fundo: compras de bancos centrais, fluxos de ETF, posicionamento COT.
- Eventos que mais movem o ouro: NFP, CPI, FOMC. Perto deles, spread e slippage explodem.

2. RISK MANAGER DE MESA — esta função tem PRIORIDADE sobre a análise:
- Regras FTMO: perda máxima diária 5% do saldo inicial, perda máxima total 10%, meta Fase 1 = 10%, Fase 2 = 5%. Violou uma vez, perdeu a conta.
- Você recebe o estado REAL da conta do trader em cada mensagem (fase, P&L do dia, limites restantes, trades já feitos). USE esses números.
- NUNCA valide um trade que viole limites ou que arrisque fração perigosa do limite diário restante. Diga não com clareza e explique o número.
- Desafie entradas sem confluência: pergunte onde está a invalidação, qual liquidez foi tomada, qual o contexto de sessão e macro.
- Detecte padrões de indisciplina: revenge trading após perdas, overtrading, aumento de risco para "recuperar", trade contra o viés sem justificativa. Nomeie o padrão quando vir.
- Passar o challenge é sobreviver + consistência, não acertar trades heroicos. Reforce isso.

QUANDO RECEBER UM PRINT DE GRÁFICO:
- Identifique: timeframe, tendência/estrutura (últimos BOS/CHoCH), zonas de supply/demand ou order blocks visíveis, FVGs, liquidez óbvia (equal highs/lows, máximas/mínimas de sessão), e onde o preço está no range (premium/discount).
- Dê cenários condicionais ("se varrer X e reagir, então..."), NUNCA previsão categórica.
- Se a imagem não tiver informação suficiente (sem timeframe visível, poucos candles), peça o que falta.

REGRAS DE HONESTIDADE:
- Você NÃO prevê preço. Ofereça leitura de probabilidade e confluência, nunca certeza.
- Não invente dados de mercado. Se precisar de preço/notícia atual, use a busca web.
- Se o trader estiver claramente em tilt (linguagem emocional + perdas no dia), a resposta certa é recomendar parar, não analisar mais um setup.

FORMATO:
- Responda em português brasileiro, direto e objetivo, como um head de mesa experiente: respeitoso, mas sem paternalismo e sem enrolação.
- Use markdown leve (negrito, listas curtas). Nada de disclaimers genéricos repetitivos — a gestão de risco JÁ É o seu papel.
- Termine análises de trade com um veredito claro: ✅ dentro das regras / ⚠️ possível mas com ressalvas / ❌ não faça.`

export interface AgentContext {
  account: AccountConfig
  state: AccountState
  checklist: MacroChecklistState | null
  bias: GoldBias
  biasFilled: number
  levels: KeyLevel[]
  trades: Trade[]
  goldPrice: GoldPrice | null
  econEvents: EconEvent[] // relevantes nas próximas 24h
  correlation: CorrelationResult | null
}

export function buildContextBlock(ctx: AgentContext): string {
  const { account, state, checklist, bias, biasFilled, levels, goldPrice, econEvents, correlation } = ctx
  const session = currentSession()
  const lines: string[] = []

  if (goldPrice) {
    lines.push(
      `PREÇO XAUUSD AGORA: $${goldPrice.price.toFixed(2)} (spot via gold-api, ${new Date(goldPrice.updatedAt).toLocaleTimeString('pt-BR')})`,
    )
    lines.push('')
  }
  lines.push(`ESTADO ATUAL DA CONTA (${new Date().toLocaleString('pt-BR')}):`)
  lines.push(`- ${phaseLabel(account.phase)} | conta $${fmtUsd(account.size)} | saldo $${fmtUsd(state.balance)}`)
  if (state.target > 0) {
    lines.push(`- Meta da fase: $${fmtUsd(state.target)} | progresso: ${fmtSignedUsd(state.phasePnl)} (${Math.round(state.targetProgress * 100)}%)`)
  }
  lines.push(`- P&L de hoje: ${fmtSignedUsd(state.dayPnl)} | perda diária restante: $${fmtUsd(state.dailyLossLeft)} de $${fmtUsd(state.maxDailyLoss)}`)
  lines.push(`- Drawdown total restante: $${fmtUsd(state.totalLossLeft)} de $${fmtUsd(state.maxTotalLoss)}`)
  lines.push(`- Risco padrão por trade: $${fmtUsd(state.riskPerTradeUsd)} (${account.riskPerTradePct}%) | cabem ~${state.tradesLeftOnRisk} trades no limite`)
  lines.push(`- Trades hoje: ${state.dayTrades.length} de ${account.maxTradesPerDay} (máx)`)
  if (state.dayTrades.length > 0) {
    const results = state.dayTrades.map(t => `${t.direction === 'long' ? 'L' : 'S'} ${t.resultR > 0 ? '+' : ''}${t.resultR}R`).join(', ')
    lines.push(`- Resultados de hoje: ${results}`)
  }
  lines.push(`- Sessão atual: ${session.name} (${session.hoursBrt} BRT)`)

  lines.push('')
  if (checklist && biasFilled > 0) {
    lines.push(`VIÉS MACRO DO DIA (checklist do trader): ${biasLabel(bias)}`)
    for (const driver of MACRO_DRIVERS) {
      const optId = checklist.readings[driver.id]
      const opt = driver.options.find(o => o.id === optId)
      if (opt) lines.push(`- ${driver.name}: ${opt.label}`)
    }
    if (checklist.note) lines.push(`- Nota do trader: ${checklist.note}`)
  } else {
    lines.push('VIÉS MACRO DO DIA: checklist NÃO preenchido — o trader está sem plano macro hoje. Aponte isso se ele pedir validação de trade.')
  }

  if (correlation) {
    const regime = correlationRegime(correlation.corr)
    lines.push('')
    lines.push(
      `CORRELAÇÃO XAU × DÓLAR (${correlation.days}d, proxy EUR/USD invertido): ${correlation.corr > 0 ? '+' : ''}${correlation.corr.toFixed(2)} — ${regime.label}. ${regime.detail}`,
    )
  }

  if (econEvents.length > 0) {
    lines.push('')
    lines.push('CALENDÁRIO ECONÔMICO — PRÓXIMAS 24H (horários BRT):')
    for (const e of econEvents.slice(0, 10)) {
      const extra = [e.forecast && `prev. ${e.forecast}`, e.previous && `ant. ${e.previous}`]
        .filter(Boolean)
        .join(', ')
      lines.push(
        `- ${fmtBrt(e.date, true)} — ${e.title} (${e.country}, impacto ${e.impact === 'High' ? 'ALTO' : 'médio'}${extra ? `; ${extra}` : ''})`,
      )
    }
  }

  if (levels.length > 0) {
    lines.push('')
    lines.push('NÍVEIS-CHAVE MARCADOS PELO TRADER:')
    for (const level of [...levels].sort((a, b) => b.price - a.price)) {
      lines.push(`- ${level.price} — ${level.type}${level.note ? ` (${level.note})` : ''}`)
    }
  }

  return lines.join('\n')
}

export function buildDayReviewPrompt(dayTrades: Trade[]): string {
  const tradeLines = dayTrades.map(t => {
    return `- ${t.direction === 'long' ? 'COMPRA' : 'VENDA'} | sessão ${SESSION_LABELS[t.session]} | setups: ${t.setups.join(', ') || '—'} | risco $${fmtUsd(t.riskUsd)} | resultado ${t.resultR > 0 ? '+' : ''}${t.resultR}R (${fmtSignedUsd(tradePnl(t))}) | seguiu o plano: ${t.followedPlan ? 'sim' : 'NÃO'}${t.notes ? ` | notas: ${t.notes}` : ''}`
  })
  return `Faça o review da minha sessão de hoje como risk manager. Trades do dia:\n${tradeLines.join('\n')}\n\nAvalie: disciplina vs meu viés macro e plano, qualidade das entradas (pelo que descrevi), padrões perigosos (revenge, overtrading, risco crescente), e me dê no máximo 3 pontos de ação concretos para amanhã. Seja direto.`
}

export const QUICK_PROMPTS = [
  {
    label: 'Resumo macro do dia',
    prompt:
      'Busque as notícias e o cenário de agora e me dê o briefing do ouro para hoje: DXY, yields, sentimento de risco, geopolítica, eventos do calendário nas próximas 24h com horário (BRT), e o que isso sugere para o XAUUSD hoje. Termine com os 2-3 riscos que podem invalidar essa leitura.',
  },
  {
    label: 'Analisar print do gráfico',
    prompt:
      'Analise este gráfico: estrutura (BOS/CHoCH), zonas de supply/demand e order blocks, FVGs, onde está a liquidez óbvia, premium/discount do range, e cenários condicionais de compra e venda com invalidação clara.',
    needsImage: true,
  },
  {
    label: 'Validar risco de um setup',
    prompt:
      'Tenho um setup em mente. Antes de eu detalhar: com base no estado atual da minha conta (acima), quanto posso arriscar neste trade e o que você precisa saber para validar a entrada?',
  },
] as const
