import type { TradeSession } from '../types/trading'

export interface SessionInfo {
  id: TradeSession
  name: string
  hoursBrt: string
  behavior: string
}

// Horários aproximados em BRT (Brasília, UTC-3) — horário de verão dos EUA/Europa desloca ±1h
export const SESSIONS: SessionInfo[] = [
  {
    id: 'asia',
    name: 'Ásia (Tóquio/Sydney)',
    hoursBrt: '20h – 04h',
    behavior:
      'Range e acumulação. Volume baixo no ouro. A máxima/mínima da Ásia vira o alvo de liquidez preferido de Londres — marque esses níveis todo dia.',
  },
  {
    id: 'london',
    name: 'Londres',
    hoursBrt: '04h – 09h',
    behavior:
      'Abre com o "Judas swing": varre a liquidez de um lado do range asiático (sweep) e frequentemente reverte na direção real do dia. Onde as melhores entradas SMC do ouro aparecem.',
  },
  {
    id: 'ny',
    name: 'Nova York (+ overlap com Londres)',
    hoursBrt: '09h – 17h (overlap 09h–12h)',
    behavior:
      'Expansão e tendência. O overlap Londres+NY (09h–12h BRT) concentra o maior volume do dia no ouro — é quando saem os dados americanos (09h30/10h/11h BRT). Fixing de Londres ~11h BRT.',
  },
  {
    id: 'off',
    name: 'Fora de sessão',
    hoursBrt: '17h – 20h',
    behavior:
      'Fechamento NY até abertura da Ásia: spread largo, volume mínimo. Evite operar.',
  },
]

export function currentSession(now = new Date()): SessionInfo {
  // Converte para BRT (UTC-3)
  const brtHour = (now.getUTCHours() - 3 + 24) % 24
  if (brtHour >= 20 || brtHour < 4) return SESSIONS[0]
  if (brtHour >= 4 && brtHour < 9) return SESSIONS[1]
  if (brtHour >= 9 && brtHour < 17) return SESSIONS[2]
  return SESSIONS[3]
}

export const SESSION_LABELS: Record<TradeSession, string> = {
  asia: 'Ásia',
  london: 'Londres',
  ny: 'Nova York',
  off: 'Fora de sessão',
}
