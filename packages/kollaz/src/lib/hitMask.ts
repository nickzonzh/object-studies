type Box = { x: number; y: number; width: number; height: number }

/**
 * Inside-test for many points against one shape: the shape is drawn once at one
 * pixel per table unit, then each point is a lookup. A cut can land among tens of
 * thousands of glitter flakes, where testing each against the exact outline takes
 * hundreds of milliseconds. Exact to about a unit, well inside a flake.
 */
export function hitMask(path: Path2D, box: Box) {
  const x0 = Math.floor(box.x)
  const y0 = Math.floor(box.y)
  const width = Math.max(1, Math.ceil(box.x + box.width) - x0)
  const height = Math.max(1, Math.ceil(box.y + box.height) - y0)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.translate(-x0, -y0)
  ctx.fill(path, 'evenodd')
  const alpha = ctx.getImageData(0, 0, width, height).data
  return (x: number, y: number) => {
    const px = Math.floor(x) - x0
    const py = Math.floor(y) - y0
    if (px < 0 || py < 0 || px >= width || py >= height) return false
    return alpha[(py * width + px) * 4 + 3] > 127
  }
}
