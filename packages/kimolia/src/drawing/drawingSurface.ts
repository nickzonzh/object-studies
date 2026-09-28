import { createChalkBrushes } from './chalkBrush.js'
import { CHALK_WIDTH, createChalkSampler } from './chalkSampler.js'
import { clipSegment } from './clip.js'
import { createDusterSampler } from './dusterSampler.js'
import { createDusterRenderer } from './dusterRenderer.js'
import type {
  ChalkColor,
  ChalkPoint,
  DrawingStroke,
  DrawingTool,
} from './types.js'
import {
  backingScale,
  createCooperativeTask,
  createGestureHistory,
  createReplayCache,
  CHECKPOINT_INTERVAL,
  type HistoryState,
} from 'object-studies-core'

export type DrawingSurfaceOptions = {
  onChange: (state: HistoryState, strokes: readonly DrawingStroke[]) => void
  initial?: readonly DrawingStroke[]
  onBusy?: (busy: boolean) => void
  /**
   * Shows the last finished picture while a long replay rebuilds the drawing
   * out of sight, so a reload, resize or undo never plays the chalk back.
   */
  curtain?: HTMLCanvasElement | null
  /** Chalk colours resolved from the theme, so marks match the sticks. */
  colors?: Record<ChalkColor, string>
}

export function createDrawingSurface(
  canvas: HTMLCanvasElement,
  { onChange, initial = [], onBusy = () => {}, colors, curtain }: DrawingSurfaceOptions,
) {
  const ctx = canvas.getContext('2d')!
  const brushes = createChalkBrushes(colors)
  const duster = createDusterRenderer(canvas)
  let history = createGestureHistory(initial)
  const cache = createReplayCache<DrawingStroke>(canvas)
  let waiting: (() => void)[] = []
  const replayTask = createCooperativeTask((busy) => {
    if (curtain) {
      curtain.hidden = !busy
      canvas.style.visibility = busy ? 'hidden' : ''
    }
    onBusy(busy)
    if (busy) return
    const done = waiting
    waiting = []
    for (const resolve of done) resolve()
  })
  // Whether the canvas holds a finished picture rather than a replay in progress.
  let complete = true
  let gesture: DrawingStroke[] = []
  let active: DrawingStroke | null = null
  let sampler: {
    add: (point: ChalkPoint) => void
    end: () => void
    flush: () => void
  } | null = null
  let width = 1
  let height = 1
  let dpr = 1
  let id = initial.reduce((max, stroke) => Math.max(max, stroke.id), 0)
  let lastInput: ChalkPoint | null = null
  let tool: DrawingTool | null = null
  let footprint = { width: 126, height: 48 }
  const changed = () => onChange(history.state(), history.strokes())

  const makeSampler = (stroke: DrawingStroke) => {
    if (stroke.tool === 'duster') {
      const painter = duster.begin(stroke)
      const samples = createDusterSampler(
        stroke.height,
        painter.stamp,
        painter.nextPass,
      )
      return {
        add: samples.add,
        end() {
          samples.end()
          painter.flush()
        },
        flush: painter.flush,
      }
    }
    ctx.setTransform(
      (dpr * width) / stroke.space.width,
      0,
      0,
      (dpr * height) / stroke.space.height,
      0,
      0,
    )
    const chalk = createChalkSampler(stroke.width, stroke.seed, (stamp) => {
      brushes.stamp(ctx, stroke.color, stamp)
    })
    return { ...chalk, flush() {} }
  }
  const endStroke = () => {
    sampler?.end()
    sampler = null
    active = null
  }
  const end = () => {
    endStroke()
    lastInput = null
    tool = null
    if (gesture.length) {
      const previousCount = history.strokes().length
      history.commit(gesture)
      gesture = []
      cache.capture(
        history.strokes(),
        Math.floor(history.strokes().length / CHECKPOINT_INTERVAL) >
          Math.floor(previousCount / CHECKPOINT_INTERVAL),
      )
      changed()
    }
  }
  const beginStroke = (chosen: DrawingTool, point: ChalkPoint) => {
    const common = {
      id: ++id,
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
      space: { width, height },
      points: [point],
    }
    active =
      chosen === 'duster'
        ? { ...common, tool: 'duster', ...footprint }
        : {
            ...common,
            tool: 'chalk',
            color: chosen,
            width: Math.max(
              CHALK_WIDTH.min,
              Math.min(CHALK_WIDTH.max, width * 0.0075),
            ),
          }
    gesture.push(active)
    sampler = makeSampler(active)
    sampler.add(point)
    sampler.flush()
  }
  const addPoint = (point: ChalkPoint) => {
    if (!active || !sampler) return
    const previous = active.points[active.points.length - 1]
    if (point.x === previous.x && point.y === previous.y) return
    active.points.push(point)
    sampler.add(point)
  }
  const clearPixels = () => {
    ctx.resetTransform()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  // Copied before pixels are cleared or resized. A replay interrupted by another
  // keeps the curtain it already had instead of copying its half-drawn canvas.
  const hold = () => {
    if (!curtain || !complete) return
    curtain.width = canvas.width
    curtain.height = canvas.height
    curtain.getContext('2d')!.drawImage(canvas, 0, 0)
  }
  function* replaySteps() {
    complete = false
    clearPixels()
    const strokes = history.strokes()
    const start = cache.restore(strokes)
    yield
    for (let index = start; index < strokes.length; index++) {
      const stroke = strokes[index]
      const samples = makeSampler(stroke)
      for (const point of stroke.points) {
        samples.add(point)
        yield
      }
      samples.end()
      if ((index + 1) % CHECKPOINT_INTERVAL === 0)
        cache.capture(strokes.slice(0, index + 1), true)
      yield
    }
    cache.capture(strokes)
    complete = true
  }
  const replay = () => {
    hold()
    replayTask.run(replaySteps())
  }
  return {
    state: () => history.state(),
    strokes: () => history.strokes(),
    isBusy: replayTask.isBusy,
    /**
     * Resolves when the current replay finishes or is cancelled. Another may
     * already have started by then, so callers check `isBusy` again.
     */
    settled: () =>
      replayTask.isBusy()
        ? new Promise<void>((resolve) => waiting.push(resolve))
        : Promise.resolve(),
    begin(
      chosen: DrawingTool,
      point: ChalkPoint,
      size?: { width: number; height: number },
    ) {
      if (replayTask.isBusy()) return
      end()
      if (chosen === 'duster' && !history.state().hasMarks) return
      tool = chosen
      if (size) footprint = size
      lastInput = point
      beginStroke(chosen, point)
    },
    add(point: ChalkPoint) {
      if (!lastInput || !tool) return
      const segment = clipSegment(lastInput, point, width, height)
      if (segment) {
        if (!active) beginStroke(tool, segment.from)
        addPoint(segment.to)
        if (segment.leave < 1) endStroke()
      } else endStroke()
      lastInput = point
    },
    flush() {
      sampler?.flush()
    },
    end,
    /**
     * Replaces the drawing without reporting a change: a controlled owner is
     * pushing its own state in. Session undo history starts again from here.
     */
    setStrokes(next: readonly DrawingStroke[]) {
      end()
      replayTask.cancel()
      cache.clear()
      history = createGestureHistory(next)
      id = next.reduce((max, stroke) => Math.max(max, stroke.id), id)
      replay()
    },
    resize(nextWidth: number, nextHeight: number) {
      const safeWidth = Math.max(1, nextWidth)
      const safeHeight = Math.max(1, nextHeight)
      const nextDpr = backingScale(safeWidth, safeHeight, window.devicePixelRatio, 3)
      // Layout churn often moves a board by a fraction of a pixel without
      // changing its backing store; that must not tear down and replay the
      // whole drawing.
      if (
        dpr === nextDpr &&
        Math.round(safeWidth * nextDpr) === Math.round(width * dpr) &&
        Math.round(safeHeight * nextDpr) === Math.round(height * dpr)
      )
        return
      end()
      replayTask.cancel()
      cache.clear()
      hold()
      width = safeWidth
      height = safeHeight
      dpr = nextDpr
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      replayTask.run(replaySteps())
    },
    clear() {
      end()
      replayTask.cancel()
      if (!history.state().hasMarks) return
      history.clear()
      clearPixels()
      complete = true
      changed()
    },
    undo() {
      end()
      if (!history.state().canUndo) return
      history.undo()
      replay()
      changed()
    },
    redo() {
      end()
      if (!history.state().canRedo) return
      history.redo()
      replay()
      changed()
    },
    destroy() {
      replayTask.cancel()
      end()
      brushes.clear()
      duster.destroy()
      cache.clear()
    },
  }
}
