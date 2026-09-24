export type Point = { x: number; y: number }
export type Rect = { left: number; top: number; width: number; height: number }
/** A held tool's position, its rotation and (optionally) its display scale. */
export type Pose = Point & { angle: number; scale?: number }
/**
 * Per-frame retention factors at 60Hz: the share of the remaining distance a
 * tool keeps after one frame. Smaller follows the pointer harder.
 */
export type PoseWeights = { position: number; rotation: number }

export function clampPoint(point: Point, rect: Rect): Point {
  return {
    x: Math.max(rect.left, Math.min(rect.left + rect.width, point.x)),
    y: Math.max(rect.top, Math.min(rect.top + rect.height, point.y)),
  }
}

/**
 * Time-normalized easing keeps the same weight at 60Hz and 120Hz. `snap` puts
 * the position exactly on target (a tool in contact cannot lag the pointer)
 * while rotation keeps its material weight.
 */
export function advancePose(
  current: Pose,
  target: Pose,
  elapsed: number,
  weights: PoseWeights,
  snap = false,
): Pose {
  const frames = Math.min(64, Math.max(0, elapsed)) / (1000 / 60)
  const position = snap ? 1 : 1 - weights.position ** frames
  const rotation = 1 - weights.rotation ** frames
  const pose: Pose = {
    x: current.x + (target.x - current.x) * position,
    y: current.y + (target.y - current.y) * position,
    angle: current.angle + (target.angle - current.angle) * rotation,
  }
  if (current.scale !== undefined && target.scale !== undefined)
    pose.scale = current.scale + (target.scale - current.scale) * rotation
  else if (target.scale !== undefined) pose.scale = target.scale
  return pose
}

export function settled(a: Pose, b: Pose): boolean {
  return (
    Math.abs(a.x - b.x) < 0.05 &&
    Math.abs(a.y - b.y) < 0.05 &&
    Math.abs(a.angle - b.angle) < 0.02 &&
    Math.abs((a.scale ?? 1) - (b.scale ?? 1)) < 0.002
  )
}
