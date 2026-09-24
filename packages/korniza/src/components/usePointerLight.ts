import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'

const properties = ['--light-x', '--light-y', '--relief-light', '--relief-return']

/** One geometry read and one style write batch per animation frame; no React renders. */
export function usePointerLight(enabled: boolean, variant: string) {
  const ref = useRef<HTMLDivElement>(null)
  const pending = useRef<number | null>(null)
  /** Held for the component's lifetime so the move handler allocates nothing. */
  const media = useRef<{ motion: MediaQueryList; pointer: MediaQueryList } | null>(null)
  const reset = () => {
    if (pending.current !== null) cancelAnimationFrame(pending.current)
    pending.current = null
    properties.forEach(property => ref.current?.style.removeProperty(property))
  }

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = matchMedia('(any-pointer: fine)')
    media.current = { motion, pointer }
    reset()
    motion.addEventListener('change', reset)
    pointer.addEventListener('change', reset)
    window.addEventListener('blur', reset)
    return () => {
      reset()
      media.current = null
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
      if (!element) return
      const { left, top, width, height } = element.getBoundingClientRect()
      if (!width || !height) return
      const x = Math.max(0, Math.min(1, (clientX - left) / width))
      const y = Math.max(0, Math.min(1, (clientY - top) / height))
      /* The source travels nearly the full face: highlights have to reach the
         far rails, not hover near the middle. */
      element.style.setProperty('--light-x', `${4 + x * 92}%`)
      element.style.setProperty('--light-y', `${4 + y * 92}%`)
      if (variant === 'baroque-gold' || variant === 'champagne-rococo') {
        const gold = variant === 'baroque-gold'
        const distance = (x + y) / 2
        element.style.setProperty('--relief-light', `${(gold ? .18 : .22) + (1 - distance) * (gold ? .64 : .28)}`)
        element.style.setProperty('--relief-return', `${(gold ? .08 : .06) + distance * (gold ? .32 : .12)}`)
      }
    })
  }
  return { ref, move, reset }
}
