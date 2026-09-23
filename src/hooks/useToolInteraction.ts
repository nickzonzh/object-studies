import { useEffect, useRef, useState } from 'react'
import { clampPoint } from '../tools/geometry'
import { createToolMotion } from '../tools/toolMotion'
import {
  type Activation,
  type Point,
  type Pose,
  type ToolId,
} from '../tools/types'

type Controller = {
  select: (id: ToolId, activation: Activation) => void
  putBack: (keyboard?: boolean) => void
}

export function useToolInteraction() {
  const boardRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const controller = useRef<Controller | null>(null)
  const [selected, setSelected] = useState<ToolId | null>(null)

  useEffect(() => {
    const board = boardRef.current!
    const surface = surfaceRef.current!
    const motion = createToolMotion(board, overlayRef.current!)
    let active: ToolId | null = null
    let pointer: number | null = null
    let pointerType = ''
    let over = false
    let touching = false
    let last: Point | null = null
    let rect = surface.getBoundingClientRect()
    const events = new AbortController()
    const options = { signal: events.signal }

    const phase = (value: 'idle' | 'ready' | 'hover' | 'contact') => {
      board.dataset.phase = value
      surface.dataset.cursor = String(value === 'hover' || value === 'contact')
    }
    const inside = (point: Point) =>
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    const releaseCapture = () => {
      const captured = pointer
      pointer = null
      touching = false
      if (captured !== null && surface.hasPointerCapture(captured))
        surface.releasePointerCapture(captured)
    }
    const ready = (immediate = false) => {
      over = false
      last = null
      if (active) {
        motion.ready(active, immediate)
        phase('ready')
      }
    }
    const putBack = (keyboard = false, immediate = false) => {
      const previous = active
      releaseCapture()
      active = null
      over = false
      last = null
      delete surface.dataset.selected
      motion.dockAll(keyboard || immediate)
      setSelected(null)
      phase('idle')
      if (keyboard && previous)
        board
          .querySelector<HTMLButtonElement>(`[data-slot="${previous}"]`)!
          .focus({ preventScroll: true })
    }
    const pose = (point: Point): Pose => {
      const maxTilt = active === 'duster' ? 3 : 8
      const tilt = last
        ? Math.max(-maxTilt, Math.min(maxTilt, (point.x - last.x) * 0.35))
        : 0
      return {
        ...clampPoint(point, rect),
        // The writing end stays anchored; the grip extends towards 4–5 o'clock.
        angle: (active === 'duster' ? 0 : 45) + tilt,
      }
    }
    const pointFrom = (event: PointerEvent): Point => ({
      x: event.clientX,
      y: event.clientY,
    })
    const select = (id: ToolId, activation: Activation) => {
      if (active === id) {
        putBack(activation === 'keyboard')
        return
      }
      releaseCapture()
      if (active) motion.dock(active, activation === 'keyboard')
      active = id
      surface.dataset.selected = id
      setSelected(id)
      ready(activation === 'keyboard')
      if (activation === 'keyboard') {
        rect = surface.getBoundingClientRect()
        last = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        over = true
        surface.focus({ preventScroll: true })
        motion.move(id, pose(last), false, true)
        phase('hover')
      }
    }
    controller.current = { select, putBack }

    surface.addEventListener(
      'pointerenter',
      (event) => {
        if (!active || event.pointerType === 'touch' || pointer !== null) return
        rect = surface.getBoundingClientRect()
        over = true
        const point = pointFrom(event)
        motion.arrive(active, pose(point))
        last = point
        phase('hover')
      },
      options,
    )
    surface.addEventListener(
      'pointerdown',
      (event) => {
        if (
          !active ||
          event.button !== 0 ||
          !event.isPrimary ||
          pointer !== null
        )
          return
        event.preventDefault()
        rect = surface.getBoundingClientRect()
        pointer = event.pointerId
        pointerType = event.pointerType
        touching = true
        over = true
        const point = pointFrom(event)
        surface.setPointerCapture(event.pointerId)
        surface.focus({ preventScroll: true })
        motion.move(active, pose(point), true)
        last = point
        phase('contact')
      },
      options,
    )
    surface.addEventListener(
      'pointermove',
      (event) => {
        if (
          !active ||
          (pointer !== null && pointer !== event.pointerId) ||
          (event.pointerType === 'touch' && pointer === null)
        )
          return
        const point = pointFrom(event)
        over = inside(point)
        motion.move(active, pose(point), touching && over)
        last = point
        phase(touching && over ? 'contact' : 'hover')
      },
      options,
    )
    surface.addEventListener(
      'pointerup',
      (event) => {
        if (event.pointerId !== pointer || !active) return
        const point = pointFrom(event)
        releaseCapture()
        if (pointerType === 'touch' || !inside(point))
          ready(pointerType === 'touch')
        else {
          motion.move(active, pose(point))
          phase('hover')
        }
      },
      options,
    )
    const cancel = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return
      releaseCapture()
      ready(true)
    }
    surface.addEventListener('pointercancel', cancel, options)
    surface.addEventListener('lostpointercapture', cancel, options)
    surface.addEventListener(
      'pointerleave',
      () => {
        if (pointer === null) ready()
      },
      options,
    )
    surface.addEventListener(
      'keydown',
      (event) => {
        if (!active) return
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          touching = true
          rect = surface.getBoundingClientRect()
          last ??= {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          }
          motion.move(active, pose(last), true, true)
          phase('contact')
          return
        }
        const directions: Record<string, Point> = {
          ArrowLeft: { x: -1, y: 0 },
          ArrowRight: { x: 1, y: 0 },
          ArrowUp: { x: 0, y: -1 },
          ArrowDown: { x: 0, y: 1 },
        }
        const direction = directions[event.key]
        if (!direction) return
        event.preventDefault()
        rect = surface.getBoundingClientRect()
        const origin = last ?? {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }
        const step = event.shiftKey ? 36 : 12
        const next = clampPoint(
          {
            x: origin.x + direction.x * step,
            y: origin.y + direction.y * step,
          },
          rect,
        )
        motion.move(active, pose(next), touching, true)
        last = next
        over = true
        phase(touching ? 'contact' : 'hover')
      },
      options,
    )
    surface.addEventListener(
      'keyup',
      (event) => {
        if (
          !active ||
          (event.key !== ' ' && event.key !== 'Enter') ||
          pointer !== null
        )
          return
        event.preventDefault()
        touching = false
        if (last) motion.move(active, pose(last), false, true)
        phase('hover')
      },
      options,
    )
    surface.addEventListener(
      'blur',
      () => {
        if (pointer === null && active) {
          touching = false
          ready(true)
        }
      },
      options,
    )
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape' && active) {
          event.preventDefault()
          putBack(true)
        }
      },
      options,
    )
    window.addEventListener('blur', () => putBack(false, true), options)
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) putBack(false, true)
      },
      options,
    )
    window.addEventListener(
      'scroll',
      () => {
        if (active) {
          releaseCapture()
          ready(true)
        }
      },
      { ...options, passive: true },
    )
    const resize = new ResizeObserver(() => {
      rect = surface.getBoundingClientRect()
      if (active) {
        releaseCapture()
        ready(true)
      }
    })
    resize.observe(surface)
    phase('idle')
    return () => {
      releaseCapture()
      events.abort()
      resize.disconnect()
      motion.destroy()
      controller.current = null
    }
  }, [])

  return {
    boardRef,
    surfaceRef,
    overlayRef,
    selected,
    select: (id: ToolId, activation: Activation) =>
      controller.current?.select(id, activation),
    putBack: (keyboard = false) => controller.current?.putBack(keyboard),
  }
}
