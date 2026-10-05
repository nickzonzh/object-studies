import { useCallback, useEffect, useRef, useState } from 'react'

/** The time an action happens. Kept out of render so a render never reads the clock. */
export const actionTime = () => Date.now()
import type { Persistence } from 'object-studies-core'

type Ticker = { listeners: Set<(now: number) => void>; timer?: ReturnType<typeof setInterval> }

// One timer per refresh rate, shared by every bed and tin on the page, so they
// all move on the same tick and render together.
const tickers = new Map<number, Ticker>()

function startTicker(interval: number, ticker: Ticker) {
  if (ticker.timer !== undefined) return
  const tick = () => {
    const now = Date.now()
    ticker.listeners.forEach((listener) => listener(now))
  }
  tick()
  ticker.timer = setInterval(tick, interval)
}

function stopTicker(ticker: Ticker) {
  clearInterval(ticker.timer)
  ticker.timer = undefined
}

function subscribe(interval: number, listener: (now: number) => void) {
  let ticker = tickers.get(interval)
  if (!ticker) tickers.set(interval, (ticker = { listeners: new Set() }))
  const shared = ticker
  shared.listeners.add(listener)
  const onVisibility = () => (document.visibilityState === 'hidden' ? stopTicker(shared) : startTicker(interval, shared))
  document.addEventListener('visibilitychange', onVisibility)
  if (document.visibilityState === 'hidden') listener(Date.now())
  else if (shared.timer === undefined) startTicker(interval, shared)
  else listener(Date.now())
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    shared.listeners.delete(listener)
    if (shared.listeners.size === 0) {
      stopTicker(shared)
      tickers.delete(interval)
    }
  }
}

/**
 * The current time, refreshed often enough for growth to look continuous at
 * the given speed: once a minute in real time, faster when sped up. Zero on
 * the server and on the first client render, so hydration matches; the clock
 * starts after mount. Stops while the tab is hidden.
 */
export function useGardenClock(speed: number) {
  const [now, setNow] = useState(0)
  useEffect(() => subscribe(Math.min(60_000, Math.max(250, 60_000 / Math.max(speed, 0.001))), setNow), [speed])
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
  // Stable, so effects can depend on it.
  const update = useCallback((next: (current: T) => T) => {
    dirty.current = true
    setValue(next)
  }, [])
  return [value, update] as const
}
