/** One 4K frame: the most pixels any single board canvas is allowed to hold. */
export const MAX_BACKING_PIXELS = 3840 * 2160

/**
 * Device pixels per CSS pixel for a board canvas. Follows the display up to
 * `maxScale`, then lowers the scale only as far as needed to keep one backing
 * store within `maxPixels`, so a board spread across a large high-density
 * screen cannot allocate hundreds of megabytes across its layers. Ordinary
 * boards are never affected: a 1600×1000 board still gets 2×.
 */
export function backingScale(
  width: number,
  height: number,
  devicePixelRatio: number,
  maxScale: number,
  maxPixels = MAX_BACKING_PIXELS,
): number {
  const wanted = Math.min(maxScale, Math.max(1, devicePixelRatio || 1))
  const area = width * height
  if (area <= 0 || area * wanted * wanted <= maxPixels) return wanted
  return Math.max(1, Math.sqrt(maxPixels / area))
}
