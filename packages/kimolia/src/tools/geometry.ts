import type { Point, Pose } from './types.ts'

export function clampPoint(
  point: Point,
  rect: { left: number; top: number; width: number; height: number },
): Point {
  return {
    x: Math.max(rect.left, Math.min(rect.left + rect.width, point.x)),
    y: Math.max(rect.top, Math.min(rect.top + rect.height, point.y)),
  }
}

// Time-normalized easing keeps the same weight at 60Hz and 120Hz.
export function advancePose(
  current: Pose,
  target: Pose,
  elapsed: number,
  duster: boolean,
  contact: boolean,
): Pose {
  const frames = Math.min(64, Math.max(0, elapsed)) / (1000 / 60)
  const position = contact ? 1 : 1 - (duster ? 0.48 : 0.1) ** frames
  const rotation = 1 - (duster ? 0.82 : 0.76) ** frames
  return {
    x: current.x + (target.x - current.x) * position,
    y: current.y + (target.y - current.y) * position,
    angle: current.angle + (target.angle - current.angle) * rotation,
  }
}

export function settled(a: Pose, b: Pose): boolean {
  return (
    Math.abs(a.x - b.x) < 0.05 &&
    Math.abs(a.y - b.y) < 0.05 &&
    Math.abs(a.angle - b.angle) < 0.02
  )
}
