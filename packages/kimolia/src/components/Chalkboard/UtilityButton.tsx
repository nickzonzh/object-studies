import { useRef, type ButtonHTMLAttributes } from 'react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onActivate: (keyboard: boolean) => void
}

export function UtilityButton({ onActivate, ...props }: Props) {
  const touch = useRef<{ id: number; x: number; y: number } | null>(null)
  const modality = useRef('')
  return (
    <button
      {...props}
      type="button"
      onPointerDown={(event) => {
        if (!event.isPrimary) return
        modality.current = event.pointerType
        touch.current =
          event.pointerType === 'touch'
            ? { id: event.pointerId, x: event.clientX, y: event.clientY }
            : null
      }}
      onPointerUp={(event) => {
        const start = touch.current
        if (!start || start.id !== event.pointerId) return
        touch.current = null
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          !props.disabled &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12 &&
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          // Like tool pickup, a completed touch must not rely on compatibility clicks
          // immediately after the slate's captured drawing gesture.
          onActivate(false)
        }
      }}
      onPointerCancel={() => {
        touch.current = null
      }}
      onClick={(event) => {
        if (modality.current === 'touch' && event.detail > 0) return
        onActivate(event.detail === 0)
      }}
    />
  )
}
