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

export type TapResult = {
  source: ActivationSource
  /** The control the gesture started on, which is the one that was activated. */
  target: HTMLElement
}

export type TapActivation = {
  pointerDown: (event: TapPointerEvent) => void
  /** Returns the activation when a touch completed on the control. */
  pointerUp: (event: TapPointerEvent) => TapResult | null
  pointerCancel: (event: TapPointerEvent) => void
  /** Returns the activation for mouse, pen and keyboard. */
  click: (event: TapClickEvent) => TapResult | null
}

/**
 * Decides when a control has been activated, without owning what that means.
 * A touch activates on the completed press rather than on the compatibility
 * click that follows it: browsers suppress that click right after a captured
 * drawing gesture, which would otherwise swallow the next tap on a tool.
 *
 * Wire all four handlers to the control (or to one delegating group of them)
 * and act on the returned result; a null result is not an activation.
 */
export function createTapActivation({
  slop = 12,
}: { slop?: number } = {}): TapActivation {
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
      if (!start || start.id !== event.pointerId) return null
      touch = null
      const rect = event.currentTarget.getBoundingClientRect()
      const completed =
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <= slop &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      return completed ? { source: 'touch', target: start.target } : null
    },
    pointerCancel(event) {
      if (touch?.id === event.pointerId) touch = null
    },
    click(event) {
      // A real touch has already activated on pointerup; detail 0 is keyboard.
      if (modality === 'touch' && event.detail > 0) return null
      return {
        source: event.detail === 0 ? 'keyboard' : 'pointer',
        target: event.currentTarget,
      }
    },
  }
}
