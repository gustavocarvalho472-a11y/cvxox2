export type Impact = 'High' | 'Medium' | 'Low' | 'Holiday'

export interface EconEvent {
  title: string
  country: string
  date: string // ISO com offset
  impact: Impact
  forecast: string
  previous: string
}

const DIRECT_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
// O feed não envia CORS — proxies repassam com os headers corretos.
// Ordem: direto (caso passem a liberar CORS) → allorigins → corsproxy
const SOURCES = [
  DIRECT_URL,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(DIRECT_URL)}`,
  `https://corsproxy.io/?url=${encodeURIComponent(DIRECT_URL)}`,
]

const CACHE_KEY = 'gd_calendar_cache'
const CACHE_TTL_MS = 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 8000

interface CacheShape {
  fetchedAt: number
  events: EconEvent[]
}

function readCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CacheShape
  } catch {
    return null
  }
}

// AbortController manual (compatível com iOS antigo, sem AbortSignal.timeout)
async function fetchJson(url: string): Promise<EconEvent[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`calendário respondeu ${res.status}`)
    const data = (await res.json()) as EconEvent[]
    if (!Array.isArray(data)) throw new Error('formato inesperado do calendário')
    return data
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchWeekCalendar(force = false): Promise<EconEvent[]> {
  const cached = readCache()
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.events

  for (const url of SOURCES) {
    try {
      const events = await fetchJson(url)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), events }))
      } catch {
        // sem espaço no storage — segue sem cache
      }
      return events
    } catch {
      // tenta a próxima fonte
    }
  }

  // Todas as fontes falharam: melhor um calendário de algumas horas atrás do que nenhum
  if (cached) return cached.events
  throw new Error('calendário indisponível em todas as fontes')
}

// Eventos que mexem no ouro: USD alto/médio impacto + alto impacto de EUR/CNY
export function relevantForGold(events: EconEvent[]): EconEvent[] {
  return events
    .filter(e => {
      if (e.country === 'USD') return e.impact === 'High' || e.impact === 'Medium'
      return e.impact === 'High' && ['EUR', 'CNY'].includes(e.country)
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function fmtBrt(iso: string, withDay = false): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    ...(withDay ? { weekday: 'short', day: '2-digit', month: '2-digit' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface CalendarView {
  todayHigh: EconEvent[] // USD alto impacto de hoje (BRT)
  next24h: EconEvent[] // relevantes nas próximas 24h
  activeEvent: EconEvent | null // USD High começando em ≤30min ou iniciado há ≤15min
  minutesToActive: number | null
}

export function buildCalendarView(events: EconEvent[], now = new Date()): CalendarView {
  const relevant = relevantForGold(events)
  const todayBrt = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const todayHigh = relevant.filter(
    e =>
      e.country === 'USD' &&
      e.impact === 'High' &&
      new Date(e.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) === todayBrt,
  )

  const next24h = relevant.filter(e => {
    const t = new Date(e.date).getTime()
    return t >= now.getTime() - 15 * 60_000 && t <= now.getTime() + 24 * 3600_000
  })

  let activeEvent: EconEvent | null = null
  let minutesToActive: number | null = null
  for (const e of relevant) {
    if (e.impact !== 'High') continue
    const diffMin = (new Date(e.date).getTime() - now.getTime()) / 60_000
    if (diffMin >= -15 && diffMin <= 30) {
      activeEvent = e
      minutesToActive = Math.round(diffMin)
      break
    }
  }

  return { todayHigh, next24h, activeEvent, minutesToActive }
}
