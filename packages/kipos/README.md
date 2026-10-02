# kipos

A Greek garden for React. A raised stone bed in yiayia's yard, and whitewashed
olive oil tins for the windowsill. Sow a packet, water it, and come back
tomorrow: plants grow over real days while their soil is wet, wilt when you
forget them, and perk up again when you water.

κήπος: Greek for garden.

```sh
npm install kipos
```

```tsx
import { Bed, Teneke } from 'kipos'
import 'kipos/style.css'

export function Yard() {
  return (
    <>
      <Bed />
      <Teneke plant="basil" />
    </>
  )
}
```

The stylesheet is a separate import so it can be bundled, ordered or overridden
like any other CSS. Every rule is scoped to `kipos` classes.

MIT. React 19. No runtime dependency beyond [`object-studies-core`](../core).
Everything is drawn with DOM, CSS and SVG: no canvas, no WebGL. The materials
(soil, limestone, olive wood, galvanised steel, whitewash, paper) and the
botanical drawings are SVG baked into `src/art.css` by `scripts/build-art.mjs`.
Change the script and re-run it; never edit `art.css` by hand.

## How the garden keeps time

Nothing ticks while the page is closed. Each planting keeps when it was sown,
when it was last watered and how many wet hours it has banked, and its state is
worked out from those whenever the page is open. A visitor who returns after
three days sees three days of growth, or three days of thirst, at once.

- One watering keeps the soil wet for **24 garden hours**. The soil darkens when
  wet and fades as it dries.
- Plants **only grow while their soil is wet**. Once it dries they wilt and
  wait. Watering revives them with no growth lost. Nothing dies.
- Days to ripe, watered daily: basil 2, cucumber 3, geranium 3, tomato 4,
  watermelon 5.
- Ripe tomatoes and cucumbers can be picked again and again. A watermelon vine
  gives one melon, then the plot is free. Ripe basil can be pinched back, which
  makes it bushier. Geraniums are for looking at.
- Winding the device clock back never grows or shrinks a plant.

State is kept in `localStorage`, versioned and validated on load: no login, no
server. It lives in that browser only.

## `<Bed>`

Three plots, a tray with tomato, cucumber and watermelon seed packets, and a
galvanised watering can. Pick up a packet and choose an empty plot to sow it.
Pick up the can and choose plots to water. With nothing in hand, choose a ripe
plant to pick it. Escape puts things back. A kraft tag on the bed counts the
days since the first sowing, and everything picked.

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `persistence` | `false \| { key: string }` | `{ key: 'kipos:bed' }` | Where the garden is kept. Two beds on one page need two keys. `false` keeps it for this page view only. |
| `speed` | `number` | `1` | Garden hours per real hour. `1440` makes a garden day pass in a minute, for demos. |
| `light` | `'auto' \| 'morning' \| 'midday' \| 'afternoon' \| 'dusk' \| 'night'` | `'auto'` | The light on the bed. `auto` follows the visitor's clock. |
| `showHint` | `boolean` | `true` | The line under the bed that says what to do next. With it off, the same words are still announced to screen readers. |
| `labels` | `KiposLabelOverrides` | English | Every visible and announced string. Crop and stage names merge key by key. |
| `className`, `style` | | | Applied to the root. |

The bed fills the width it is given and keeps a 10 : 7 shape.

## `<Teneke>`

One tin with basil or a geranium in it, small enough for a sidebar. Press it to
sow, then press it to water. Ripe basil shows a Pinch button.

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `plant` | `'basil' \| 'geranium'` | `'basil'` | |
| `persistence` | `false \| { key: string }` | `{ key: 'kipos:teneke:<plant>' }` | Each tin on a page needs its own key. |
| `speed`, `light`, `labels` | | | As for `Bed`. |
| `showStatus` | `boolean` | `false` | A line under the tin saying how it is doing. |
| `className`, `style` | | | The tin is 180px wide by default; set `width` to change it. |

## Building your own

The engine is exported for anyone who wants their own garden: `sow`, `water`,
`harvest` and `readPlanting` are pure functions of a planting and a time, and
`<Plant crop progress wilted seed />` draws any crop at any stage.

## Accessibility

Every plot, packet, tin and the can is a real button with a name that says what
it holds and how it is doing ("Plot 1: Tomato, flowering, soil drying out").
What happens after each action is announced. Reduced motion turns off the
growing, lifting and pouring animations.

## Development

```sh
npm run dev -w kipos               # the demo, with a fast-forward control
npx vitest run packages/kipos      # engine, storage and SSR tests
npm run build -w kipos
node packages/kipos/scripts/build-art.mjs   # regenerate the art
```
