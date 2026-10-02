export type Light = 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night'

/** The light the hour casts, local time. */
export function lightAt(date: Date): Light {
  const hour = date.getHours() + date.getMinutes() / 60
  if (hour < 5.5 || hour >= 21) return 'night'
  if (hour < 10.5) return 'morning'
  if (hour < 14.5) return 'midday'
  if (hour < 18.5) return 'afternoon'
  return 'dusk'
}

/**
 * `'auto'` follows the visitor's clock, and settles after mount so the server
 * render and the first client render agree on afternoon.
 */
export const resolveLight = (light: Light | 'auto', now: number): Light =>
  light !== 'auto' ? light : now === 0 ? 'afternoon' : lightAt(new Date(now))
