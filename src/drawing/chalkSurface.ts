import { createChalkBrushes, paintStamp } from './chalkBrush'
import { createChalkSampler } from './chalkSampler'
import { clipSegment } from './clip'
import type { ChalkColor, ChalkPoint, ChalkStroke } from './types'

export function createChalkSurface(
  canvas: HTMLCanvasElement,
  onChange: (hasMarks: boolean) => void,
) {
  const ctx = canvas.getContext('2d')!
  const brushes = createChalkBrushes()
  const strokes: ChalkStroke[] = []
  let active: ChalkStroke | null = null
  let sampler: ReturnType<typeof createChalkSampler> | null = null
  let width = 1
  let height = 1
  let dpr = 1
  let id = 0
  let lastInput: ChalkPoint | null = null
  let color: ChalkColor | null = null

  const makeSampler = (stroke: ChalkStroke) => {
    ctx.setTransform(
      (dpr * width) / stroke.space.width,
      0,
      0,
      (dpr * height) / stroke.space.height,
      0,
      0,
    )
    return createChalkSampler(stroke.width, stroke.seed, (stamp) => {
      paintStamp(ctx, brushes.get(stroke.color)!, stroke.color, stamp)
    })
  }
  const endStroke = () => {
    sampler?.end()
    sampler = null
    active = null
  }
  const end = () => {
    endStroke()
    lastInput = null
    color = null
  }
  const beginStroke = (chalk: ChalkColor, point: ChalkPoint) => {
    active = {
      id: ++id,
      tool: 'chalk',
      color: chalk,
      width: Math.max(4.5, Math.min(7.5, width * 0.0075)),
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
      space: { width, height },
      points: [point],
    }
    strokes.push(active)
    sampler = makeSampler(active)
    sampler.add(point)
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
    begin(chalk: ChalkColor, point: ChalkPoint) {
      end()
      color = chalk
      lastInput = point
      beginStroke(chalk, point)
    },
    add(point: ChalkPoint) {
      if (!lastInput || !color) return
      const segment = clipSegment(lastInput, point, width, height)
      if (segment) {
        if (!active) beginStroke(color, segment.from)
        addPoint(segment.to)
        if (segment.leave < 1) endStroke()
      } else endStroke()
      lastInput = point
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
    },
  }
}
