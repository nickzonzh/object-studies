import { useState, type ButtonHTMLAttributes } from 'react'
import { createTapActivation, type TapResult } from 'object-studies-core'

type UtilityButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick'
> & {
  onActivate: (keyboard: boolean) => void
}

export function UtilityButton({ onActivate, ...props }: UtilityButtonProps) {
  const [tap] = useState(createTapActivation)
  const activate = (hit: TapResult | null) => {
    if (hit && !props.disabled) onActivate(hit.source === 'keyboard')
  }
  return (
    <button
      {...props}
      type="button"
      onPointerDown={tap.pointerDown}
      onPointerUp={(event) => activate(tap.pointerUp(event))}
      onPointerCancel={tap.pointerCancel}
      onClick={(event) => activate(tap.click(event))}
    />
  )
}
