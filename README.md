# Kimolia

A physical chalkboard for the web. Dark slate, aged oak, four pieces of chalk, and a proper wood-and-felt duster.

**K0–K2:** the physical object and tool interaction study. Pick up chalk or the duster, move over the slate, press to make contact, and put it back. Drawing, erasing, history, persistence and export come in later milestones.

![Kimolia desktop object study](docs/images/desktop.png)

## Run

Use Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the printed local URL at `/kimolia/`.

```sh
npm run lint
npm test
npm run build
npm run preview
```

`build` runs strict TypeScript checks and produces `dist/`. The only runtime dependencies are React 19 and React DOM. The lockfile records the exact versions.

## Object construction

- Four directional oak frame pieces with mitred joints, rounded outside edges, shallow bevels and a dark inner rabbet.
- A recessed slate surface with mineral variation, fine grain and restrained wiping residue. No specular sheen.
- A projecting timber ledge with a rear groove, rounded front lip, contact shadows and sparse chalk dust.
- Four matte, irregular chalk sticks; a timber duster handle over layered charcoal felt.
- A fixed above-left light source, with tighter tool shadows on contact.
- A 1040px maximum width and 1.6:1 desktop board; 4:3 below 520px. The tools remain separated at 320px.

The object is DOM/CSS. Five small procedural SVG material assets are generated locally by `npm run materials` and committed. They use fixed seeds, contain no external resources, and require no runtime generation. There are no stock textures, image-service assets, fonts, analytics, storage or network APIs.

`src/components/Chalkboard/` owns composition. `src/styles/` separates the page, slate, timber, chalk and felt materials. The material generator is in `scripts/generate-materials.mjs`.

## Tool interaction

Click or tap a physical tool to pick it up. Its place on the rail becomes empty. Move onto the slate and press to feel contact; choose another tool to switch. Choose the same tool again, press Escape, or use **Put back** to return it.

Keyboard: Tab to a tool and activate it with Enter or Space. Focus moves to the slate. Arrow keys move the tool; Shift takes larger steps; hold Space or Enter to make contact. Escape returns the tool and focus to its rail button.

Each tool has a named native button with `aria-pressed`, a visible keyboard focus ring and an independent minimum 44px target. Selection changes are announced. Reduced motion and keyboard activation skip pickup travel. Touch gestures are captured only on the slate while a tool is selected; cancellation, resizing, scrolling and window focus loss cannot leave a tool stuck in contact.

`src/hooks/useToolInteraction.ts` owns selection and input lifecycles. `src/tools/toolMotion.ts` handles interruptible 160–220ms transform animations and lightweight pointer following without React renders per pointer event. Rotation pivots around the chalk tip or felt centre; contact snaps to the pointer. The duster has heavier hover inertia. Animation frames stop when settled, and all listeners/animations are cleaned up on unmount.

This milestone deliberately leaves no marks. The caption makes that boundary explicit.

## CI and Pages

CI runs install, lint, strict typecheck and production build on main pushes and pull requests. The Pages workflow independently repeats those checks before deploying.

The repository is public and Pages uses **GitHub Actions** as its source. Main pushes automatically build and deploy the app; the workflow can also be run manually. No repository variable is required.

The site URL is [nickzonzh.github.io/kimolia](https://nickzonzh.github.io/kimolia/). The Vite base is `/kimolia/`, following the [Vite Pages deployment guide](https://vite.dev/guide/static-deploy#github-pages).

## Visual verification

See [the K1 review](docs/K1-review.md) for the material baseline and [the K2 review](docs/K2-review.md) for interaction coverage and the handoff to the stroke renderer.
