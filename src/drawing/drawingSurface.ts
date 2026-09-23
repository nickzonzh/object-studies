import { createChalkBrushes, paintStamp } from './chalkBrush'
import { createChalkSampler } from './chalkSampler'
import { clipSegment } from './clip'
import { createDusterSampler } from './dusterSampler'
import { createDusterRenderer } from './dusterRenderer'
import type { ChalkPoint, DrawingStroke, DrawingTool } from './types'

export function createDrawingSurface(
  canvas: HTMLCanvasElement,
  onChange: (hasMarks: boolean) => void,
) {
  const ctx = canvas.getContext('2d')!
  const brushes = createChalkBrushes()
  const duster = createDusterRenderer(canvas)
  const strokes: DrawingStroke[] = []
  let active: DrawingStroke | null = null
  let sampler: {
    add: (point: ChalkPoint) => void
    end: () => void
    flush: () => void
  } | null = null
  let width = 1
  let height = 1
  let dpr = 1
  let id = 0
  let lastInput: ChalkPoint | null = null
  let tool: DrawingTool | null = null
  let footprint = { width: 126, height: 48 }

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
      paintStamp(ctx, brushes.get(stroke.color)!, stroke.color, stamp)
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
            width: Math.max(4.5, Math.min(7.5, width * 0.0075)),
          }
    strokes.push(active)
    sampler = makeSampler(active)
    sampler.add(point)
    sampler.flush()
    if (strokes.length === 1) onChange(true)
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
  return {
    begin(
      chosen: DrawingTool,
      point: ChalkPoint,
      size?: { width: number; height: number },
    ) {
      end()
      if (chosen === 'duster' && strokes.length === 0) return
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
    resize(nextWidth: number, nextHeight: number) {
      const nextDpr = Math.min(window.devicePixelRatio || 1, 3)
      if (width === nextWidth && height === nextHeight && dpr === nextDpr)
        return
      end()
      width = Math.max(1, nextWidth)
      height = Math.max(1, nextHeight)
      dpr = nextDpr
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      for (const stroke of strokes) {
        const replay = makeSampler(stroke)
        stroke.points.forEach((point) => replay.add(point))
        replay.end()
      }
    },
    clear() {
      end()
      strokes.length = 0
      clearPixels()
      onChange(false)
    },
    destroy() {
      end()
      strokes.length = 0
      brushes.clear()
      duster.destroy()
    },
  }
}
