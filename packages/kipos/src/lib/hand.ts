import { createToolMotion, type Pose } from 'object-studies-core'
import type { CropId } from './garden.js'

export type Tool = CropId | 'can'

/**
 * Where each tool is held, as a fraction of its drawing from the top left: the
 * can by its rose, a packet by the middle of its open top. That point sits on
 * the pointer and is what the tool turns about.
 */
export const GRIP: Record<'can' | 'packet', [number, number]> = { can: [0.069, 0.227], packet: [0.5, 0.08] }

const gripOf = (tool: Tool) => GRIP[tool === 'can' ? 'can' : 'packet']

/** What a tool is doing over a plot: hovering ready, pouring water, or tipping seed out. */
export type Over = 'hover' | 'pour' | 'sow'

// Garden units, measured from the plot's top left: where the water leaves the
// rose over the plant, and where the packet's mouth is tipped over the soil.
const PLOT_WIDTH = 302.67
const POUR_AT: [number, number] = [PLOT_WIDTH / 2 + 2, 252]
const SOW_AT: [number, number] = [PLOT_WIDTH / 2 + 6, 318]

/**
 * Carries the can and the seed packets between the tray and the plots with the
 * shared tool motion. The tray copies stay where they are as buttons; a copy
 * in `layer` flies, and the tray copy's drawing hides while it is out.
 * Positions are in px from the scene's top left.
 */
export function createHand(scene: HTMLElement, layer: HTMLElement, tools: readonly Tool[]) {
  const unit = () => scene.clientWidth / 1000
  const slot = (tool: Tool) => scene.querySelector<HTMLElement>(`[data-kipos-tool="${tool}"]`)!
  const tilt = (tool: Tool) => parseFloat(getComputedStyle(slot(tool)).getPropertyValue('--tilt')) || 0

  const restPose = (tool: Tool): Pose => {
    const element = slot(tool)
    const [gx, gy] = gripOf(tool)
    return {
      x: element.offsetLeft + gx * element.offsetWidth,
      y: element.offsetTop + gy * element.offsetHeight,
      angle: tilt(tool),
      scale: 1,
    }
  }

  const motion = createToolMotion<Tool>({
    tools,
    elements: (tool) => {
      const flight = layer.querySelector<HTMLElement>(`[data-kipos-flight="${tool}"]`)!
      return {
        root: flight,
        rotation: flight.firstElementChild as HTMLElement,
        parked: slot(tool).querySelector<HTMLElement>('[data-kipos-parked]') ?? undefined,
      }
    },
    restPose,
    // Lifted off the tray, ready: the can comes up by its handle, a packet is raised and turned square.
    readyPose: (tool, rest) => {
      const u = unit()
      return tool === 'can'
        ? { x: rest.x - 10 * u, y: rest.y - 44 * u, angle: -10, scale: 1 }
        : { x: rest.x, y: rest.y - 34 * u, angle: 0, scale: 1.06 }
    },
    // The can is heavy and swings into place; a packet is light and quick.
    weights: (tool) => (tool === 'can' ? { position: 0.18, rotation: 0.82 } : { position: 0.06, rotation: 0.7 }),
    duration: (tool, move) => (move === 'pickup' ? (tool === 'can' ? 260 : 200) : 240),
  })

  let held: Tool | null = null
  /** A packet that has sown its last, finishing its tip before it goes home. */
  let leaving: Tool | null = null
  /** Whether the held tool is out following the pointer, rather than waiting over the tray. */
  let following = false
  let busy: ReturnType<typeof setTimeout> | undefined
  let last: { pose: Pose; plot: number | null } | null = null
  // The scene hides the cursor while a tool stands in for it.
  const follow = (value: boolean) => {
    following = value
    scene.toggleAttribute('data-carrying', value)
  }
  // A tool waiting over the tray stays there when the garden is resized.
  const resized = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => {
        if (held && !following && !busy) motion.ready(held, { immediate: true })
      })
    : null
  resized?.observe(scene)
  const settle = () => {
    clearTimeout(busy)
    busy = undefined
    if (leaving) motion.dock(leaving)
    leaving = null
  }

  const plotPose = (tool: Tool, plot: number, over: Over): Pose => {
    const u = unit()
    const [x, y] = over === 'sow' ? SOW_AT : POUR_AT
    const left = (46 + plot * PLOT_WIDTH) * u
    if (over === 'pour') return { x: left + x * u, y: y * u, angle: -34, scale: 1 }
    if (over === 'sow') return { x: left + x * u, y: y * u, angle: -118, scale: 1 }
    return { x: left + x * u, y: (y - 40) * u, angle: tool === 'can' ? -8 : 0, scale: 1 }
  }
  const pointerPose = (tool: Tool, pose: Pose, plot: number | null): Pose => ({
    ...pose,
    angle: plot !== null && tool === 'can' ? -8 : 0,
    scale: 1,
  })

  return {
    /** Keeps up with what is in hand: puts the last tool back and lifts the new one. */
    take(tool: Tool | null) {
      if (tool === held) return
      settle()
      if (held) motion.dock(held)
      held = tool
      follow(false)
      if (tool) motion.ready(tool)
    },
    /** The pointer moved over the scene (`plot` is the plot under it), or left it (null). */
    point(pose: Pose | null, plot: number | null = null) {
      last = pose && { pose, plot }
      if (!held || busy) return
      if (!pose) {
        follow(false)
        motion.ready(held)
        return
      }
      const target = pointerPose(held, pose, plot)
      if (!following) {
        follow(true)
        motion.arrive(held, target)
      } else motion.move(held, target)
    },
    /**
     * The held tool goes to a plot and does its work there for `ms`, then goes
     * back to the pointer if it is over the garden, or to waiting over the tray.
     * A packet that has sown its last goes home.
     */
    work(plot: number, over: Over, ms: number, done: 'stay' | 'dock') {
      const tool = held
      if (!tool) return
      settle()
      motion.arrive(tool, plotPose(tool, plot, over))
      if (done === 'dock') {
        // Out of hand already, so picking up something else meanwhile works at once.
        held = null
        leaving = tool
        follow(false)
      }
      busy = setTimeout(() => {
        busy = undefined
        if (done === 'dock') {
          leaving = null
          motion.dock(tool)
        } else if (last && following) motion.move(tool, pointerPose(tool, last.pose, last.plot))
        else {
          follow(false)
          motion.ready(tool)
        }
      }, ms)
    },
    destroy() {
      clearTimeout(busy)
      resized?.disconnect()
      scene.removeAttribute('data-carrying')
      motion.destroy()
    },
  }
}
