import type { Hsl } from './materials.js'

export type Rgb = [number, number, number]

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** An HSL colour as CSS, optionally lightened (`dl`) or saturated (`ds`) by percentage points. */
export function hsla([h, s, l]: Hsl, alpha = 1, dl = 0, ds = 0): string {
  return `hsla(${h.toFixed(1)}, ${clamp(s + ds, 0, 100).toFixed(1)}%, ${clamp(l + dl, 0, 100).toFixed(1)}%, ${alpha})`
}

/** Reads `#rgb`, `#rrggbb` or `rgb()`. Anything else is oxblood. */
export function parseColour(colour: string): Rgb {
  const hex = colour.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1]
    return [parseInt(digits.slice(0, 2), 16), parseInt(digits.slice(2, 4), 16), parseInt(digits.slice(4, 6), 16)]
  }
  const rgb = colour.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : [122, 31, 31]
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function rgb(colour: Rgb): string {
  return `rgb(${colour.map((c) => Math.round(clamp(c, 0, 255))).join(', ')})`
}

export const WHITE: Rgb = [255, 255, 255]
export const BLACK: Rgb = [0, 0, 0]
