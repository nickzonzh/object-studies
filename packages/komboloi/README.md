# komboloi

Greek worry beads for React. A komboloi hangs from a brass peg on whatever wall
you give it. Lift it by any bead and let it swing. Tap a bead and it is flicked
along the cord, knocking into the others with a click you can hear.

κομπολόι: worry beads, from κόμπος, a knot.

```sh
npm install komboloi
```

```tsx
import { Komboloi } from 'komboloi'
import 'komboloi/style.css'

export function Peg() {
  return <Komboloi material="amber" beads={21} />
}
```

The stylesheet is a separate import so it can be bundled, ordered or overridden
like any other CSS. Every rule is scoped to `komboloi` classes. The strand is
drawn on a transparent canvas, so it hangs on your page's own background.

MIT. React 19. The only runtime dependency is [`object-studies-core`](../core).

## What you get

- **A real loop of cord** over a peg, with the papas bead, a shield and a silk
  tassel hanging below. Beads ride on the cord: they slide under gravity, get
  thrown about when the strand swings, and gather at the bottom of the loop,
  leaving the gap at the top.
- **Lift it by anything.** Drag a bead, the bare cord, the papas or the tassel.
  Let go mid-swing and it swings.
- **Flick a bead.** A quick tap sends a bead along the cord toward the gap.
  Tap one in the middle of a row and the knock runs down the row: the last bead
  flies.
- **Clicks**, synthesised per material: warm and soft for amber, a dull tock
  for olive wood, a bright ring for glass. Nothing plays until someone has
  touched the strand.
- **Six materials**, each bead seeded: no two strands come out the same.

| Material | | |
| --- | --- | --- |
| `amber` | κεχριμπάρι | Honey amber, round, with inclusions and the odd cloudy swirl |
| `cherry-amber` | βυσσινί κεχριμπάρι | Deep red amber, olive-shaped beads |
| `olive-wood` | ελιά | Olive wood, grain running along each bead |
| `ox-bone` | κόκαλο | Cream bone, small pores, yellowed at the holes |
| `mati` | μάτι | Cobalt glass with an eye on every bead |
| `onyx` | όνυχας | Black onyx, heavy and glossy |

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `material` | `MaterialId` | `'amber'` | What the beads are made of. |
| `beads` | `number` | `21` | 9 to 45. Traditional strands have an odd number. |
| `seed` | `number` | `7` | Each seed strings a different strand of the same material. |
| `tassel` | `string` | per material | Silk tassel and cord colour, as hex or `rgb()`. `MATERIALS[id].tassels` lists ones that suit. |
| `sound` | `boolean` | `true` | The clicks. |
| `volume` | `number` | `0.6` | 0 to 1. |
| `onClack` | `(strength: number) => void` | | Every audible knock, 0 to 1. |
| `label` | `string` | | Overrides the accessible name. |
| `className`, `style` | | | On the strand's box. |

The strand's box is twice as tall as it is wide, and sizes to its container's
width. Its canvas reaches half a width past each side, so a big swing is not
cut off. The peg's centre sits `PEG_TOP` (exported, a fraction of the width)
down from the top of the box, the same for every strand: put strands side by
side and their pegs line up.

## Keyboard and access

The strand is a focusable `application` region with a description of its keys.
**Space** or **Enter** flicks the next bead across the gap, counting round the
strand one bead at a time and turning back when one side has filled up to the
peg. **Left** and **Right** swing it. Under `prefers-reduced-motion` the strand
settles much faster.

On touch, a press that lands on the strand holds it. Anywhere else in the box
the page scrolls as usual.

## How it works

The cord is a closed loop of particles solved with position-based dynamics,
held over a solid peg and tethered to it so a heavy strand never stretches. The
beads are not particles: each rides at an arc length along the cord, feeling
gravity and the cord's own acceleration, with friction against the silk. A
bead row is kept apart exactly in one pass (a weighted isotonic regression), so
a full row resting on the papas is still and silent, and only real knocks
click. Beads on opposite sides of the loop bump each other too.

Rendering is 2D canvas. Each bead's body is painted once from its seed, then
turned to lie along the cord and lit from the upper left every frame, so the
highlight stays put as the bead rolls. The loop sleeps once the strand comes to
rest, and pauses while it is off screen.

Server rendering gives a sized, labelled placeholder; the strand is hung in the
browser.
