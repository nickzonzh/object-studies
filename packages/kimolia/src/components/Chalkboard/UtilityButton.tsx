import { useState, type ButtonHTMLAttributes } from 'react'
import { createTapActivation, type TapResult } from 'object-studies-core'

type UtilityButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'disabled'
> & {
  onActivate: (keyboard: boolean) => void
  disabled?: boolean
}

/**
 * Disabled through `aria-disabled` rather than the attribute: a button that
 * disables itself when used (Undo at the last step, Clear, Save) would
 * otherwise drop keyboard focus to the page, and the shortcuts with it.
 */
export function UtilityButton({
  onActivate,
  disabled = false,
  ...props
}: UtilityButtonProps) {
  const [tap] = useState(createTapActivation)
  const activate = (hit: TapResult | null) => {
    if (hit && !disabled) onActivate(hit.source === 'keyboard')
  }
  return (
    <button
      {...props}
      type="button"
      aria-disabled={disabled}
      onPointerDown={tap.pointerDown}
      onPointerUp={(event) => activate(tap.pointerUp(event))}
      onPointerCancel={tap.pointerCancel}
      onClick={(event) => activate(tap.click(event))}
    />
  )
}
