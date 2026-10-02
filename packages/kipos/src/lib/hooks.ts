import { useEffect, useRef, useState } from 'react'

/** The time an action happens. Kept out of render so a render never reads the clock. */
export const actionTime = () => Date.now()
import type { Persistence } from 'object-studies-core'

/**
 * The current time, refreshed often enough for growth to look continuous at
 * the given speed: once a minute in real time, faster when sped up. Zero on
 * the server and on the first client render, so hydration matches; the clock
 * starts after mount. Stops while the tab is hidden.
 */
export function useGardenClock(speed: number) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    const interval = Math.min(60_000, Math.max(250, 60_000 / Math.max(speed, 0.001)))
    let timer: ReturnType<typeof setInterval> | undefined
    const tick = () => setNow(Date.now())
    const start = () => {
      tick()
      if (timer === undefined) timer = setInterval(tick, interval)
    }
    const stop = () => {
      clearInterval(timer)
      timer = undefined
    }
    const onVisibility = () => (document.visibilityState === 'hidden' ? stop() : start())
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [speed])
  return now
}

/**
 * A document that lives in storage. It starts as `initial` (on the server and
 * on the first client render), then loads after mount. Every change is saved.
 * `store` null keeps the document in memory only.
 */
export function useStoredDocument<T>(store: Persistence<T> | null, initial: () => T) {
  const [value, setValue] = useState(initial)
  const blank = useRef(initial)
  const dirty = useRef(false)
  useEffect(() => {
    dirty.current = false
    // A different store means a different key: start from what it holds.
    setValue(store?.load().value ?? blank.current())
  }, [store])
  useEffect(() => {
    if (!dirty.current) return
    dirty.current = false
    store?.save(value)
  }, [store, value])
  const update = (next: (current: T) => T) => {
    dirty.current = true
    setValue(next)
  }
  return [value, update] as const
}
