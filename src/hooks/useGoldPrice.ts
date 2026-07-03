import { useEffect, useRef, useState } from 'react'
import { fetchGoldPrice } from '../lib/marketData'
import type { GoldPrice } from '../lib/marketData'

const POLL_MS = 60_000

export function useGoldPrice() {
  const [gold, setGold] = useState<GoldPrice | null>(null)
  const [failed, setFailed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      if (document.hidden) return
      try {
        const price = await fetchGoldPrice()
        if (!cancelled) {
          setGold(price)
          setFailed(false)
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void tick()
    timerRef.current = setInterval(tick, POLL_MS)
    const onVisible = () => {
      if (!document.hidden) void tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return { gold, failed }
}
