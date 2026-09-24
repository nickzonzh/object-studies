import {
  createToolMotion as createMotion,
  type Pose,
  type ToolMotion,
} from 'object-studies-core'
import { toolIds, type ToolId } from './types.js'

const restingAngles: Record<ToolId, number> = {
  white: -3,
  yellow: 2,
  blue: -1.5,
  pink: 4,
  duster: -3,
}

/**
 * Binds the shared motion engine to the rail: chalk pivots at the centre of its
 * broken left end, felt at its centre, and the duster carries more weight.
 */
export function createToolMotion(
  board: HTMLElement,
  overlay: HTMLElement,
): ToolMotion<ToolId> {
  const slots = Object.fromEntries(
    toolIds.map((id) => [
      id,
      board.querySelector<HTMLButtonElement>(`[data-slot="${id}"]`)!,
    ]),
  ) as Record<ToolId, HTMLButtonElement>
  return createMotion<ToolId>({
    tools: toolIds,
    elements: (id) => {
      const root = overlay.querySelector<HTMLElement>(`[data-flight="${id}"]`)!
      return {
        root,
        rotation: root.querySelector<HTMLElement>('.kimolia-tool-rotation')!,
        parked: slots[id].querySelector<HTMLElement>('.kimolia-tool-art')!,
      }
    },
    restPose: (id, elements): Pose => {
      const rect = slots[id].getBoundingClientRect()
      const width = elements.parked!.offsetWidth
      const height = elements.parked!.offsetHeight
      const art = elements.rotation.querySelector<HTMLElement>(
        '.kimolia-tool-art',
      )!
      art.style.width = `${width}px`
      art.style.height = `${height}px`
      const angle = restingAngles[id]
      const radians = (angle * Math.PI) / 180
      return {
        x:
          rect.left +
          rect.width / 2 -
          (id === 'duster' ? 0 : (Math.cos(radians) * width) / 2),
        y:
          rect.top +
          rect.height / 2 -
          (id === 'duster' ? 0 : (Math.sin(radians) * width) / 2) +
          (id === 'yellow' || id === 'pink' ? 1 : 0),
        angle,
      }
    },
    readyPose: (_id, rest) => ({ ...rest, y: rest.y - 3, angle: rest.angle - 5 }),
    weights: (id) =>
      id === 'duster'
        ? { position: 0.48, rotation: 0.82 }
        : { position: 0.1, rotation: 0.76 },
    duration: (id, move) =>
      move === 'pickup'
        ? id === 'duster'
          ? 180
          : 160
        : id === 'duster'
          ? 220
          : 190,
  })
}
