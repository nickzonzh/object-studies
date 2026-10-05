import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

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
 * How often the clock ticks at a speed: once a minute in real time, faster when
 * sped up, but never more often than a growth transition (1200ms in
 * styles.css) takes to play. Each tick's growth then glides into the next
 * without the transitions ever piling up.
 */
export const tickInterval = (speed: number) => Math.min(60_000, Math.max(1200, 60_000 / Math.max(speed, 0.001)))

/**
 * Whether an element is on screen or nearly so. True until known, and where
 * the browser cannot tell.
 */
function useOnScreen(element: RefObject<HTMLElement | null>) {
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    const target = element.current
    if (!target || typeof IntersectionObserver !== 'function') return
    const observer = new IntersectionObserver((entries) => setOnScreen(entries[entries.length - 1].isIntersecting), {
      rootMargin: '200px',
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [element])
  return onScreen
}

/**
 * The current time, refreshed often enough for growth to look continuous at
 * the given speed (see `tickInterval`). Zero on the server and on the first
 * client render, so hydration matches; the clock starts after mount. Stops
 * while the tab is hidden, or while `element` is scrolled out of view, and
 * catches up the moment it is back: the garden is worked out from timestamps,
 * so nothing is lost.
 */
export function useGardenClock(speed: number, element: RefObject<HTMLElement | null>) {
  const [now, setNow] = useState(0)
  const onScreen = useOnScreen(element)
  useEffect(() => (onScreen ? subscribe(tickInterval(speed), setNow) : undefined), [speed, onScreen])
  return now
}

/**
 * Marks `element` ready once the garden has its first real time, a frame after
 * that render, so styles.css lets changes animate from then on and not before.
 */
export function useReady(element: RefObject<HTMLElement | null>, now: number) {
  const started = now !== 0
  useEffect(() => {
    if (!started) return
    const frame = requestAnimationFrame(() => element.current?.setAttribute('data-ready', ''))
    return () => cancelAnimationFrame(frame)
  }, [element, started])
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
