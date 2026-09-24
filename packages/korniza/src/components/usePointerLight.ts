import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'

interface Targets {
  /** Elements that paint with --light-x/--light-y (`korniza-lit`). */
  lit: HTMLCollectionOf<Element>
  /** Containers of the pointer-lit carving catches (`korniza-relief`). */
  relief: HTMLCollectionOf<Element>
}

const clear = (elements: HTMLCollectionOf<Element>, properties: readonly string[]) => {
  for (const element of elements) for (const property of properties) (element as HTMLElement).style.removeProperty(property)
}
const LIGHT = ['--light-x', '--light-y'] as const
const RELIEF = ['--relief-light', '--relief-return'] as const

/**
 * One geometry read and one style write batch per animation frame; no React
 * renders. The values are written onto the elements that paint with them, not
 * onto the frame: a custom property set on the frame restyles every board,
 * slice and band beneath it, and each of those resolves kilobytes of var()
 * texture when it is restyled.
 */
export function usePointerLight(enabled: boolean, variant: string) {
  const ref = useRef<HTMLDivElement>(null)
  const pending = useRef<number | null>(null)
  /** Held for the component's lifetime so the move handler allocates nothing. */
  const media = useRef<{ motion: MediaQueryList; pointer: MediaQueryList } | null>(null)
  /** Live collections: they follow mat, glazing and decoration changes on their own. */
  const targets = useRef<Targets | null>(null)
  const reset = () => {
    if (pending.current !== null) cancelAnimationFrame(pending.current)
    pending.current = null
    const current = targets.current
    if (!current) return
    clear(current.lit, LIGHT)
    clear(current.relief, RELIEF)
  }

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = matchMedia('(any-pointer: fine)')
    media.current = { motion, pointer }
    const element = ref.current
    targets.current = element
      ? { lit: element.getElementsByClassName('korniza-lit'), relief: element.getElementsByClassName('korniza-relief') }
      : null
    reset()
    motion.addEventListener('change', reset)
    pointer.addEventListener('change', reset)
    window.addEventListener('blur', reset)
    return () => {
      reset()
      media.current = null
      targets.current = null
      motion.removeEventListener('change', reset)
      pointer.removeEventListener('change', reset)
      window.removeEventListener('blur', reset)
    }
  }, [enabled, variant])

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const queries = media.current
    if (!enabled || !queries || event.defaultPrevented || event.pointerType === 'touch' ||
      queries.motion.matches || !queries.pointer.matches) return
    const { clientX, clientY } = event
    if (pending.current !== null) cancelAnimationFrame(pending.current)
    pending.current = requestAnimationFrame(() => {
      pending.current = null
      const element = ref.current
      const current = targets.current
      if (!element || !current) return
      const { left, top, width, height } = element.getBoundingClientRect()
      if (!width || !height) return
      const x = Math.max(0, Math.min(1, (clientX - left) / width))
      const y = Math.max(0, Math.min(1, (clientY - top) / height))
      /* The source travels nearly the full face: highlights have to reach the
         far rails, not hover near the middle. */
      const lightX = `${4 + x * 92}%`
      const lightY = `${4 + y * 92}%`
      for (const lit of current.lit) {
        const style = (lit as HTMLElement).style
        style.setProperty('--light-x', lightX)
        style.setProperty('--light-y', lightY)
      }
      if (!current.relief.length) return
      const gold = variant === 'baroque-gold'
      const oak = variant === 'carved-oak'
      const distance = (x + y) / 2
      const light = `${(gold ? .18 : oak ? .2 : .22) + (1 - distance) * (gold ? .64 : oak ? .26 : .28)}`
      const bounce = `${(gold ? .08 : oak ? .05 : .06) + distance * (gold ? .32 : oak ? .1 : .12)}`
      for (const relief of current.relief) {
        const style = (relief as HTMLElement).style
        style.setProperty('--relief-light', light)
        style.setProperty('--relief-return', bounce)
      }
    })
  }
  return { ref, move, reset }
}
