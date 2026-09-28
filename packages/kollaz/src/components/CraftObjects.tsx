import type { CSSProperties } from 'react'
import { GLITTERS, glitterTexture } from '../lib/palette.js'
import { INK, pipeStemUrl, pomUrl, sequinTubUrl, stampLabelUrl } from '../lib/sprites.js'
import { GooglyEye } from './GooglyEye.js'
import { useCanPaint } from './useCanPaint.js'

// Objects in the caddy and in hand share one set of CSS bodies.

export function GlueStickBody({ inHand = false }: { inHand?: boolean }) {
  return (
    <span className={`kollaz-glue-stick${inHand ? ' kollaz-glue-stick--in-hand' : ''}`} aria-hidden="true">
      {inHand
        ? <><span className="kollaz-glue-stick__nub" /><span className="kollaz-glue-stick__lip" /></>
        : <span className="kollaz-glue-stick__cap" />}
      <span className="kollaz-glue-stick__body">
        <span className="kollaz-glue-stick__brand">KOLLAZ</span>
        <span className="kollaz-glue-stick__weight">21 g</span>
        <span className="kollaz-glue-stick__band" />
      </span>
      <span className="kollaz-glue-stick__base" />
    </span>
  )
}

export function ShakerBody({ index, inHand = false }: { index: number; inHand?: boolean }) {
  const g = GLITTERS[index]
  const fill = useCanPaint() ? `url(${glitterTexture(index)})` : undefined
  return (
    <span
      className={`kollaz-shaker${inHand ? ' kollaz-shaker--in-hand' : ''}`}
      style={{ '--glitter': g.base, '--glitter-deep': g.deep, '--fill': fill } as CSSProperties}
      aria-hidden="true"
    >
      <span className="kollaz-shaker__cap" />
      <span className="kollaz-shaker__tube"><span className="kollaz-shaker__fill" /></span>
      <span className="kollaz-shaker__end" />
    </span>
  )
}

export function EyePot() {
  return (
    <span className="kollaz-eye-pot" aria-hidden="true">
      <GooglyEye size={19} style={{ left: 6, top: 9 }} />
      <GooglyEye size={15} style={{ left: 25, top: 6 }} />
      <GooglyEye size={17} style={{ left: 18, top: 24 }} />
    </span>
  )
}

/** A clear tub of holographic sequins, lid off. */
export function SequinTub() {
  const fill = useCanPaint() ? `url(${sequinTubUrl()})` : undefined
  return (
    <span className="kollaz-sequin-tub" style={{ '--fill': fill } as CSSProperties} aria-hidden="true">
      <span className="kollaz-sequin-tub__fill" />
    </span>
  )
}

/** A paper cup of mixed pom poms. */
const CUP = [
  { color: 4, x: 4, y: 16, s: 20 },
  { color: 0, x: 19, y: 5, s: 19 },
  { color: 2, x: 23, y: 21, s: 18 },
  { color: 5, x: 8, y: 3, s: 15 },
  { color: 3, x: 13, y: 26, s: 14 },
]
export function PomCup() {
  const paint = useCanPaint()
  return (
    <span className="kollaz-pom-cup" aria-hidden="true">
      {CUP.map((p, i) => (
        <span key={i} className="kollaz-pom" style={{ left: p.x, top: p.y, width: p.s, height: p.s, backgroundImage: paint ? `url(${pomUrl(p.color)})` : undefined }} />
      ))}
    </span>
  )
}

export function Pom({ color, size = 34 }: { color: number; size?: number }) {
  const paint = useCanPaint()
  return <span className="kollaz-pom kollaz-pom--single" style={{ width: size, height: size, backgroundImage: paint ? `url(${pomUrl(color)})` : undefined }} aria-hidden="true" />
}

/** A round beech stamp with an index label on its knob. The rim shows the ink it carries. */
export function StampBody({ ink = 0 }: { ink?: number }) {
  const label = useCanPaint() ? `url(${stampLabelUrl()})` : undefined
  return (
    <span
      className="kollaz-stamp"
      style={{ '--ink-level': ink, '--ink': `rgb(${INK.rgb.join(',')})`, '--label': label } as CSSProperties}
      aria-hidden="true"
    >
      <span className="kollaz-stamp__knob"><span className="kollaz-stamp__label" /></span>
    </span>
  )
}

/** An open ink pad tin. */
export function InkPad({ pressed = false }: { pressed?: boolean }) {
  return (
    <span className={`kollaz-ink-pad${pressed ? ' is-pressed' : ''}`} style={{ '--ink': `rgb(${INK.rgb.join(',')})` } as CSSProperties} aria-hidden="true">
      <span className="kollaz-ink-pad__felt" />
      <span className="kollaz-ink-pad__mark">PIGMENT · CHALK</span>
    </span>
  )
}

/**
 * Round-tipped craft scissors, seen from above: two steel blades crossing at a pivot
 * screw, with moulded plastic loops. `--open` sets how far the blades are parted.
 */
export function ScissorsBody() {
  return (
    <span className="kollaz-scissors" aria-hidden="true">
      <span className="kollaz-scissors__half kollaz-scissors__half--lower">
        <span className="kollaz-scissors__blade" />
        <span className="kollaz-scissors__loop kollaz-scissors__loop--large" />
      </span>
      <span className="kollaz-scissors__half kollaz-scissors__half--upper">
        <span className="kollaz-scissors__blade" />
        <span className="kollaz-scissors__loop" />
      </span>
      <span className="kollaz-scissors__pivot" />
    </span>
  )
}

/** A permanent marker. Capped in the caddy, uncapped in the hand with a bullet felt tip. */
export function MarkerBody({ inHand = false }: { inHand?: boolean }) {
  return (
    <span className={`kollaz-texta${inHand ? ' kollaz-texta--in-hand' : ''}`} aria-hidden="true">
      {inHand ? <span className="kollaz-texta__tip" /> : <span className="kollaz-texta__cap"><span className="kollaz-texta__clip" /></span>}
      <span className="kollaz-texta__barrel"><span className="kollaz-texta__label">PERMANENT</span></span>
      <span className="kollaz-texta__end" />
    </span>
  )
}

/**
 * A roll of masking tape seen from a little above: the wound face with its growth
 * rings, the crepe side of the roll below it, a see-through centre with a cardboard
 * core, and a torn tail peeling off the side.
 */
export function TapeRoll() {
  return (
    <span className="kollaz-tape-roll" aria-hidden="true">
      <span className="kollaz-tape-roll__side" />
      <span className="kollaz-tape-roll__tail" />
      <span className="kollaz-tape-roll__face" />
      <span className="kollaz-tape-roll__core" />
    </span>
  )
}

/** A loose bundle of pipe cleaners gathered at one end and fanning out, painted with the same chenille as the real ones. */
const BUNDLE = [
  { color: 4, rotate: -10 },
  { color: 0, rotate: -5 },
  { color: 2, rotate: 0 },
  { color: 3, rotate: 5 },
  { color: 6, rotate: 10 },
]
export function PipeBundle() {
  const paint = useCanPaint()
  return (
    <span className="kollaz-pipe-bundle" aria-hidden="true">
      {BUNDLE.map((stem, i) => (
        <span key={i} className="kollaz-pipe-stem" style={{ rotate: `${stem.rotate}deg`, backgroundImage: paint ? `url(${pipeStemUrl(stem.color)})` : undefined }} />
      ))}
    </span>
  )
}

export function PipeInHand({ color }: { color: number }) {
  const paint = useCanPaint()
  return <span className="kollaz-pipe-stem kollaz-pipe-stem--hand" style={{ backgroundImage: paint ? `url(${pipeStemUrl(color)})` : undefined }} aria-hidden="true" />
}
