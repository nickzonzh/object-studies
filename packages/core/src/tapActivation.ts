export type ActivationSource = 'pointer' | 'touch' | 'keyboard'

/** The subset of a pointer event this needs; React's synthetic events fit. */
export type TapPointerEvent = {
  pointerId: number
  pointerType: string
  isPrimary: boolean
  clientX: number
  clientY: number
  currentTarget: HTMLElement
}
export type TapClickEvent = { detail: number; currentTarget: HTMLElement }

export type TapActivation = {
  pointerDown: (event: TapPointerEvent) => void
  pointerUp: (event: TapPointerEvent) => void
  pointerCancel: (event: TapPointerEvent) => void
  click: (event: TapClickEvent) => void
}

export type TapActivationOptions = {
  /** Movement allowed between press and release, in CSS pixels. */
  slop?: number
  /** Returning false ignores the gesture, for a disabled control. */
  enabled?: (target: HTMLElement) => boolean
}

/**
 * Activates a control on a completed touch rather than on the compatibility
 * click that follows it: browsers suppress that click after a captured drawing
 * gesture, which would otherwise swallow the very next tap on a tool.
 *
 * Wire all four handlers to one element (or to a delegating group of them).
 */
export function createTapActivation(
  onActivate: (source: ActivationSource, target: HTMLElement) => void,
  { slop = 12, enabled }: TapActivationOptions = {},
): TapActivation {
  let touch: { id: number; x: number; y: number; target: HTMLElement } | null =
    null
  let modality = ''
  return {
    pointerDown(event) {
      if (!event.isPrimary) return
      modality = event.pointerType
      touch =
        event.pointerType === 'touch'
          ? {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              target: event.currentTarget,
            }
          : null
    },
    pointerUp(event) {
      const start = touch
      if (!start || start.id !== event.pointerId) return
      touch = null
      const rect = event.currentTarget.getBoundingClientRect()
      if (
        (!enabled || enabled(start.target)) &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <= slop &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      )
        onActivate('touch', start.target)
    },
    pointerCancel(event) {
      if (touch?.id === event.pointerId) touch = null
    },
    click(event) {
      // A real touch has already activated on pointerup; detail 0 is keyboard.
      if (modality === 'touch' && event.detail > 0) return
      onActivate(
        event.detail === 0 ? 'keyboard' : 'pointer',
        event.currentTarget,
      )
    },
  }
}
