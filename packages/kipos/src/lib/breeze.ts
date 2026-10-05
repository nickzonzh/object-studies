import { type RefObject, useEffect } from 'react'

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** A full gust, a plant brushed in passing, or the shiver as water lands. */
export type Swing = 'gust' | 'brush' | 'shiver'

/**
 * Sets the plant in `holder` swinging after `delay` ms. The swing is a CSS
 * animation on the compositor; when it ends nothing is left running.
 */
export function sway(holder: HTMLElement, swing: Swing, delay = 0) {
  const plant = holder.querySelector<HTMLElement>('.kipos-plant')
  if (!plant || reducedMotion()) return
  // Set on the plant itself, and not as a custom property, so nothing else is restyled.
  plant.style.animationDelay = `${delay}ms`
  // Each swing has two identical copies; switching to the other restarts it.
  plant.dataset.sway = `${swing}-${plant.dataset.sway?.endsWith('-a') ? 'b' : 'a'}`
}

/**
 * Every so often a breeze crosses the garden from the left, bending each
 * plant in `selector` in turn. Only while the garden is on screen, and never
 * for visitors who ask for less motion.
 */
export function useBreeze(scene: RefObject<HTMLElement | null>, selector: string) {
  useEffect(() => {
    const root = scene.current
    if (!root || reducedMotion()) return
    let onScreen = true
    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting))
      : null
    observer?.observe(root)
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      timer = setTimeout(() => {
        if (onScreen && document.visibilityState === 'visible')
          root.querySelectorAll<HTMLElement>(selector).forEach((holder, i) => sway(holder, 'gust', i * 260))
        next()
      }, 8000 + Math.random() * 10000)
    }
    next()
    return () => {
      clearTimeout(timer)
      observer?.disconnect()
    }
  }, [scene, selector])
}
