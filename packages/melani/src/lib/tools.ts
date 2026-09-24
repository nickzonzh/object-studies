import type { Pose } from 'object-studies-core'
import type { CSSProperties } from 'react'
import type { Marker, ToolId } from '../types.js'

export const ERASER_ID = 'eraser'

/**
 * Intrinsic geometry of a tool's artwork, in design pixels. CSS lays the parts
 * out inside this box (in container units, so the whole tool scales with it)
 * and the motion layer needs the same numbers to put a nib under the pointer.
 */
export type ToolArt = {
  width: number
  height: number
  /** Contact point — marker nib, felt centre — inside the art box. */
  tipX: number
  tipY: number
}

export const MARKER_ART: ToolArt = { width: 142, height: 24, tipX: -3, tipY: 12.5 }
export const ERASER_ART: ToolArt = { width: 94, height: 42, tipX: 47, tipY: 25 }

/** One source of truth: the stylesheet reads these, the motion layer imports them. */
export const TOOL_VARIABLES = {
  '--melani-marker-width': `${MARKER_ART.width}px`,
  '--melani-marker-ratio': `${MARKER_ART.width} / ${MARKER_ART.height}`,
  '--melani-marker-tip-x': `${MARKER_ART.tipX}px`,
  '--melani-marker-tip-y': `${MARKER_ART.tipY}px`,
  '--melani-eraser-width': `${ERASER_ART.width}px`,
  '--melani-eraser-ratio': `${ERASER_ART.width} / ${ERASER_ART.height}`,
  '--melani-eraser-tip-x': `${ERASER_ART.tipX}px`,
  '--melani-eraser-tip-y': `${ERASER_ART.tipY}px`,
} as CSSProperties

export const DEFAULT_MARKERS: readonly Marker[] = [
  { id: 'black', label: 'Black marker', color: '#1e2224', ink: '#1b2022' },
  { id: 'blue', label: 'Blue marker', color: '#1f5f9c', ink: '#1768ad' },
  { id: 'red', label: 'Red marker', color: '#b63c36', ink: '#c33d36' },
  { id: 'green', label: 'Green marker', color: '#357258', ink: '#2f7a58' },
]

/** How a tool lies in the hand before it has been dragged anywhere. */
export const MARKER_REST_ANGLE = -38
export const ERASER_REST_ANGLE = 0
export const restingAngle = (id: ToolId) => (id === ERASER_ID ? ERASER_REST_ANGLE : MARKER_REST_ANGLE)

/**
 * Where the tool sits in its tray, in viewport coordinates: the pose that puts
 * the flying copy exactly over the parked artwork it replaces.
 */
export function trayPose(id: ToolId, parked: HTMLElement): Pose {
  const art = id === ERASER_ID ? ERASER_ART : MARKER_ART
  const rect = parked.getBoundingClientRect()
  const scale = rect.width / art.width
  return {
    x: rect.left + art.tipX * scale,
    y: rect.top + art.tipY * scale,
    angle: 0,
    scale,
  }
}
