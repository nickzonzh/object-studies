# kollaz

A tactile craft table for React. Pick a tool out of the caddy and make a mess on
a sheet of torn construction paper: a glue stick that goes on purple and dries
clear, glitter that only sticks while the glue is wet, scissors that cut
everything under the blades, masking tape, a texta, a rubber stamp, pipe
cleaners, pom poms and googly eyes.

κολάζ: Greek for collage.

```sh
npm install kollaz
```

```tsx
import { CraftTable } from 'kollaz'
import 'kollaz/style.css'

export function Table() {
  return <CraftTable />
}
```

The stylesheet is a separate import so it can be bundled, ordered or overridden
like any other CSS. Every rule is scoped to `kollaz` classes, and the caddy lays
itself out for the width the table is given.

MIT. React 19. Runtime dependencies are [`object-studies-core`](../core) and
[`polygon-clipping`](https://github.com/mfogel/polygon-clipping), which does the
scissor geometry.

## What you get

- **Glue stick.** Goes on purple and dries clear in about 15 seconds. It is
  tacky while it is purple.
- **Glitter** in four colours, and **holographic sequins**. They only stick to
  tacky glue, and each flake glints as the pointer light moves.
- **Pom poms.** Pressed into tacky glue they stay put. Anywhere else they roll,
  collide and settle.
- **Rubber stamp and ink pad.** A fresh inking gives about five impressions,
  breaking up into a patchy print as it runs dry.
- **Scissors.** Cut all the way round a shape and it lifts out of the sheet,
  carrying everything on it and leaving a hole. Cut from edge to edge to split
  the sheet. A cut that stops on the paper leaves a slit. Scissors cut every
  layer under the blades, so a loop across a cut-out piece cuts that too.
- **Texta.** Permanent ink that soaks into the paper and goes wherever the
  paper goes.
- **Masking tape.** Holds down cut-out pieces and pipe cleaners, covers the glue
  and glitter it is laid over, and can be written or stamped on.
- **Pipe cleaners.** Draw a path and a chenille stem bends along it, up to
  about 15 cm.
- **Googly eyes** whose pupils rattle under gravity.
- **Tip off loose bits.** The mat tilts and anything not glued slides off.

`CraftTable` takes no props: it is a whole table with a sample already on it.
Tools are picked up with the pointer or the keyboard, but working on the mat
needs a pointer (mouse, pen or touch). On touch, a tool goes back to the caddy
after every stroke.

## Drop-ins

Two pieces of the table work anywhere on a page.

```tsx
import { CraftPaper, GooglyEye } from 'kollaz'

<CraftPaper color="#c7433a" seed={21} torn={['top', 'bottom']}>
  <GooglyEye size={54} />
  <GooglyEye size={42} track />
  <p>Anything can go on torn paper.</p>
</CraftPaper>
```

`GooglyEye`

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `size` | `number` | `48` | Diameter in px. |
| `track` | `boolean` | `false` | The pupil follows the cursor instead of rattling under gravity. |
| `wobble` | `number` | `1` | How hard the eye's own movement (scrolling, dragging) throws the pupil around. |
| `className`, `style` | | | Applied to the eye. |

Scroll the page and the pupils rattle. `bumpGooglyEyes(strength)` jiggles every
eye on the page, like knocking the table. All the eyes on a page share one
animation loop, which sleeps once they settle.

`CraftPaper`

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `color` | `string` | `'#2f4f9e'` | Construction paper colour. `PAPERS` lists the table's own. |
| `seed` | `number` | `1` | The same seed always tears the same way. |
| `torn` | `Edge[]` | all four | Which edges are torn: `'top'`, `'right'`, `'bottom'`, `'left'`. The rest are clean cuts. |
| `roughness` | `number` | `9` | How deep the tear wanders, in px. |
| `className`, `style`, `children` | | | |

## How it works

The physical objects (caddy, tools, paper, eyes) are DOM and CSS. Glue, glitter,
sequins and pom poms render to one high-density effects canvas. Stamp prints,
texta and tape share an ink canvas beneath it, replayed in the order they were
made, so later ink goes over earlier tape and each cut only removes what was
there before it.

- `src/components/CraftTable.tsx`: interaction, simulation state and the render loop.
- `src/lib/glitter.ts`, `pompom.ts`, `stamp.ts`, `googly.ts`: the physics of each material.
- `src/lib/cut.ts`, `tornEdge.ts`, `tape.ts`, `pipe.ts`: paper, cut and tape geometry.
- `src/lib/toolMotion.ts`: binds core's tool motion to the caddy, so each tool's
  working tip lands exactly on the pointer.

Resting glitter is painted once into a cached layer, and each frame only redraws
the flakes catching the light. The idle shimmer settles ten seconds after the
last pointer movement over the table, so a table nobody is using costs next to
nothing. Nothing draws while the table is scrolled out of view.

On the server the table renders its caddy and sheet; the canvases fill in once
it mounts in the browser.

## Known limits

- Glitter and sequins on a cut-out piece keep the sparkle they had when cut,
  but stop reacting to the light.
- Glue, glitter and prints added on top of a piece stay put if the piece is
  then moved.

## Development

```sh
npm run dev -w kollaz             # the table and the drop-ins
npx vitest run packages/kollaz    # geometry, physics and SSR tests
npm run build -w kollaz
```

Tests cover torn edges, cuts (loops, sloppy loops, self-crossing loops,
edge-to-edge splits, slits, misses), tape, pipe cleaners, pupil physics, glue
tackiness and drying, glitter sticking and tipping, glints, sequin film, pom
pom rolling and gluing, stamp ink, and the tool rest pose and lean. Real touch
hardware and the feel of the physics still need a hands-on check.
