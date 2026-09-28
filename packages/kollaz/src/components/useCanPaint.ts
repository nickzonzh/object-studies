import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * Whether canvas-painted textures can be made yet: false on the server and while
 * hydrating its markup, true in the browser. A client-only render is true from
 * its first paint, so nothing pops in.
 */
export function useCanPaint() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
