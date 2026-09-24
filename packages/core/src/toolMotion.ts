import { advancePose, settled, type Pose, type PoseWeights } from './geometry.js'

export type ToolMotionElements = {
  /** Wrapper that stays in viewport coordinates and carries the translation. */
  root: HTMLElement
  /** Child that carries rotation and scale, so cast shadows stay upright. */
  rotation: HTMLElement
  /** Tray copy, hidden while the tool is in the air. */
  parked?: HTMLElement
}

export type ToolMotionConfig<Id extends string> = {
  tools: readonly Id[]
  elements: (id: Id) => ToolMotionElements
  /** Where the tool sits in its tray. Read layout here; it is called on pickup. */
  restPose: (id: Id, elements: ToolMotionElements) => Pose
  /** Pose while waiting to be used; defaults to the rest pose. */
  readyPose?: (id: Id, rest: Pose) => Pose
  /** Follow weights per tool; heavier tools keep more of the remaining gap. */
  weights?: (id: Id) => PoseWeights
  duration?: (id: Id, move: 'pickup' | 'dock') => number
}

export type ToolMotion<Id extends string> = {
  /** Lifts the tool out of its tray and waits there. */
  ready: (id: Id, immediate?: boolean) => void
  /** Animates a visible tool to a pose, as when a pointer enters the board. */
  arrive: (id: Id, pose: Pose) => void
  /** Follows a pose. `pressed` pins the position exactly under the pointer. */
  move: (id: Id, pose: Pose, pressed?: boolean, immediate?: boolean) => void
  dock: (id: Id, immediate?: boolean) => void
  dockAll: (immediate?: boolean) => void
  destroy: () => void
}

type Flight = {
  elements: ToolMotionElements
  weights: PoseWeights
  pose: Pose
  target: Pose
  visible: boolean
  contact: boolean
  returning: boolean
  animations: Animation[]
  starts: string[]
}

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'
const DEFAULT_WEIGHTS: PoseWeights = { position: 0.1, rotation: 0.76 }
const translate = (pose: Pose) => `translate3d(${pose.x}px, ${pose.y}px, 0)`
const rotate = (pose: Pose) =>
  pose.scale === undefined
    ? `rotate(${pose.angle}deg)`
    : `rotate(${pose.angle}deg) scale(${pose.scale})`

/**
 * Moves physical tools between a tray and a pointer. Pickup and put-back are
 * Web Animations (retargetable mid-flight); following a pointer is rAF inertia
 * that stops as soon as the tool settles. State is published on the root as
 * `hidden`, `data-state` (`ready` | `held` | `contact`) and `data-direct`, so
 * each board styles its own lift, shadow and squash in CSS.
 *
 * Must be created in the browser, after the elements are in the document.
 */
export function createToolMotion<Id extends string>(
  config: ToolMotionConfig<Id>,
): ToolMotion<Id> {
  const reduced =
    typeof matchMedia === 'function'
      ? matchMedia('(prefers-reduced-motion: reduce)')
      : null
  const flights = new Map<Id, Flight>()
  let frame = 0
  let previousTime = 0
  let disposed = false

  for (const id of config.tools) {
    const elements = config.elements(id)
    flights.set(id, {
      elements,
      weights: config.weights?.(id) ?? DEFAULT_WEIGHTS,
      pose: { x: 0, y: 0, angle: 0 },
      target: { x: 0, y: 0, angle: 0 },
      visible: false,
      contact: false,
      returning: false,
      animations: [],
      starts: [],
    })
  }

  const isReduced = () => reduced?.matches === true
  const place = (flight: Flight, pose: Pose) => {
    flight.pose = pose
    flight.elements.root.style.transform = translate(pose)
    flight.elements.rotation.style.transform = rotate(pose)
  }
  const cancelAnimation = (flight: Flight) => {
    // Read all animated poses before cancelling or writing any styles.
    const starts = [flight.elements.root, flight.elements.rotation].map(
      (element) =>
        flight.animations.length
          ? getComputedStyle(element).transform
          : element.style.transform,
    )
    for (const animation of flight.animations) {
      animation.onfinish = null
      animation.cancel()
    }
    flight.animations = []
    return starts
  }
  const state = (flight: Flight, value: 'ready' | 'held' | 'contact') => {
    flight.elements.root.dataset.state = value
  }
  const direct = (flight: Flight, value: boolean) => {
    if (value) flight.elements.root.dataset.direct = ''
    else delete flight.elements.root.dataset.direct
  }
  const animateTo = (
    flight: Flight,
    pose: Pose,
    duration: number,
    done: () => void,
  ) => {
    flight.starts = cancelAnimation(flight)
    flight.target = pose
    place(flight, pose)
    flight.animations = [flight.elements.root, flight.elements.rotation].map(
      (element, index) =>
        element.animate(
          [
            { transform: flight.starts[index] },
            { transform: element.style.transform },
          ],
          { duration, easing: EASE },
        ),
    )
    flight.animations[0].onfinish = () => {
      for (const animation of flight.animations) animation.cancel()
      flight.animations = []
      done()
    }
  }
  const tick = (time: number) => {
    frame = 0
    const elapsed = previousTime ? time - previousTime : 1000 / 60
    previousTime = time
    let moving = false
    for (const flight of flights.values()) {
      if (!flight.visible || flight.returning || flight.animations.length)
        continue
      const next = isReduced()
        ? flight.target
        : advancePose(
            flight.pose,
            flight.target,
            elapsed,
            flight.weights,
            flight.contact,
          )
      if (settled(next, flight.target)) place(flight, flight.target)
      else {
        place(flight, next)
        moving = true
      }
    }
    if (moving && !disposed) frame = requestAnimationFrame(tick)
    else previousTime = 0
  }
  const wake = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(tick)
  }
  const hide = (flight: Flight) => {
    flight.elements.root.hidden = true
    flight.elements.root.style.willChange = ''
    flight.elements.rotation.style.willChange = ''
    if (flight.elements.parked) flight.elements.parked.style.visibility = ''
    flight.visible = false
    flight.returning = false
  }
  const duration = (id: Id, move: 'pickup' | 'dock') =>
    config.duration?.(id, move) ?? (move === 'pickup' ? 160 : 190)
  const dock = (id: Id, immediate = false) => {
    const flight = flights.get(id)!
    if (!flight.visible) return
    const pose = config.restPose(id, flight.elements)
    flight.returning = true
    flight.contact = false
    state(flight, 'ready')
    if (immediate || isReduced()) {
      cancelAnimation(flight)
      place(flight, pose)
      hide(flight)
    } else animateTo(flight, pose, duration(id, 'dock'), () => hide(flight))
  }

  const finishReduced = () => {
    if (!isReduced()) return
    for (const flight of flights.values()) {
      cancelAnimation(flight)
      place(flight, flight.target)
      if (flight.returning) hide(flight)
    }
  }
  reduced?.addEventListener('change', finishReduced)

  return {
    ready(id, immediate = false) {
      const flight = flights.get(id)!
      const rest = config.restPose(id, flight.elements)
      const pose = config.readyPose?.(id, rest) ?? rest
      flight.contact = false
      state(flight, 'ready')
      direct(flight, immediate || isReduced())
      if (!flight.visible) {
        place(flight, rest)
        flight.elements.root.hidden = false
        if (flight.elements.parked)
          flight.elements.parked.style.visibility = 'hidden'
        flight.elements.root.style.willChange = 'transform'
        flight.elements.rotation.style.willChange = 'transform'
        flight.visible = true
      }
      flight.returning = false
      if (immediate || isReduced()) {
        cancelAnimation(flight)
        flight.target = pose
        place(flight, pose)
      } else animateTo(flight, pose, duration(id, 'pickup'), wake)
    },
    arrive(id, pose) {
      const flight = flights.get(id)!
      flight.contact = false
      state(flight, 'held')
      direct(flight, false)
      if (isReduced()) {
        cancelAnimation(flight)
        flight.target = pose
        place(flight, pose)
      } else animateTo(flight, pose, duration(id, 'pickup'), wake)
    },
    move(id, pose, pressed = false, immediate = false) {
      const flight = flights.get(id)!
      flight.contact = pressed
      state(flight, pressed ? 'contact' : 'held')
      direct(flight, immediate || isReduced())
      flight.target = pose
      if (immediate || isReduced()) {
        cancelAnimation(flight)
        place(flight, pose)
      } else if (pressed) {
        cancelAnimation(flight)
        // Position is exact on contact; rotation keeps its material weight.
        place(flight, { ...pose, angle: flight.pose.angle })
        wake()
      } else if (flight.animations.length) {
        // Retarget a pickup without restarting its clock as the pointer moves.
        place(flight, pose)
        flight.animations.forEach((animation, index) => {
          ;(animation.effect as KeyframeEffect).setKeyframes([
            { transform: flight.starts[index] },
            { transform: index === 0 ? translate(pose) : rotate(pose) },
          ])
        })
      } else wake()
    },
    dock,
    dockAll(immediate = false) {
      for (const id of flights.keys()) dock(id, immediate)
    },
    destroy() {
      disposed = true
      cancelAnimationFrame(frame)
      reduced?.removeEventListener('change', finishReduced)
      for (const flight of flights.values()) {
        cancelAnimation(flight)
        hide(flight)
      }
    },
  }
}
