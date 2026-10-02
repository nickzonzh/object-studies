# The Object Studies

Open-source React components that behave like the physical things they are named after.

| Package | What it is | |
| --- | --- | --- |
| [`kimolia`](packages/kimolia) | κιμωλία, chalk. A slate chalkboard in an oak frame, with textured chalk and a felt duster. | `npm install kimolia` |
| [`melani`](packages/melani) | μελάνι, ink. An aluminium-framed whiteboard with four markers and an eraser in the tray. | `npm install melani` |
| [`korniza`](packages/korniza) | κορνίζα, frame. Six dimensional gallery frames for images or any React content, with an optional mat and glazing. | `npm install korniza` |
| [`keramos`](packages/keramos) | κέραμος, potter's clay. Hand-painted Greek pottery, glazed and lit by the pointer, where every seed paints a different piece. | `npm install keramos` |
| [`kollaz`](packages/kollaz) | κολάζ, collage. A craft table with a glue stick, glitter, scissors, tape, pom poms and googly eyes. | `npm install kollaz` |
| [`komboloi`](packages/komboloi) | κομπολόι, worry beads. A strand on a brass peg that swings, slides and clicks, in amber, olive wood, bone, glass or onyx. | `npm install komboloi` |

Live demo: https://nickzonzh.github.io/object-studies/

```tsx
import { Chalkboard } from 'kimolia'
import 'kimolia/style.css'

export function Lesson() {
  return <Chalkboard persistence={{ key: 'lesson-board' }} />
}
```

Every package is ESM-only, targets React 19, ships its own types and one stylesheet, and
renders on the server. The packages share an engine,
[`object-studies-core`](packages/core), which is installed automatically.

## Repository layout

```
packages/core      object-studies-core: tool motion, gesture history, validated persistence
packages/kimolia   chalkboard
packages/melani     whiteboard
packages/korniza   gallery frames
packages/keramos   painted pottery
packages/kollaz    craft table
packages/komboloi  worry beads
apps/site          the demo site, built from the packages exactly as npm users get them
```

Each package has `src/` (the library), `demo/` (its own development page) and `test/`.

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev --workspace kimolia   # a package's demo page (also melani, korniza)
npm run dev:site                  # build the packages, then run the demo site
npm run check                     # lint, typecheck, test, build, package lint, consumer smoke test
```

`npm run check` ends with `smoke:consumer`: it packs every package, installs the tarballs into a
fresh project, renders every component on the server, type-checks a consumer with
`moduleResolution: nodenext` and bundles a browser consumer with Vite.

## Releasing

Versions and changelogs are managed with [Changesets](https://github.com/changesets/changesets).

1. Describe each user-facing change with `npm run changeset` and commit the generated file.
2. On `main`, the Release workflow opens a "Version packages" pull request. Merging it publishes
   the changed packages to npm with provenance.

Publishing uses npm trusted publishing: npm accepts releases from this repository's `release.yml`
workflow, so there is no npm token to store or rotate. Trusted publishing can only be configured on
a package that already exists, so the very first release is done locally with `npm login`, then
`npm run release`; after that, each package's npm settings name `nickzonzh/object-studies` and
`release.yml` as its trusted publisher.

## License

[MIT](LICENSE)
