import { advancePose, settled } from './geometry'
import { toolIds, type Pose, type ToolId } from './types'

type Flight = {
  root: HTMLElement
  rotation: HTMLElement
  art: HTMLElement
  parked: HTMLElement
  slot: HTMLButtonElement
  pose: Pose
  target: Pose
  visible: boolean
  contact: boolean
  returning: boolean
  animations: Animation[]
  starts: string[]
}
const ease = 'cubic-bezier(0.23, 1, 0.32, 1)'
const translate = (pose: Pose) => `translate3d(${pose.x}px, ${pose.y}px, 0)`
const rotate = (pose: Pose) => `rotate(${pose.angle}deg)`
const restingAngles: Record<ToolId, number> = {
  white: -3,
  yellow: 2,
  blue: -1.5,
  pink: 4,
  duster: -3,
}

export function createToolMotion(board: HTMLElement, overlay: HTMLElement) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const flights = new Map<ToolId, Flight>()
  let frame = 0
  let previousTime = 0
  let disposed = false

  for (const id of toolIds) {
    const root = overlay.querySelector<HTMLElement>(`[data-flight="${id}"]`)!
    const slot = board.querySelector<HTMLButtonElement>(`[data-slot="${id}"]`)!
    flights.set(id, {
      root,
      slot,
      rotation: root.querySelector<HTMLElement>('.tool-rotation')!,
      art: root.querySelector<HTMLElement>('.tool-art')!,
      parked: slot.querySelector<HTMLElement>('.tool-art')!,
      pose: { x: 0, y: 0, angle: 0 },
      target: { x: 0, y: 0, angle: 0 },
      visible: false,
      contact: false,
      returning: false,
      animations: [],
      starts: [],
    })
  }

  const place = (flight: Flight, pose: Pose) => {
    flight.pose = pose
    flight.root.style.transform = translate(pose)
    flight.rotation.style.transform = rotate(pose)
  }
  const cancelAnimation = (flight: Flight) => {
    // Read all animated poses before cancelling or writing any styles.
    const starts = [flight.root, flight.rotation].map((element) =>
      flight.animations.length
        ? getComputedStyle(element).transform
        : element.style.transform,
    )
    flight.animations.forEach((animation) => {
      animation.onfinish = null
      animation.cancel()
    })
    flight.animations = []
    return starts
  }
  const dockPose = (id: ToolId, flight: Flight): Pose => {
    const rect = flight.slot.getBoundingClientRect()
    const width = flight.parked.offsetWidth
    const height = flight.parked.offsetHeight
    flight.art.style.width = `${width}px`
    flight.art.style.height = `${height}px`
    // Chalk pivots at the centre of its broken left end; felt at its centre.
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
    flight.animations = [flight.root, flight.rotation].map((element, index) =>
      element.animate(
        [
          { transform: flight.starts[index] },
          { transform: element.style.transform },
        ],
        { duration, easing: ease },
      ),
    )
    flight.animations[0].onfinish = () => {
      flight.animations.forEach((animation) => animation.cancel())
      flight.animations = []
      done()
    }
  }
  const tick = (time: number) => {
    frame = 0
    const elapsed = previousTime ? time - previousTime : 1000 / 60
    previousTime = time
    let moving = false
    flights.forEach((flight, id) => {
      if (!flight.visible || flight.returning || flight.animations.length)
        return
      const next = reduced.matches
        ? flight.target
        : advancePose(
            flight.pose,
            flight.target,
            elapsed,
            id === 'duster',
            flight.contact,
          )
      if (settled(next, flight.target)) place(flight, flight.target)
      else {
        place(flight, next)
        moving = true
      }
    })
    if (moving && !disposed) frame = requestAnimationFrame(tick)
    else previousTime = 0
  }
  const wake = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(tick)
  }
  const contact = (id: ToolId, pressed: boolean) => {
    const flight = flights.get(id)!
    flight.contact = pressed
    flight.root.classList.toggle('is-contact', pressed)
  }
  const hide = (flight: Flight) => {
    flight.root.hidden = true
    flight.root.style.willChange = ''
    flight.rotation.style.willChange = ''
    flight.parked.style.visibility = ''
    flight.visible = false
    flight.returning = false
  }
  const move = (id: ToolId, pose: Pose, pressed = false, immediate = false) => {
    const flight = flights.get(id)!
    flight.root.classList.remove('is-ready')
    flight.root.classList.toggle('is-direct', immediate || reduced.matches)
    contact(id, pressed)
    flight.target = pose
    if (immediate || reduced.matches) {
      cancelAnimation(flight)
      place(flight, pose)
    } else if (pressed) {
      cancelAnimation(flight)
      // Position is exact on contact; rotation keeps its softer material weight.
      place(flight, { ...pose, angle: flight.pose.angle })
      wake()
    } else if (flight.animations.length) {
      // Retarget pickup without restarting its clock when the pointer moves.
      place(flight, pose)
      flight.animations.forEach((animation, index) => {
        ;(animation.effect as KeyframeEffect).setKeyframes([
          { transform: flight.starts[index] },
          { transform: index === 0 ? translate(pose) : rotate(pose) },
        ])
      })
    } else wake()
  }
  const ready = (id: ToolId, immediate = false) => {
    const flight = flights.get(id)!
    const dock = dockPose(id, flight)
    const pose = { ...dock, y: dock.y - 3, angle: dock.angle - 5 }
    flight.root.classList.add('is-ready')
    flight.root.classList.toggle('is-direct', immediate || reduced.matches)
    contact(id, false)
    if (!flight.visible) {
      place(flight, dock)
      flight.root.hidden = false
      flight.parked.style.visibility = 'hidden'
      flight.root.style.willChange = 'transform'
      flight.rotation.style.willChange = 'transform'
      flight.visible = true
    }
    flight.returning = false
    if (immediate || reduced.matches) {
      cancelAnimation(flight)
      flight.target = pose
      place(flight, pose)
    } else animateTo(flight, pose, id === 'duster' ? 180 : 160, wake)
  }
  const dock = (id: ToolId, immediate = false) => {
    const flight = flights.get(id)!
    if (!flight.visible) return
    const pose = dockPose(id, flight)
    flight.returning = true
    flight.root.classList.add('is-ready')
    contact(id, false)
    if (immediate || reduced.matches) {
      cancelAnimation(flight)
      place(flight, pose)
      hide(flight)
    } else
      animateTo(flight, pose, id === 'duster' ? 220 : 190, () => hide(flight))
  }
  const finishReduced = () => {
    if (!reduced.matches) return
    flights.forEach((flight) => {
      cancelAnimation(flight)
      place(flight, flight.target)
      if (flight.returning) hide(flight)
    })
  }
  reduced.addEventListener('change', finishReduced)
  return {
    ready,
    move,
    dock,
    arrive(id: ToolId, pose: Pose) {
      const flight = flights.get(id)!
      flight.root.classList.remove('is-ready')
      flight.root.classList.remove('is-direct')
      contact(id, false)
      if (reduced.matches) move(id, pose, false, true)
      else animateTo(flight, pose, id === 'duster' ? 180 : 160, wake)
    },
    dockAll(immediate = false) {
      flights.forEach((_flight, id) => dock(id, immediate))
    },
    destroy() {
      disposed = true
      cancelAnimationFrame(frame)
      reduced.removeEventListener('change', finishReduced)
      flights.forEach((flight) => {
        cancelAnimation(flight)
        hide(flight)
      })
    },
  }
}
