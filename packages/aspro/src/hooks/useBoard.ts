import {
  useCallback, useEffect, useImperativeHandle, useRef, useState,
  type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  createGestureHistory, createTapActivation, createToolMotion,
  type ActivationSource, type GestureHistory, type Pose,
  type TapResult, type ToolMotion,
} from 'object-studies-core'
import {
  BOARD_WIDTH, ERASER_HEIGHT, ERASER_WIDTH, boardPoint, createBoardRenderer,
  type BoardRenderer, type Point, type Stroke,
} from '../lib/strokes.js'
import { createBoardPersistence, type BoardPersistence } from '../lib/persistence.js'
import { ERASER_ID, MARKER_REST_ANGLE, restingAngle, trayPose } from '../lib/tools.js'
import type { ToolId, WhiteboardLabels, WhiteboardProps } from '../types.js'

type BoardOptions = Required<Pick<WhiteboardProps, 'markers' | 'persistence' | 'exportFileName'>>
  & Pick<WhiteboardProps, 'defaultStrokes' | 'strokes' | 'onStrokesChange' | 'ref'>
  & { labels: WhiteboardLabels }

type Snapshot = {
  strokes: readonly Stroke[]
  canUndo: boolean
  canRedo: boolean
  hasMarks: boolean
}

const MAX_DPR = 2
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
  onStrokesChange, labels, ref,
}: BoardOptions) {
  const rootRef = useRef<HTMLDivElement>(null)
  const objectRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const rendererRef = useRef<BoardRenderer | null>(null)
  const motionRef = useRef<ToolMotion<ToolId> | null>(null)
  const storeRef = useRef<BoardPersistence | null>(null)
  const [initialHistory] = useState(() =>
    createGestureHistory<Stroke>(defaultStrokes ?? controlled ?? []))
  const historyRef = useRef(initialHistory)

  const [snapshot, setSnapshot] = useState<Snapshot>(() => snapshotOf(initialHistory))
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const saveFailedRef = useRef(false)
  const [announcement, setAnnouncement] = useState('')

  const strokes = controlled ?? snapshot.strokes
  // What the handlers and the render loop need to see, without re-binding them.
  const latestRef = useRef({ strokes, labels, onStrokesChange, markers })
  // The last drawing this board handed out, so a controlled owner echoing it
  // back is not mistaken for a replacement.
  const publishedRef = useRef(controlled)
  useEffect(() => {
    latestRef.current = { strokes, labels, onStrokesChange, markers }
  })

  const activeToolRef = useRef<ToolId | null>(null)
  const activeStrokeRef = useRef<Stroke | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingMoveRef = useRef<[ToolId, Pose, boolean] | null>(null)
  const previousPointerRef = useRef<{ x: number; y: number } | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const angleRef = useRef(MARKER_REST_ANGLE)
  const returnTimerRef = useRef<number | null>(null)
  const surfaceOutsideRef = useRef(false)
  // Layout is read once per pointer event, never once per coalesced sample.
  const surfaceRectRef = useRef<DOMRect | null>(null)
  const objectRectRef = useRef<DOMRect | null>(null)

  /* ── painting ─────────────────────────────────────────────────────────── */

  const render = useCallback(() => {
    rendererRef.current?.render(latestRef.current.strokes, activeStrokeRef.current)
    // Commit nib position and fresh ink in the same frame, including coalesced input.
    if (!pendingMoveRef.current) return
    motionRef.current?.move(...pendingMoveRef.current)
    pendingMoveRef.current = null
  }, [])

  const scheduleRender = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      render()
    })
  }, [render])
  useEffect(() => {
    const clearReturn = (event: PointerEvent) => {
      const root = rootRef.current
      if (!root?.contains(event.target as Node)) return
      if (returnTimerRef.current !== null) {
        window.clearTimeout(returnTimerRef.current)
        returnTimerRef.current = null
      }
    }
    document.addEventListener('pointermove', clearReturn)
    return () => {
      document.removeEventListener('pointermove', clearReturn)
      if (returnTimerRef.current !== null) window.clearTimeout(returnTimerRef.current)
    }
  }, [])

  useEffect(() => { render() }, [strokes, render])

  // A stable dependency for the motion layer: it binds to one set of tools.
  const toolKey = JSON.stringify(markers.map((marker) => marker.id))

  useEffect(() => {
    const canvas = canvasRef.current!, surface = surfaceRef.current!, root = rootRef.current!
    const renderer = createBoardRenderer(canvas)
    const motion = createToolMotion<ToolId>({
      tools: [...latestRef.current.markers.map((marker) => marker.id), ERASER_ID],
      elements: (id) => {
        const flight = root.querySelector<HTMLElement>(`[data-aspro-flight=${CSS.escape(id)}]`)!
        return {
          root: flight,
          rotation: flight.firstElementChild as HTMLElement,
          parked: root.querySelector<HTMLElement>(`[data-aspro-slot=${CSS.escape(id)}] > *`) ?? undefined,
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
    rendererRef.current = renderer
    motionRef.current = motion

    const layout = () => {
      const rect = surface.getBoundingClientRect()
      surfaceRectRef.current = rect
      renderer.resize(rect.width, rect.height, Math.min(MAX_DPR, window.devicePixelRatio || 1))
      motion.dockAll(true)
      previousPointerRef.current = null
      render()
    }
    layout()

    const observer = new ResizeObserver(layout)
    observer.observe(surface)
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
      motion.destroy()
      rendererRef.current = null
      motionRef.current = null
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [toolKey, render])

  /* ── board state ──────────────────────────────────────────────────────── */

  const announce = useCallback((message: string) => {
    // A live region only speaks when its text changes, and the same action can
    // be repeated; alternate an invisible character so every action is read.
    setAnnouncement((previous) => (previous.replace('\u200b', '') === message ? `${message}\u200b` : message))
  }, [])

  const publish = useCallback((message?: string) => {
    const history = historyRef.current
    const next = snapshotOf(history)
    publishedRef.current = next.strokes
    setSnapshot(next)
    latestRef.current.onStrokesChange?.(next.strokes)
    const store = storeRef.current
    let spoken = message
    // Losing a board to a full or blocked store is worth interrupting for; the
    // strokes themselves are not announced one by one.
    if (store && store.save(next.strokes) !== 'saved' && !saveFailedRef.current) {
      saveFailedRef.current = true
      spoken = latestRef.current.labels.saveFailed
    }
    if (spoken) announce(spoken)
  }, [announce])

  const undo = useCallback(() => {
    const history = historyRef.current
    if (!history.state().canUndo) return
    history.undo()
    publish(latestRef.current.labels.undone)
  }, [publish])

  const redo = useCallback(() => {
    const history = historyRef.current
    if (!history.state().canRedo) return
    history.redo()
    publish(latestRef.current.labels.redone)
  }, [publish])

  const clear = useCallback(() => {
    const history = historyRef.current
    if (!history.state().hasMarks) return
    history.clear()
    publish(latestRef.current.labels.cleared)
  }, [publish])

  const storageKey = persistence ? persistence.key : null
  useEffect(() => {
    if (!storageKey) return
    const store = createBoardPersistence(storageKey)
    storeRef.current = store
    const restored = store.load()
    saveFailedRef.current = false
    if (restored.strokes?.length) {
      historyRef.current = createGestureHistory<Stroke>(restored.strokes)
      setSnapshot(snapshotOf(historyRef.current))
    }
    return () => { storeRef.current = null }
  }, [storageKey])

  // A controlled board follows its prop. A drawing the owner replaced is a
  // different document, not an undo step — but the drawings we handed them and
  // got back unchanged are exactly the ones we already have.
  useEffect(() => {
    if (!controlled || controlled === publishedRef.current) return
    publishedRef.current = controlled
    historyRef.current = createGestureHistory<Stroke>(controlled)
    setSnapshot(snapshotOf(historyRef.current))
  }, [controlled])

  /* ── tools ────────────────────────────────────────────────────────────── */

  const measure = () => {
    surfaceRectRef.current = surfaceRef.current!.getBoundingClientRect()
    objectRectRef.current = objectRef.current!.getBoundingClientRect()
  }

  const toolScale = () =>
    Math.max(0.65, Math.min(1, surfaceRectRef.current!.width / BOARD_WIDTH))

  const inside = (rect: DOMRect | null, x: number, y: number) =>
    Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)

  const clearReturn = () => {
    if (returnTimerRef.current !== null) {
      window.clearTimeout(returnTimerRef.current)
      returnTimerRef.current = null
    }
  }

  const scheduleReturn = () => {
    clearReturn()
    if (!activeToolRef.current || activeStrokeRef.current) return
    returnTimerRef.current = window.setTimeout(() => {
      returnTimerRef.current = null
      if (!activeToolRef.current || activeStrokeRef.current) return
      motionRef.current?.dockAll()
      activeToolRef.current = null
      setActiveTool(null)
      previousPointerRef.current = null
    }, 600)
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
      pendingMoveRef.current = [id, pose, contact]
      return
    }
    pendingMoveRef.current = null
    motionRef.current?.move(id, pose, false)
  }

  const select = useCallback((id: ToolId, source: ActivationSource) => {
    clearReturn()
    const motion = motionRef.current
    const previous = activeToolRef.current
    if (previous) motion?.dock(previous, source === 'keyboard')
    const next = previous === id ? null : id
    activeToolRef.current = next
    setActiveTool(next)
    previousPointerRef.current = null
    angleRef.current = restingAngle(next ?? id)
    if (!next) return
    motion?.ready(next, source === 'keyboard')
    const pointer = lastPointerRef.current
    if (source === 'keyboard' || !pointer) return
    measure()
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
    if (hit) select(hit.target.dataset.asproSlot!, hit.source)
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
  ): Point | null => {
    const rect = surfaceRectRef.current!
    const within = inside(rect, event.clientX, event.clientY)
    moveTool(event.clientX, event.clientY, true, within)
    if (!within) {
      surfaceOutsideRef.current = true
      return null
    }
    const point = {
      ...boardPoint(event.clientX - rect.left, event.clientY - rect.top, rect.width),
      pressure: event.pointerType === 'mouse' ? 0.5 : event.pressure || 0.5,
      angle: angleRef.current,
      ...(surfaceOutsideRef.current ? { breakBefore: true } : {}),
    }
    surfaceOutsideRef.current = false
    return point
  }

  const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || !activeToolRef.current || activeStrokeRef.current) return
    measure()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerIdRef.current = event.pointerId
    surfaceOutsideRef.current = false
    const point = sample(event)
    if (!point) return
    const id = activeToolRef.current
    const eraser = id === ERASER_ID
    const marker = latestRef.current.markers.find((item) => item.id === id) ?? latestRef.current.markers[0]
    // Tools are drawn at a screen scale; their footprint has to stay in board units.
    const size = toolScale() / (surfaceRectRef.current!.width / BOARD_WIDTH)
    activeStrokeRef.current = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tool: eraser ? 'eraser' : 'marker',
      color: marker?.ink ?? '#1b2022',
      width: (eraser ? ERASER_WIDTH : MARKER_WIDTH) * (eraser ? HELD_SCALE : 1) * size,
      ...(eraser ? { height: ERASER_HEIGHT * HELD_SCALE * size } : {}),
      points: [point],
    }
    render()
  }

  const extendStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary) return
    measure()
    if (activeStrokeRef.current && event.pointerId === pointerIdRef.current) {
      const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? []
      for (const input of coalesced.length ? coalesced : [event.nativeEvent]) {
        const point = sample(input)
        if (point) activeStrokeRef.current.points.push(point)
      }
      scheduleRender()
      return
    }
    if (!activeStrokeRef.current) moveTool(event.clientX, event.clientY)
  }

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerId !== pointerIdRef.current || !activeStrokeRef.current) return
    measure()
    const stroke = activeStrokeRef.current
    const cancelled = event.type !== 'pointerup'
    if (!cancelled) {
      const point = sample(event)
      const last = stroke.points.at(-1)!
      if (point && (last.x !== point.x || last.y !== point.y || point.breakBefore)) stroke.points.push(point)
    }
    activeStrokeRef.current = null
    pointerIdRef.current = null
    surfaceOutsideRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    moveTool(event.clientX, event.clientY)
    const outsideRoot = !inside(rootRef.current?.getBoundingClientRect() ?? null, event.clientX, event.clientY)
    if (event.pointerType === 'touch' || cancelled) motionRef.current?.dockAll()
    if (cancelled) {
      render()
      return
    }
    historyRef.current.commit([stroke])
    publish()
    if (outsideRoot) scheduleReturn()
  }

  /* ── surroundings ─────────────────────────────────────────────────────── */

  const onObjectPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return
    clearReturn()
    // The drawing handler has already measured this event.
    if (!activeStrokeRef.current) measure()
    const object = objectRectRef.current!
    const light = objectRef.current!.style
    light.setProperty('--aspro-light-x', `${((event.clientX - object.left) / object.width) * 100}%`)
    light.setProperty('--aspro-light-y', `${((event.clientY - object.top) / object.height) * 100}%`)
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
    ctx.fillStyle = getComputedStyle(source).getPropertyValue('--aspro-board-paper').trim() || '#f7f8f6'
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
    })
  }, [toBlob, exportFileName])

  useImperativeHandle(ref, () => ({
    undo, redo, clear, toBlob, getStrokes: () => latestRef.current.strokes,
  }), [undo, redo, clear, toBlob])

  return {
    rootRef, objectRef, surfaceRef, canvasRef,
    activeTool, announcement,
    canUndo: snapshot.canUndo, canRedo: snapshot.canRedo, hasMarks: strokes.length > 0,
    slotProps,
    surfaceProps: {
      onPointerDown: beginStroke,
      onPointerMove: extendStroke,
      onPointerUp: finishStroke,
      onPointerCancel: finishStroke,
      onLostPointerCapture: finishStroke,
    },
    objectProps: {
      onPointerMove: onObjectPointerMove,
      onPointerLeave: onObjectPointerLeave,
    },
    undo, redo, clear, save,
  }
}
