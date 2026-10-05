# komboloi

Greek worry beads for React. A strand hangs from a brass peg: lift it by a
bead and let it swing, or tap a bead to flick it along the cord and hear it
knock into the others. Six materials, each with its own weight, look and click.

κομπολόι: Greek for worry beads.

```sh
npm install komboloi
```

```tsx
import { Komboloi } from 'komboloi'
import 'komboloi/style.css'

export function Desk() {
  return <Komboloi material="olive-wood" beads={17} seed={9} />
}
```

The stylesheet is a separate import so it can be bundled, ordered or overridden
like any other CSS. Every rule is scoped to `.komboloi`.

MIT. React 19 and a browser with canvas. Its only runtime dependency is
[`object-studies-core`](../core).

## What you get

- Six materials, listed in `MATERIALS`: amber, cherry amber, olive wood, ox
  bone, mati glass and black onyx. Each has its own bead shape, density,
  figure (inclusions, grain, pores, the eye, banding), click and three
  traditional tassel colours.
- A real-size simulation in millimetres and grams: a silk loop over the peg,
  beads that slide under gravity and friction and bounce off each other, and
  a papas, shield and tassel that swing.
- Clicks synthesised per material, panned to where on the strand they happen.
  Every strand on a page shares one audio context.
- Strands settle in small slices of work after mounting and fade in once
  still, so a page holding several stays responsive while it loads.

## Using it

| Gesture | What it does |
| --- | --- |
| Drag a bead | Lifts the strand by that bead. |
| Tap a bead | Flicks it along the cord, over the peg if that's where the room is. |
| Tap the cord or tassel | Swings the strand away from the tap. |
| Space or Enter | Counts the next bead across, the way thumbs work a komboloi. |
| Left and right arrows | Swing the strand. |

The keys work while the strand has focus. With reduced motion requested, the
strand is damped harder and comes to rest sooner.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `material` | `MaterialId` | `'amber'` | `'amber'`, `'cherry-amber'`, `'olive-wood'`, `'ox-bone'`, `'mati'` or `'onyx'`. |
| `beads` | `number` | `21` | Whole beads from 9 to 45. Odd counts are traditional. |
| `seed` | `number` | `7` | Each seed strings a different strand. The same material, count and seed always string the same one. |
| `tassel` | `string` | the material's first | Tassel and cord colour, as CSS hex or `rgb()`. `MATERIALS[id].tassels` lists the traditional ones with names. |
| `sound` | `boolean` | `true` | Click when beads knock. Browsers start audio on the first press, tap or key. |
| `volume` | `number` | `0.6` | From 0 to 1. |
| `onClack` | `(strength: number) => void` | | Called on every knock, with its strength from 0 to 1. |
| `label` | `string` | material and count | Accessible name. The strand is announced as worry beads with its keyboard controls. |
| `className` | `string` | | Applied to the root. |
| `style` | `CSSProperties` | | Applied to the root. |

## Sizing and styling

A strand fills its container's width at a 1:2 aspect ratio. To size one by
height instead, set its height and `width: auto`:

```css
.bench .komboloi {
  height: min(70vh, 560px);
  width: auto;
}
```

The strand draws past its box, half its width either side, so a swing stays
in view. Give it that room, and keep `overflow: hidden` off its parents.

`--komboloi-shadow` sets how strong its shadow on the wall is: `0.2` suits a
pale wall, and something nearer `0.4` a dark one. The focus ring follows
`currentColor`.

## Development

```sh
npm run dev --workspace komboloi         # the demo page: a rail of six strands and a stringing bench
npm run build:page --workspace komboloi  # the demo as one self-contained file, output/komboloi.html
```

`build:page` inlines the demo's script and stylesheet into a single HTML file
written the way a hosted artifact page expects, ready to publish as it is.
