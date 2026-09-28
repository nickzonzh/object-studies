import { useEffect, useRef, useState } from 'react'
import {
  clampPoint,
  type ActivationSource,
  type HistoryState,
  type LoadStatus,
  type Point,
  type Pose,
  type SaveStatus,
} from 'object-studies-core'
import { createToolMotion } from '../tools/toolMotion.js'
import { createDrawingSurface } from '../drawing/drawingSurface.js'
import { pressureFor } from '../drawing/chalkSampler.js'
import { createBoardStorage } from '../drawing/boardStorage.js'
import { defaultChalkColors } from '../drawing/chalkBrush.js'
import type { ChalkColor, DrawingStroke } from '../drawing/types.js'
import {
  createBoardPng,
  downloadBoard,
  defaultTone,
  type BoardTone,
} from '../drawing/exportPng.js'
import { toolIds, type ToolId } from '../tools/types.js'

export type ChalkboardOptions = {
  /** The portal node holding the flying tools; null until it is mounted. */
  overlay: HTMLElement | null
  strokes?: readonly DrawingStroke[]
  defaultStrokes?: readonly DrawingStroke[]
  onStrokesChange?: (strokes: readonly DrawingStroke[]) => void
  persistence: false | { key: string }
  exportFileName: string
  wear: number
}

type Controller = {
  select: (id: ToolId, activation: ActivationSource) => void
  putBack: (keyboard?: boolean) => void
  clear: () => void
  undo: () => void
  redo: () => void
  savePng: () => void
  toBlob: (type?: string) => Promise<Blob>
  getStrokes: () => readonly DrawingStroke[]
  setStrokes: (strokes: readonly DrawingStroke[]) => void
}

/** Reads the four chalk colours the theme exposes on the board element. */
function themeColors(root: HTMLElement): Record<ChalkColor, string> {
  const styles = getComputedStyle(root)
  const colors = { ...defaultChalkColors }
  for (const color of Object.keys(colors) as ChalkColor[]) {
    const value = styles.getPropertyValue(`--kimolia-chalk-${color}`).trim()
    if (value) colors[color] = value
  }
  return colors
}

function boardTone(root: HTMLElement, wear: number): BoardTone {
  const styles = getComputedStyle(root)
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback
  return {
    slate: read('--kimolia-slate', defaultTone.slate),
    slateLight: read('--kimolia-slate-light', defaultTone.slateLight),
    slateDark: read('--kimolia-slate-dark', defaultTone.slateDark),
    wear,
  }
}

/**
 * Owns the board's imperative lifecycle: one effect, one AbortController, no
 * React state per pointer event. Props are read through a ref so changing a
 * label or a callback never tears down the drawing.
 */
export function useChalkboard(options: ChalkboardOptions) {
  const boardRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const curtainRef = useRef<HTMLCanvasElement>(null)
  const controller = useRef<Controller | null>(null)
  const latest = useRef(options)
  const synced = useRef<readonly DrawingStroke[] | null>(null)
  const [selected, setSelected] = useState<ToolId | null>(null)
  const [history, setHistory] = useState<HistoryState>({
    hasMarks: false,
    canUndo: false,
    canRedo: false,
  })
  const [saveStatus, setSaveStatus] = useState<
    LoadStatus | SaveStatus | 'saving'
  >('idle')
  const [rendering, setRendering] = useState(false)
  const [exportStatus, setExportStatus] = useState<
    'idle' | 'exporting' | 'error'
  >('idle')
  const { overlay, strokes } = options
  const storageKey = options.persistence === false ? null : options.persistence.key

  // The long-lived effect below reads props through this ref, so a new label or
  // callback never tears the drawing down.
  useEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    if (!overlay) return
    const board = boardRef.current!
    const surface = surfaceRef.current!
    const motion = createToolMotion(board, overlayRef.current!)
    const storage = storageKey === null ? null : createBoardStorage(storageKey)
    const restored = storage?.load()
    let saveTimer = 0
    let pendingSave: readonly DrawingStroke[] | null = null
    let disposed = false
    let exporting = false
    const flushSave = () => {
      window.clearTimeout(saveTimer)
      if (pendingSave === null || !storage) return
      const status = storage.save([...pendingSave])
      pendingSave = null
      if (!disposed) setSaveStatus(status)
    }
    const drawing = createDrawingSurface(canvasRef.current!, {
      onChange(state, next) {
        setHistory(state)
        // Records are handed out as a snapshot: the history keeps mutating its
        // own array, and a controlled owner must be able to hold on to this one.
        const snapshot = [...next]
        synced.current = snapshot
        latest.current.onStrokesChange?.(snapshot)
        if (!storage) return
        setSaveStatus('saving')
        pendingSave = snapshot
        window.clearTimeout(saveTimer)
        saveTimer = window.setTimeout(flushSave, 250)
      },
      initial:
        latest.current.strokes ??
        latest.current.defaultStrokes ??
        restored?.value ??
        [],
      onBusy: setRendering,
      curtain: curtainRef.current,
      colors: themeColors(board),
    })
    setHistory(drawing.state())
    if (restored) setSaveStatus(restored.status)
    const parkedDuster = board.querySelector<HTMLElement>(
      '[data-slot="duster"] .kimolia-duster',
    )!
    const component = board.parentElement!
    let active: ToolId | null = null
    let pointer: number | null = null
    let pointerType = ''
    let contactPressure = 0.5
    let over = false
    let touching = false
    let last: Point | null = null
    let returnTimer = 0
    let rect = surface.getBoundingClientRect()
    drawing.resize(rect.width, rect.height)
    const events = new AbortController()
    const listen = { signal: events.signal }
    const cancelReturn = () => {
      if (returnTimer) {
        window.clearTimeout(returnTimer)
        returnTimer = 0
      }
    }
    const componentContains = (point: Point) => {
      const bounds = component.getBoundingClientRect()
      return (
        point.x >= bounds.left &&
        point.x <= bounds.right &&
        point.y >= bounds.top &&
        point.y <= bounds.bottom
      )
    }
    const scheduleReturn = () => {
      cancelReturn()
      if (!active) return
      returnTimer = window.setTimeout(() => {
        returnTimer = 0
        if (active && pointer === null) putBack()
      }, 600)
    }

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
      drawing.end()
      const captured = pointer
      pointer = null
      touching = false
      if (captured !== null && surface.hasPointerCapture(captured))
        surface.releasePointerCapture(captured)
    }
    const ready = (immediate = false) => {
      drawing.end()
      over = false
      last = null
      if (active) {
        motion.ready(active, { immediate })
        phase('ready')
      }
    }
    const putBack = (keyboard = false, immediate = false) => {
      cancelReturn()
      const previous = active
      releaseCapture()
      active = null
      over = false
      last = null
      delete surface.dataset.selected
      motion.dockAll({ immediate: keyboard || immediate })
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
        ...point,
        // The writing end stays anchored; the grip extends towards 4–5 o'clock.
        angle: (active === 'duster' ? 0 : 45) + tilt,
      }
    }
    const pointFrom = (event: PointerEvent): Point => ({
      x: event.clientX,
      y: event.clientY,
    })
    const inkPoint = (point: Point, pressure = 0.5) => ({
      x: point.x - rect.left,
      y: point.y - rect.top,
      pressure,
    })
    const beginMark = (point: Point, pressure = 0.5) => {
      if (!active) return
      drawing.begin(
        active,
        inkPoint(point, pressure),
        active === 'duster'
          ? {
              width: parkedDuster.offsetWidth,
              height: parkedDuster.offsetHeight * 1.2,
            }
          : undefined,
      )
    }
    const addSamples = (event: PointerEvent) => {
      const samples = event.getCoalescedEvents?.() ?? []
      // Always include the parent event: some devices return an empty list.
      for (const sample of [...samples, event]) {
        contactPressure = pressureFor(sample.pointerType, sample.pressure)
        drawing.add(inkPoint(pointFrom(sample), contactPressure))
      }
      drawing.flush()
    }
    const select = (id: ToolId, activation: ActivationSource) => {
      if (active === id) {
        putBack(activation === 'keyboard')
        return
      }
      releaseCapture()
      if (active) motion.dock(active, { immediate: activation === 'keyboard' })
      active = id
      surface.dataset.selected = id
      setSelected(id)
      ready(activation === 'keyboard')
      if (activation === 'keyboard') {
        rect = surface.getBoundingClientRect()
        last = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        over = true
        surface.focus({ preventScroll: true })
        motion.move(id, pose(last), { immediate: true })
        phase('hover')
      }
    }
    controller.current = {
      select,
      putBack,
      clear() {
        releaseCapture()
        drawing.clear()
        if (active) ready(true)
      },
      undo() {
        releaseCapture()
        drawing.undo()
        if (active) ready(true)
      },
      redo() {
        releaseCapture()
        drawing.redo()
        if (active) ready(true)
      },
      getStrokes: () => [...drawing.strokes()],
      setStrokes(next) {
        releaseCapture()
        drawing.setStrokes(next)
        setHistory(drawing.state())
        if (active) ready(true)
      },
      toBlob: (type) =>
        createBoardPng(
          canvasRef.current!,
          boardTone(board, latest.current.wear),
          type,
        ),
      async savePng() {
        if (exporting || drawing.isBusy()) return
        releaseCapture()
        if (active) ready(true)
        exporting = true
        setExportStatus('exporting')
        try {
          const blob = await controller.current!.toBlob()
          if (!disposed) {
            downloadBoard(blob, latest.current.exportFileName)
            setExportStatus('idle')
          }
        } catch {
          if (!disposed) setExportStatus('error')
        } finally {
          exporting = false
        }
      },
    }

    component.addEventListener(
      'pointerenter',
      (event) => {
        cancelReturn()
        if (
          !active ||
          event.pointerType === 'touch' ||
          pointer !== null
        )
          return
        rect = surface.getBoundingClientRect()
        const point = pointFrom(event)
        over = inside(point)
        motion.arrive(active, pose(point))
        last = point
        phase('hover')
      },
      listen,
    )
    component.addEventListener(
      'pointermove',
      (event) => {
        if (
          !active ||
          pointer !== null ||
          event.pointerType === 'touch'
        )
          return
        const point = pointFrom(event)
        over = inside(point)
        motion.move(active, pose(point))
        last = point
        phase('hover')
      },
      listen,
    )
    component.addEventListener(
      'pointerleave',
      (event) => {
        if (
          active &&
          pointer === null &&
          event.pointerType !== 'touch'
        )
          scheduleReturn()
      },
      listen,
    )
    surface.addEventListener(
      'pointerdown',
      (event) => {
        if (
          drawing.isBusy() ||
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
        motion.move(active, pose(point), { pressed: true })
        contactPressure = pressureFor(event.pointerType, event.pressure)
        beginMark(point, contactPressure)
        last = point
        phase('contact')
      },
      listen,
    )
    surface.addEventListener(
      'pointermove',
      (event) => {
        if (
          !active ||
          pointer === null ||
          pointer !== event.pointerId
        )
          return
        const point = pointFrom(event)
        over = inside(point)
        if (touching) addSamples(event)
        motion.move(active, pose(point), { pressed: touching && over })
        last = point
        phase(touching && over ? 'contact' : 'hover')
      },
      listen,
    )
    surface.addEventListener(
      'pointerup',
      (event) => {
        if (event.pointerId !== pointer || !active) return
        const point = pointFrom(event)
        // Pointer-up pressure is zero; keep the last contact pressure at release.
        drawing.add(inkPoint(point, contactPressure))
        releaseCapture()
        if (pointerType === 'touch') {
          ready(true)
          return
        }
        cancelReturn()
        over = inside(point)
        motion.move(active, pose(point))
        last = point
        phase('hover')
        if (!componentContains(point)) scheduleReturn()
      },
      listen,
    )
    const cancel = (event: PointerEvent) => {
      if (pointer !== event.pointerId || !active) return
      const point = pointFrom(event)
      const touch = pointerType === 'touch'
      releaseCapture()
      if (touch) {
        ready(true)
        return
      }
      cancelReturn()
      over = inside(point)
      motion.move(active, pose(point))
      last = point
      phase('hover')
      if (!componentContains(point)) scheduleReturn()
    }
    surface.addEventListener('pointercancel', cancel, listen)
    surface.addEventListener('lostpointercapture', cancel, listen)
    surface.addEventListener(
      'keydown',
      (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return
        if (drawing.isBusy()) {
          if (
            event.key === ' ' ||
            event.key === 'Enter' ||
            event.key.startsWith('Arrow')
          )
            event.preventDefault()
          return
        }
        if (!active || pointer !== null) return
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          if (touching || event.repeat) return
          touching = true
          rect = surface.getBoundingClientRect()
          last ??= {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          }
          motion.move(active, pose(last), { pressed: true, immediate: true })
          beginMark(last)
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
        motion.move(active, pose(next), { pressed: touching, immediate: true })
        if (touching) {
          drawing.add(inkPoint(next))
          drawing.flush()
        }
        last = next
        over = true
        phase(touching ? 'contact' : 'hover')
      },
      listen,
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
        drawing.end()
        touching = false
        if (last) motion.move(active, pose(last), { immediate: true })
        phase('hover')
      },
      listen,
    )
    surface.addEventListener(
      'blur',
      () => {
        if (pointer === null && active) {
          touching = false
          ready(true)
        }
      },
      listen,
    )
    document.addEventListener(
      'keydown',
      (event) => {
        const target = event.target
        if (
          target instanceof HTMLElement &&
          board.contains(target) &&
          !target.closest('input, textarea, select, [contenteditable="true"]') &&
          (event.ctrlKey || event.metaKey) &&
          !event.altKey
        ) {
          const key = event.key.toLowerCase()
          if (key === 'z' || (key === 'y' && !event.shiftKey)) {
            event.preventDefault()
            if (!event.repeat) {
              if (key === 'y' || event.shiftKey) controller.current?.redo()
              else controller.current?.undo()
            }
            return
          }
        }
        // Escape belongs to the board only while it is in use, so another
        // component on the page keeps its own Escape and its focus.
        if (
          event.key === 'Escape' &&
          active &&
          (component.contains(event.target as Node) || component.matches(':hover'))
        ) {
          event.preventDefault()
          putBack(true)
        }
      },
      listen,
    )
    window.addEventListener('blur', () => putBack(false, true), listen)
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          putBack(false, true)
          flushSave()
        }
      },
      listen,
    )
    window.addEventListener(
      'pagehide',
      () => {
        releaseCapture()
        flushSave()
      },
      listen,
    )
    // Any ancestor can scroll the slate out from under a held tool, so the
    // cached rect has to be refreshed without returning the tool.
    document.addEventListener(
      'scroll',
      () => {
        rect = surface.getBoundingClientRect()
        if (active && last) {
          over = inside(last)
          motion.move(active, pose(last), {
            pressed: touching && pointer !== null && over,
            immediate: true,
          })
          phase(touching && over ? 'contact' : 'hover')
        }
      },
      { ...listen, capture: true, passive: true },
    )
    const resizeSurface = () => {
      rect = surface.getBoundingClientRect()
      if (active && last) {
        over = inside(last)
        motion.move(active, pose(last), {
          pressed: touching && pointer !== null && over,
          immediate: true,
        })
        phase(touching && over ? 'contact' : 'hover')
      }
      drawing.resize(rect.width, rect.height)
    }
    const resize = new ResizeObserver(resizeSurface)
    resize.observe(surface)
    window.addEventListener('resize', resizeSurface, listen)
    phase('idle')
    return () => {
      cancelReturn()
      releaseCapture()
      flushSave()
      disposed = true
      events.abort()
      resize.disconnect()
      motion.destroy()
      drawing.destroy()
      controller.current = null
      synced.current = null
    }
  }, [overlay, storageKey])

  // Controlled boards follow their owner, but never replay the array the board
  // itself last reported or was last given — that is its own drawing coming
  // back, and replaying it would throw the session's undo history away.
  useEffect(() => {
    if (!strokes || strokes === synced.current) return
    synced.current = strokes
    controller.current?.setStrokes(strokes)
  }, [strokes])

  return {
    boardRef,
    surfaceRef,
    overlayRef,
    canvasRef,
    curtainRef,
    selected,
    ...history,
    saveStatus,
    exportStatus,
    rendering,
    tools: toolIds,
    select: (id: ToolId, activation: ActivationSource) =>
      controller.current?.select(id, activation),
    putBack: (keyboard = false) => controller.current?.putBack(keyboard),
    clear: () => controller.current?.clear(),
    undo: () => controller.current?.undo(),
    redo: () => controller.current?.redo(),
    savePng: () => controller.current?.savePng(),
    toBlob: (type?: string) =>
      controller.current
        ? controller.current.toBlob(type)
        : Promise.reject(new Error('The chalkboard is not mounted')),
    getStrokes: (): readonly DrawingStroke[] =>
      controller.current?.getStrokes() ?? [],
  }
}
