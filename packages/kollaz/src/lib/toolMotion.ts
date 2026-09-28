import { createToolMotion as createMotion, type Pose } from 'object-studies-core'

export type { Pose }

export type ToolAnchor = {
  /** The working tip, in the in-hand body's unscaled px. It sits exactly on the pointer. */
  tipX: number
  tipY: number
  /** Unscaled size of the in-hand body. */
  width: number
  height: number
  /**
   * How the tool rests in its slot. 'right' lines the body's far end up with the slot
   * object's far end (a capped glue stick and an uncapped one share a base).
   * 'center' launches from the middle of the slot, e.g. one eye taken from a pot.
   * Without `restScale`, a centred tool is sized to the slot object's height.
   */
  rest?: 'right' | 'center'
  restScale?: number
  /** Leave the slot object visible while the tool is in hand (the pot keeps its eyes). */
  keepSlot?: boolean
}

type Rect = { left: number; top: number; width: number; height: number }

/** Where a tool's tip sits, and at what scale, while it lies in its slot. */
export function restPose(rect: Rect, anchor: ToolAnchor): Pose {
  if (anchor.rest === 'center') {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, angle: 0, scale: anchor.restScale ?? rect.height / anchor.height }
  }
  const scale = rect.height / anchor.height
  return {
    x: rect.left + rect.width - (anchor.width - anchor.tipX) * scale,
    y: rect.top + anchor.tipY * scale,
    angle: 0,
    scale,
  }
}

/** Lean a held tool toward its direction of travel, within a comfortable wrist range. */
export function leanToward(current: number, dx: number, dy: number, offset: number, min: number, max: number) {
  const distance = Math.hypot(dx, dy)
  if (distance <= 0.35) return current
  const target = Math.max(min, Math.min(max, (Math.atan2(dy, dx) * 180) / Math.PI - offset))
  return current + (target - current) * 0.18
}

/**
 * Binds the shared motion engine to the caddy. A tool's tip sits exactly on the
 * pointer (no follow lag, and the lean is eased before it gets here), pickups and
 * put-backs fly for 180ms, and a tool that is not in hand is picked up by the
 * first move that asks for it. The slots are under `root`; the flying copies are
 * under `layer`, which is portalled out of the table.
 */
export function createToolMotion(root: HTMLElement, layer: HTMLElement, anchors: Record<string, ToolAnchor>) {
  const tools = Object.keys(anchors)
  const slot = (id: string) => root.querySelector<HTMLElement>(`[data-kollaz-slot="${id}"] > span`)!
  const motion = createMotion<string>({
    tools,
    elements: (id) => {
      const flight = layer.querySelector<HTMLElement>(`[data-kollaz-flight="${id}"]`)!
      return {
        root: flight,
        rotation: flight.firstElementChild as HTMLElement,
        parked: anchors[id].keepSlot ? undefined : slot(id),
      }
    },
    restPose: (id) => restPose(slot(id).getBoundingClientRect(), anchors[id]),
    weights: () => ({ position: 0, rotation: 0 }),
    duration: () => 180,
  })
  const held = new Set<string>()

  return {
    /** `working` presses the tool onto the paper; `animatePickup` flies it out of the caddy. */
    move(id: string, pose: Pose, working: boolean, animatePickup = true) {
      if (!held.has(id)) {
        held.add(id)
        if (animatePickup && !working) {
          motion.ready(id)
          motion.arrive(id, pose)
          return
        }
        motion.ready(id, { immediate: true })
      }
      // Working poses are committed in the render frame alongside the ink, so place them now.
      motion.move(id, pose, { pressed: working, immediate: working })
    },
    dock(id: string, animate = true) {
      held.delete(id)
      motion.dock(id, { immediate: !animate })
    },
    dockAll(animate = true) {
      held.clear()
      motion.dockAll({ immediate: !animate })
    },
    destroy() {
      held.clear()
      motion.destroy()
    },
  }
}
