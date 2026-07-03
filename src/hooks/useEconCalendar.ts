import { useEffect, useMemo, useState } from 'react'
import { buildCalendarView, fetchWeekCalendar } from '../lib/calendar'
import type { EconEvent } from '../lib/calendar'

export function useEconCalendar() {
  const [events, setEvents] = useState<EconEvent[]>([])
  const [failed, setFailed] = useState(false)
  // Relógio de 1min para reavaliar "evento em <30min" sem novo fetch
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchWeekCalendar()
        if (!cancelled) {
          setEvents(data)
          setFailed(false)
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void load()
    const refetch = setInterval(load, 60 * 60 * 1000)
    const clock = setInterval(() => setTick(t => t + 1), 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(refetch)
      clearInterval(clock)
    }
  }, [])

  const view = useMemo(() => buildCalendarView(events), [events, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...view, failed }
}
