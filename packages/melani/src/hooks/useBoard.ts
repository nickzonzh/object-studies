import {
  useCallback, useEffect, useImperativeHandle, useRef, useState,
  type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  backingScale, createGestureHistory, createTapActivation, createToolMotion,
  type ActivationSource, type GestureHistory, type Pose,
  type TapResult, type ToolMotion,
} from 'object-studies-core'
import {
  BOARD_WIDTH, DEFAULT_PRESSURE, ERASER_HEIGHT, ERASER_WIDTH, boardPoint, createBoardRenderer, roundTo,
  type BoardRenderer, type Point, type Stroke,
} from '../lib/strokes.js'
import { reconcile, sameDrawing } from '../lib/controlled.js'
import { MAX_TOOL_SIZE, checkStrokes } from '../lib/decode.js'
import { createBoardPersistence, type BoardPersistence } from '../lib/persistence.js'
import { ERASER_ID, MARKER_REST_ANGLE, restingAngle, trayPose, type ToolId } from '../lib/tools.js'
import type { WhiteboardLabels, WhiteboardProps } from '../types.js'

type BoardOptions = Required<Pick<WhiteboardProps, 'markers' | 'persistence' | 'exportFileName'>>
  & Pick<WhiteboardProps, 'defaultStrokes' | 'strokes' | 'onStrokesChange' | 'ref'>
  & {
    labels: WhiteboardLabels
    /** The portal node the flying tools render into; null until it is mounted. */
    overlay: HTMLElement | null
  }

type Snapshot = {
  strokes: readonly Stroke[]
  canUndo: boolean
  canRedo: boolean
  hasMarks: boolean
}

const MARKER_WIDTH = 5.6
/** Held tools sit slightly small, as if seen from just above. */
const HELD_SCALE = 0.86
const READY_LIFT = 30

const snapshotOf = (history: GestureHistory<Stroke>): Snapshot => ({
  strokes: [...history.strokes()],
  ...history.state(),
})

export function useBoard({
  markers, persistence, exportFileName, defaultStrokes, strokes: controlled,
  onStrokesChange, labels, overlay, ref,
}: BoardOptions) {
  checkStrokes(controlled, 'strokes')
  checkStrokes(defaultStrokes, 'defaultStrokes')
  const rootRef = useRef<HTMLDivElement>(null)
  const objectRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  /* The two elements that paint with --melani-light-*: the surface gloss and
     the specular line along the top rail. Writing the values onto them, not
     onto the object, keeps a pointer move from restyling the whole board. */
  const lightRef = useRef<HTMLSpanElement>(null)
  const sheenRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)

  const rendererRef = useRef<BoardRenderer | null>(null)
  const motionRef = useRef<ToolMotion<ToolId> | null>(null)
  const storeRef = useRef<BoardPersistence | null>(null)
  // Another tab's save that arrived mid-mark, and how to take it up.
  const incomingRef = useRef(false)
  const adoptRef = useRef<(() => void) | null>(null)
  // Storage cannot be read during render; a saved drawing replaces this in an effect.
  const [initialHistory] = useState(() =>
    createGestureHistory<Stroke>(controlled ?? defaultStrokes ?? []))
  const historyRef = useRef(initialHistory)

  const [snapshot, setSnapshot] = useState<Snapshot>(() => snapshotOf(initialHistory))
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const saveFailedRef = useRef(false)
  const [announcement, setAnnouncement] = useState('')

  const strokes = controlled ?? snapshot.strokes
  // A controlled owner that refused or replaced the last drawing handed out has
  // one the history knows nothing about: there is nothing in it to undo or redo.
  const synced = !controlled || sameDrawing(controlled, snapshot.strokes)
  // What the handlers and the render loop need to see, without re-binding them.
  const latestRef = useRef({ strokes, controlled, defaultStrokes, labels, onStrokesChange, markers })
  useEffect(() => {
    latestRef.current = { strokes, controlled, defaultStrokes, labels, onStrokesChange, markers }
  })

  const activeToolRef = useRef<ToolId | null>(null)
  const activeStrokeRef = useRef<Stroke | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingMoveRef = useRef<{ id: ToolId; pose: Pose; contact: boolean }>({
    id: ERASER_ID, pose: { x: 0, y: 0, angle: MARKER_REST_ANGLE }, contact: false,
  })
  const pendingMoveActiveRef = useRef(false)
  const previousPointerRef = useRef<{ x: number; y: number } | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const angleRef = useRef(MARKER_REST_ANGLE)
  const returnTimerRef = useRef<number | null>(null)
  const surfaceOutsideRef = useRef(false)
  // Layout is cached between resize, scroll and pointer-enter boundaries.
  const surfaceRectRef = useRef<DOMRect | null>(null)
  const objectRectRef = useRef<DOMRect | null>(null)
  const rootRectRef = useRef<DOMRect | null>(null)

  const render = useCallback(() => {
    rendererRef.current?.render(latestRef.current.strokes, activeStrokeRef.current)
    // Commit nib position and fresh ink in the same frame, including coalesced input.
    if (!pendingMoveActiveRef.current) return
    const pending = pendingMoveRef.current
    motionRef.current?.move(pending.id, pending.pose, { pressed: pending.contact })
    pendingMoveActiveRef.current = false
  }, [])

  const scheduleRender = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      render()
    })
  }, [render])
  const dockAfterGrace = () => {
    returnTimerRef.current = null
    if (!activeToolRef.current || activeStrokeRef.current) return
    motionRef.current?.dockAll()
    activeToolRef.current = null
    setActiveTool(null)
    previousPointerRef.current = null
  }
  const clearReturn = () => {
    if (returnTimerRef.current !== null) {
      window.clearTimeout(returnTimerRef.current)
      returnTimerRef.current = null
    }
  }

  const cacheRects = () => {
    const root = rootRef.current
    const object = objectRef.current
    const surface = surfaceRef.current
    if (root) rootRectRef.current = root.getBoundingClientRect()
    if (object) objectRectRef.current = object.getBoundingClientRect()
    if (surface) surfaceRectRef.current = surface.getBoundingClientRect()
  }

  useEffect(() => {
    const clearReturn = (event: PointerEvent) => {
      const root = rootRef.current
      const rect = rootRectRef.current
      if (!root || !rect) return
      const outside = event.clientX < rect.left || event.clientX > rect.right
        || event.clientY < rect.top || event.clientY > rect.bottom
      if (outside) {
        if (activeToolRef.current && !activeStrokeRef.current && returnTimerRef.current === null) {
          returnTimerRef.current = window.setTimeout(dockAfterGrace, 600)
        }
        return
      }
      if (!root.contains(event.target as Node)) return
      if (returnTimerRef.current !== null) {
        window.clearTimeout(returnTimerRef.current)
        returnTimerRef.current = null
      }
    }
    document.addEventListener('pointermove', clearReturn)
    window.addEventListener('scroll', cacheRects, { capture: true, passive: true })
    return () => {
      document.removeEventListener('pointermove', clearReturn)
      window.removeEventListener('scroll', cacheRects, true)
      if (returnTimerRef.current !== null) window.clearTimeout(returnTimerRef.current)
    }
  }, [])

  useEffect(() => { render() }, [strokes, render])

  // A stable dependency for the motion layer: it binds to one set of tools.
  const toolKey = JSON.stringify(markers.map((marker) => marker.id))

  useEffect(() => {
    if (!overlay) return
    const layer = layerRef.current!, root = rootRef.current!
    const motion = createToolMotion<ToolId>({
      tools: [...latestRef.current.markers.map((marker) => marker.id), ERASER_ID],
      elements: (id) => {
        const flight = layer.querySelector<HTMLElement>(`[data-melani-flight=${CSS.escape(id)}]`)!
        return {
          root: flight,
          rotation: flight.firstElementChild as HTMLElement,
          parked: root.querySelector<HTMLElement>(`[data-melani-slot=${CSS.escape(id)}] > *`) ?? undefined,
        }
      },
      restPose: (id, elements) => trayPose(id, elements.parked!),
      // Lifted out of the tray and turned to its working angle, waiting for a
      // pointer: what a keyboard user gets instead of a cursor.
      readyPose: (id, rest) => ({
        ...rest, y: rest.y - READY_LIFT, angle: restingAngle(id), scale: (rest.scale ?? 1) * 1.1,
      }),
      // Rotation is eased from travel distance before it gets here, so sparse
      // and coalesced input agree; the motion layer must not ease it again.
      weights: (id) => ({ position: id === ERASER_ID ? 0.42 : 0.12, rotation: 0 }),
    })
    motionRef.current = motion
    return () => {
      motion.destroy()
      motionRef.current = null
      // The rebuilt tray may not hold the tool that was in hand.
      activeToolRef.current = null
      pendingMoveActiveRef.current = false
      previousPointerRef.current = null
      clearReturn()
      setActiveTool(null)
    }
  }, [toolKey, overlay])

  useEffect(() => {
    const canvas = canvasRef.current!, surface = surfaceRef.current!
    const object = objectRef.current!, root = rootRef.current!
    const renderer = createBoardRenderer(canvas)
    rendererRef.current = renderer

    // The tray has moved. Tools at rest go straight home; the one in hand stays
    // in hand, waiting over its new slot, or with the pointer while it marks.
    const settleTools = () => {
      const motion = motionRef.current
      if (!motion || activeStrokeRef.current) return
      motion.dockAll({ immediate: true })
      if (activeToolRef.current) motion.ready(activeToolRef.current, { immediate: true })
    }
    const layout = () => {
      cacheRects()
      const rect = surfaceRectRef.current!
      renderer.resize(rect.width, rect.height, backingScale(
        rect.width, rect.height, window.devicePixelRatio || 1, 2,
      ))
      settleTools()
      previousPointerRef.current = null
      render()
    }
    layout()

    const observer = new ResizeObserver(layout)
    observer.observe(surface)
    observer.observe(object)
    observer.observe(root)
    // A ResizeObserver cannot fire when only the pixel density changes, which is
    // exactly what happens when the window is dragged to another monitor.
    let resolution: MediaQueryList | null = null
    const watchResolution = () => {
      resolution?.removeEventListener('change', onResolutionChange)
      resolution = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      resolution.addEventListener('change', onResolutionChange)
    }
    const onResolutionChange = () => {
      watchResolution()
      layout()
    }
    watchResolution()

    return () => {
      observer.disconnect()
      resolution?.removeEventListener('change', onResolutionChange)
      rendererRef.current = null
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [render])

  /* ── board state ──────────────────────────────────────────────────────── */

  const announce = useCallback((message: string) => {
    // A live region only speaks when its text changes, and the same action can
    // be repeated; alternate an invisible character so every action is read.
    setAnnouncement((previous) => (previous.replace('\u200b', '') === message ? `${message}\u200b` : message))
  }, [])

  const publish = useCallback((message?: string) => {
    const next = snapshotOf(historyRef.current)
    setSnapshot(next)
    latestRef.current.onStrokesChange?.(next.strokes)
    const store = storeRef.current
    let spoken = message
    if (store) {
      // Losing a board to a full or blocked store is worth interrupting for,
      // each time it starts; the strokes themselves are not announced one by one.
      const failed = store.save(next.strokes) !== 'saved'
      if (failed && !saveFailedRef.current) spoken = latestRef.current.labels.saveFailed
      saveFailedRef.current = failed
    }
    if (spoken) announce(spoken)
  }, [announce])

  // Every change starts from the drawing on show. For a controlled board that
  // is its owner's, whatever became of the one last handed out.
  const currentHistory = useCallback(() => {
    historyRef.current = reconcile(historyRef.current, latestRef.current.controlled)
    return historyRef.current
  }, [])

  const undo = useCallback(() => {
    const history = currentHistory()
    if (!history.state().canUndo) return
    history.undo()
    publish(latestRef.current.labels.undone)
  }, [currentHistory, publish])

  const redo = useCallback(() => {
    const history = currentHistory()
    if (!history.state().canRedo) return
    history.redo()
    publish(latestRef.current.labels.redone)
  }, [currentHistory, publish])

  const clear = useCallback(() => {
    const history = currentHistory()
    if (!history.state().hasMarks) return
    history.clear()
    publish(latestRef.current.labels.cleared)
  }, [currentHistory, publish])

  // One key is one drawing. Restoring replaces the board and its history: what
  // was drawn before, or under another key, is not this drawing's past. A
  // controlled board keeps showing its owner's drawing.
  const storageKey = persistence ? persistence.key : null
  useEffect(() => {
    if (!storageKey) return
    const store = createBoardPersistence(storageKey)
    storeRef.current = store
    saveFailedRef.current = false
    const replace = (next: readonly Stroke[]) => {
      historyRef.current = createGestureHistory<Stroke>(next)
      const snapshot = snapshotOf(historyRef.current)
      setSnapshot(snapshot)
      return snapshot
    }
    const restored = store.load()
    if (restored.status === 'invalid') announce(latestRef.current.labels.storageInvalid)
    if (!latestRef.current.controlled) replace(restored.strokes ?? latestRef.current.defaultStrokes ?? [])
    // Another tab saved this drawing: follow it. Not while this board's own
    // last save failed, though, because then it holds the only copy of its
    // drawing; and a controlled board shows its owner's drawing.
    const adopt = () => {
      if (latestRef.current.controlled || saveFailedRef.current) return
      const saved = store.load().strokes
      if (!saved) return
      const next = replace(saved)
      latestRef.current.onStrokesChange?.(next.strokes)
    }
    // Mid-mark, it waits for the mark to end. A mark that commits saves over
    // it, so the other tab follows this one instead.
    const follow = (event: StorageEvent) => {
      if (event.key !== storageKey || event.storageArea !== localStorage) return
      if (activeStrokeRef.current) incomingRef.current = true
      else adopt()
    }
    adoptRef.current = adopt
    window.addEventListener('storage', follow)
    return () => {
      storeRef.current = null
      adoptRef.current = null
      incomingRef.current = false
      window.removeEventListener('storage', follow)
    }
  }, [storageKey, announce])

  /* ── tools ────────────────────────────────────────────────────────────── */

  const toolScale = () =>
    Math.max(0.65, Math.min(1, surfaceRectRef.current!.width / BOARD_WIDTH))

  const inside = (rect: DOMRect | null, x: number, y: number) =>
    Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)

  const scheduleReturn = () => {
    clearReturn()
    if (!activeToolRef.current || activeStrokeRef.current) return
    returnTimerRef.current = window.setTimeout(dockAfterGrace, 600)
  }
  const moveTool = (
    clientX: number, clientY: number, held = false, contact = held,
  ) => {
    const id = activeToolRef.current
    lastPointerRef.current = { x: clientX, y: clientY }
    if (!id) return
    const previous = previousPointerRef.current
    const dx = previous ? clientX - previous.x : 0, dy = previous ? clientY - previous.y : 0
    const distance = Math.hypot(dx, dy)
    if (distance > 0.35) {
      const target = id === ERASER_ID
        ? (dx / distance) * 9 + (dy / distance) * 3
        : Math.max(-62, Math.min(-20, Math.atan2(dy, dx) * 180 / Math.PI - 42))
      // Eraser lean follows travel distance, so sparse and coalesced input agree.
      angleRef.current += (target - angleRef.current)
        * (id === ERASER_ID ? 1 - Math.exp(-distance / 22) : 0.18)
    }
    previousPointerRef.current = { x: clientX, y: clientY }
    const pose: Pose = {
      x: clientX, y: clientY, angle: angleRef.current,
      scale: (id === ERASER_ID || held ? HELD_SCALE : 0.88) * toolScale(),
    }
    if (held) {
      // Committed with the ink in the next frame, however many events arrive first.
      pendingMoveRef.current = { id, pose, contact }
      pendingMoveActiveRef.current = true
      return
    }
    pendingMoveActiveRef.current = false
    motionRef.current?.move(id, pose)
  }

  const select = useCallback((id: ToolId, source: ActivationSource) => {
    clearReturn()
    const motion = motionRef.current
    const previous = activeToolRef.current
    if (previous) motion?.dock(previous, { immediate: source === 'keyboard' })
    const next = previous === id ? null : id
    activeToolRef.current = next
    setActiveTool(next)
    previousPointerRef.current = null
    angleRef.current = restingAngle(next ?? id)
    if (!next) return
    motion?.ready(next, { immediate: source === 'keyboard' })
    const pointer = lastPointerRef.current
    if (source === 'keyboard' || !pointer) return
    cacheRects()
    moveTool(pointer.x, pointer.y, false)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !activeToolRef.current) return
      event.preventDefault()
      select(activeToolRef.current, 'keyboard')
    }
    root.addEventListener('keydown', escape)
    return () => root.removeEventListener('keydown', escape)
  }, [select])

  const [tap] = useState(createTapActivation)
  const activate = (hit: TapResult | null) => {
    if (hit) select(hit.target.dataset.melaniSlot!, hit.source)
  }

  const slotProps = {
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      tap.pointerDown(event)
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      activate(tap.pointerUp(event))
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => tap.pointerCancel(event),
    onClick: (event: ReactMouseEvent<HTMLButtonElement>) => activate(tap.click(event)),
  }

  /* ── drawing ──────────────────────────────────────────────────────────── */

  const sample = (
    event: { clientX: number; clientY: number; pointerType: string; pressure: number },
    eraser: boolean,
  ): Point | null => {
    const rect = surfaceRectRef.current!
    const within = inside(rect, event.clientX, event.clientY)
    moveTool(event.clientX, event.clientY, true, within)
    if (!within) {
      surfaceOutsideRef.current = true
      return null
    }
    const point = boardPoint(
      event.clientX - rect.left, event.clientY - rect.top, rect.width,
      event.pointerType === 'mouse' ? DEFAULT_PRESSURE : event.pressure || DEFAULT_PRESSURE,
    )
    // Only the eraser's felt turns with the hand; a nib is round.
    if (eraser) point.angle = roundTo(angleRef.current, 3)
    const breakBefore = surfaceOutsideRef.current
    surfaceOutsideRef.current = false
    if (breakBefore) point.breakBefore = true
    return point
  }

  const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || !activeToolRef.current || activeStrokeRef.current) return
    cacheRects()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerIdRef.current = event.pointerId
    surfaceOutsideRef.current = false
    const id = activeToolRef.current
    const eraser = id === ERASER_ID
    const point = sample(event, eraser)
    if (!point) return
    const marker = latestRef.current.markers.find((item) => item.id === id) ?? latestRef.current.markers[0]
    // Tools are drawn at a screen scale; their footprint has to stay in board units.
    // On a very small board that footprint can outgrow what a saved board may
    // hold, so it is capped to stay loadable.
    const size = toolScale() / (surfaceRectRef.current!.width / BOARD_WIDTH)
    const footprint = (value: number) => roundTo(Math.min(MAX_TOOL_SIZE, value * size), 2)
    activeStrokeRef.current = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tool: eraser ? 'eraser' : 'marker',
      color: marker?.ink ?? '#1b2022',
      width: footprint(eraser ? ERASER_WIDTH * HELD_SCALE : MARKER_WIDTH),
      ...(eraser ? { height: footprint(ERASER_HEIGHT * HELD_SCALE) } : {}),
      points: [point],
    }
    render()
  }

  const extendStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary) return
    if (activeStrokeRef.current && event.pointerId === pointerIdRef.current) {
      const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? []
      const eraser = activeStrokeRef.current.tool === 'eraser'
      for (const input of coalesced.length ? coalesced : [event.nativeEvent]) {
        const point = sample(input, eraser)
        if (point) activeStrokeRef.current.points.push(point)
      }
      scheduleRender()
      return
    }
    if (!activeStrokeRef.current) moveTool(event.clientX, event.clientY)
  }

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerId !== pointerIdRef.current || !activeStrokeRef.current) return
    const stroke = activeStrokeRef.current
    const cancelled = event.type !== 'pointerup'
    if (!cancelled) {
      const point = sample(event, stroke.tool === 'eraser')
      const last = stroke.points.at(-1)!
      if (point && (last.x !== point.x || last.y !== point.y || point.breakBefore)) stroke.points.push(point)
    }
    activeStrokeRef.current = null
    pointerIdRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    moveTool(event.clientX, event.clientY)
    const outsideRoot = !inside(rootRectRef.current, event.clientX, event.clientY)
    if (event.pointerType === 'touch' || cancelled) motionRef.current?.dockAll()
    const incoming = incomingRef.current
    incomingRef.current = false
    if (cancelled) {
      render()
      if (incoming) adoptRef.current?.()
      return
    }
    currentHistory().commit([stroke])
    publish()
    if (outsideRoot) scheduleReturn()
  }

  /* ── surroundings ─────────────────────────────────────────────────────── */

  const writeLight = (element: HTMLElement | null, x: string, y: string) => {
    if (!element) return
    const style = element.style
    if (style.getPropertyValue('--melani-light-x') !== x) style.setProperty('--melani-light-x', x)
    if (style.getPropertyValue('--melani-light-y') !== y) style.setProperty('--melani-light-y', y)
  }
  const onObjectPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return
    clearReturn()
    const object = objectRectRef.current!
    const lightX = `${((event.clientX - object.left) / object.width) * 100}%`
    const lightY = `${((event.clientY - object.top) / object.height) * 100}%`
    writeLight(lightRef.current, lightX, lightY)
    writeLight(sheenRef.current, lightX, lightY)
    if (event.target !== canvasRef.current && !activeStrokeRef.current) {
      moveTool(event.clientX, event.clientY)
    }
  }
  const onObjectPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeStrokeRef.current && !objectRef.current?.contains(event.relatedTarget as Node | null)) {
      scheduleReturn()
      previousPointerRef.current = null
    }
  }


  /* ── export ───────────────────────────────────────────────────────────── */

  const toBlob = useCallback(async (type = 'image/png') => {
    const source = canvasRef.current
    if (!source) throw new Error('The board is not mounted')
    const exported = document.createElement('canvas')
    exported.width = source.width
    exported.height = source.height
    const ctx = exported.getContext('2d')!
    ctx.fillStyle = getComputedStyle(source).getPropertyValue('--melani-board-paper').trim() || '#f7f8f6'
    ctx.fillRect(0, 0, exported.width, exported.height)
    ctx.drawImage(source, 0, 0)
    return await new Promise<Blob>((resolve, reject) => {
      exported.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('The board could not be exported'))),
        type,
      )
    })
  }, [])

  const save = useCallback(() => {
    void toBlob().then((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = exportFileName
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }, () => announce(latestRef.current.labels.exportFailed))
  }, [toBlob, exportFileName, announce])

  useImperativeHandle(ref, () => ({
    undo, redo, clear, toBlob,
    // A copy: the history keeps changing its own array.
    getStrokes: () => latestRef.current.controlled ?? [...historyRef.current.strokes()],
  }), [undo, redo, clear, toBlob])

  return {
    rootRef, objectRef, surfaceRef, lightRef, sheenRef, canvasRef, layerRef,
    activeTool, announcement,
    canUndo: synced && snapshot.canUndo, canRedo: synced && snapshot.canRedo, hasMarks: strokes.length > 0,
    slotProps,
    surfaceProps: {
      onPointerDown: beginStroke,
      onPointerMove: extendStroke,
      onPointerUp: finishStroke,
      onPointerCancel: finishStroke,
      onLostPointerCapture: finishStroke,
    },
    objectProps: {
      onPointerEnter: cacheRects,
      onPointerMove: onObjectPointerMove,
      onPointerLeave: onObjectPointerLeave,
    },
    undo, redo, clear, save,
  }
}
