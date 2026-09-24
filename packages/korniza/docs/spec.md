# KORNIZA — Product & Implementation Spec

**Project:** `nickzonzh/korniza`  
**Name:** **Korniza** (`κορνίζα`, Greek for picture frame)  
**Product type:** Reusable React component collection + demo gallery  
**Initial stack:** React 19, TypeScript, Vite, CSS, inline SVG  
**Initial variants:** Baroque Gold, Carved Oak, Dark Walnut  
**Later variants:** Champagne Rococo, Ebonised Black  

---

## 1. Product thesis

Korniza is a set of **ornate, dimensional gallery-frame components for the web**.

It is not:

- a decorative CSS border pack
- a flat image-frame effect
- an image editor
- a generic frame generator
- a set of raster overlays

It is:

> **a collection of physical presentation objects with carved depth, believable materials, layered mouldings, proper artwork recesses, and a genuine content slot.**

The child can be an image, painting, project screenshot, video, canvas, generative artwork, live React component, or arbitrary DOM content.

The frame is the product. The demo exists to showcase and stress-test it.

---

## 2. Design target

Reference world:

- major art galleries
- antique framing shops
- private Victorian collections
- classical portrait galleries
- Baroque/Rococo gilded frames
- restrained carved timber museum frames

Target:

> **museum object, not theatre prop**

The frames may be rich, ornate and aged, but should never read as:

- game HUD chrome
- cartoon treasure-chest UI
- clip-art ornament
- faux-vintage kitsch
- obvious Photoshop bevels
- flat gold gradients

### Design doctrine

1. **Physical object first.** A blank frame should already be beautiful.
2. **Designed realism.** Use real material cues without reproducing random real-world ugliness.
3. **2.5D, not fake 3D.** DOM + CSS + SVG are the default.
4. **One coherent light source.** Material responses should make spatial sense.
5. **Static mass.** The frame does not tilt or float on hover; only light changes.
6. **Content independence.** The frame accepts arbitrary child content.
7. **Restraint.** Rich detail is concentrated where it adds hierarchy and form.

---

## 3. Component model

Conceptual API:

```tsx
<GalleryFrame variant="baroque-gold" ratio="4 / 5">
  <img src="/portrait.jpg" alt="Portrait" />
</GalleryFrame>
```

Equally valid:

```tsx
<GalleryFrame variant="dark-walnut" ratio="16 / 9">
  <ProjectPreview />
</GalleryFrame>
```

The centre is a real DOM content slot, not a flattened image composite.

### V1 API

```ts
export type FrameVariant =
  | 'baroque-gold'
  | 'carved-oak'
  | 'dark-walnut'

export type GalleryFrameProps = {
  variant: FrameVariant
  ratio?: string
  children: React.ReactNode
  className?: string
}
```

Do **not** expose internal design controls such as ornament density, bevel depth, patina amount, grain intensity, or frame thickness in V1. These are authored variant decisions.

---

## 4. Collection

### 4.1 Baroque Gold — V1

The hero.

- broad profile
- dense corner ornament
- acanthus / scroll motifs
- layered gilded mouldings
- aged patina in recesses
- subtle red-brown bole showing beneath worn high points
- bead / reel inner detail
- strong carved relief

Personality:

> gloriously excessive museum portrait frame

### 4.2 Champagne Rococo — later

- paler champagne gold
- slimmer profile
- softer botanical forms
- shell-like flourishes
- more negative space
- delicate inner mouldings

### 4.3 Carved Oak — V1

- warm medium natural oak
- substantial stepped moulding
- restrained carving
- visible directional grain
- satin oil/wax finish
- rope / bead / modest botanical ornament
- optional subtle mitre joints

Personality:

> serious museum furniture

### 4.4 Dark Walnut — V1

- dark reddish-brown timber
- deeper carving than oak
- polished raised areas
- near-black recesses
- thin antique-gold inner liner
- strong stepped profile

Personality:

> old-master gallery frame

### 4.5 Ebonised Black — later

- near-black timber
- restrained relief
- grain visible mostly in highlights
- cool satin sheen
- antique-gold or ivory inner liner

---

## 5. Physical anatomy

A gallery frame should be layered:

```text
OUTER SILHOUETTE
↓
ORNAMENT / CARVED EDGE
↓
MAIN MOULDING
↓
SECONDARY MOULDING
↓
INNER BEAD / LINER
↓
DARK RABBET / RECESS
↓
ARTWORK
```

Simplified front view:

```text
╔════════════════════════════════════╗
║ ornamental outer moulding          ║
║  ┌──────────────────────────────┐  ║
║  │ secondary moulding           │  ║
║  │ ┌──────────────────────────┐ │  ║
║  │ │ inner liner             │ │  ║
║  │ │  ┌────────────────────┐ │ │  ║
║  │ │  │     ARTWORK        │ │ │  ║
║  │ │  └────────────────────┘ │ │  ║
║  │ └──────────────────────────┘ │  ║
║  └──────────────────────────────┘  ║
╚════════════════════════════════════╝
```

The child content must look physically recessed behind the frame.

---

## 6. Nine-slice architecture

A giant full-frame SVG scaled to arbitrary dimensions is the wrong foundation because it distorts corners, scrollwork, grain and rails.

Use a **nine-slice / nine-patch architecture**:

```text
┌────────┬─────────────────┬────────┐
│   TL   │       TOP       │   TR   │
├────────┼─────────────────┼────────┤
│  LEFT  │     CONTENT     │ RIGHT  │
├────────┼─────────────────┼────────┤
│   BL   │     BOTTOM      │   BR   │
└────────┴─────────────────┴────────┘
```

### Rules

**Corners**
- fixed square based on frame thickness
- never stretched independently
- preserve aspect at every ratio
- may mirror/rotate from a master
- sit above rails to hide seams

**Horizontal rails**
- scale/tile only on X
- preserve vertical profile

**Vertical rails**
- scale/tile only on Y
- preserve horizontal profile

**Centre**
- arbitrary aspect ratio
- real child content

The implementation may use CSS Grid without literally making nine React components, as long as the behaviour is genuine and maintainable.

---

## 7. Suggested DOM structure

```tsx
<div className="gallery-frame">
  <div className="frame-grid">
    <Corner position="tl" />
    <Rail side="top" />
    <Corner position="tr" />

    <Rail side="left" />

    <FrameOpening>
      {children}
    </FrameOpening>

    <Rail side="right" />

    <Corner position="bl" />
    <Rail side="bottom" />
    <Corner position="br" />
  </div>
</div>
```

---

## 8. Responsive frame sizing

Frame thickness should scale within authored limits rather than indefinitely.

Preferred direction:

```css
--frame-width: clamp(40px, 9cqw, 110px);
```

Fallback:

```css
--frame-width: clamp(40px, 9%, 110px);
```

The ornament should scale with **frame thickness**, not arbitrarily with total component width.

---

## 9. Artwork opening

Suggested structure:

```tsx
<div className="frame-opening">
  <div className="frame-content">
    {children}
  </div>
</div>
```

The opening provides:

- dark inner rabbet
- strong but restrained occlusion shadow
- clipping
- variant-specific liner
- correct stacking below mouldings

The inner shadow is one of the most important realism cues.

Without it: image with border.  
With it: mounted artwork behind a physical object.

---

## 10. Child-content behaviour

Raw React children remain valid and should not be aggressively restyled.

Optional helper:

```tsx
<GalleryArtwork src="/portrait.jpg" alt="Portrait" />
```

A helper may apply:

```css
width: 100%;
height: 100%;
object-fit: cover;
display: block;
```

The frame wrapper must not break child pointer/keyboard interaction.

---

## 11. Ratio support

Support arbitrary CSS ratios, including:

- `1 / 1`
- `4 / 5`
- `5 / 4`
- `2 / 3`
- `3 / 2`
- `16 / 9`

The moulding thickness should remain believable across portrait, square and landscape.

---

## 12. Depth hierarchy

```text
wall
↓
frame cast shadow
↓
outer frame body
↓
ornament relief
↓
inner moulding / liner
↓
dark rabbet
↓
inner occlusion shadow
↓
artwork
```

### Wall shadow

Use two restrained layers:

1. **Contact shadow** — close and darker
2. **Ambient cast shadow** — larger and softer

No glow.

Variant weight may differ:

- Baroque: heaviest
- Oak: moderate
- Walnut: moderate-heavy

---

## 13. Lighting

One virtual light source nominally above-left.

Shared conceptual variables:

```css
--light-x
--light-y
--specular-shift-x
--specular-shift-y
```

Pointer movement may alter local light coordinates.

### Important

The object **does not tilt**.

No trendy 3D hover-card movement. The frame is mounted and heavy.

Only material response changes.

### Material response

**Gold**
- strongest specular response
- bright high points
- dark carved recesses
- occasional cool highlight

**Oak**
- broad, soft satin response
- grain remains visible

**Walnut**
- richer, more polished response
- high points catch light
- recesses remain near-black

Under `prefers-reduced-motion`, lighting may remain static.

---

## 14. Technology rule

Use:

- DOM for layout/content
- CSS for mouldings, depth, material, grain, shadows and light
- inline SVG for ornate geometry

No Three.js in V1.

---

# Ornament system

## 15. Geometry vs material

Rule:

> **SVG for geometry, CSS for material.**

SVG owns:

- leaves
- scrolls
- shells
- rosettes
- repeating carved motifs

CSS owns:

- gold
- timber colour
- grain
- highlights
- patina
- shadows
- lighting response

---

## 16. Initial motif vocabulary

Likely reusable pieces:

- acanthus leaf
- volute / scroll
- rosette
- bead-and-reel
- egg-and-dart
- rope twist
- laurel
- leaf band
- restrained floral flourish

Do **not** build a generic ornament engine.

Build concrete frames, then extract only real reuse.

---

## 17. Relief rendering

Flat SVG paths will look printed.

Simple bas-relief approach:

1. low-opacity highlight copy offset up-left
2. main ornament path
3. low-opacity shadow copy offset down-right

Conceptual offsets:

```text
highlight   -0.6px, -0.8px
main         0px,    0px
shadow      +1.0px, +1.3px
```

Use lightweight filters sparingly.

---

## 18. Ornament density

Baroque guideline:

- corners: 100%
- rails: 40–60%
- inner band: ~20%

Do not give every region equal visual complexity.

---

## 19. Corner / rail joins

Corners should overlap rails slightly and sit above them in z-order.

```css
.frame-corner { z-index: 3; }
.frame-rail   { z-index: 2; }
```

This is preferable to relying on perfect edge-to-edge SVG joins.

---

## 20. Rail strategies

Use the right technique per motif:

- smooth moulding → stretch CSS gradient
- beads → repeating CSS radial/linear gradient or compact SVG tile
- repeating carving → tile modular SVG segment
- organic rail ornament → repeatable SVG strip hidden beneath corners

---

# Baroque Gold detailed spec

## 21. Profile

```text
outer acanthus / scroll edge
↓
convex gilded moulding
↓
dark recessed channel
↓
bead-and-reel band
↓
quiet inner gold liner
↓
dark rabbet
↓
artwork
```

---

## 22. Corner ornament

Possible forms:

- acanthus leaves
- mirrored scrolls
- central rosette or shell-like flourish
- secondary leaves extending into rails

Corners may extend slightly beyond the nominal frame body.

---

## 23. Gold palette

Initial direction:

```text
bright catch      #f3d878
yellow gold       #d8ae45
warm gold         #b9832e
orange recess     #8f5d24
brown shadow      #5c3a1e
bole undertone    #6f3325
```

Treat as directional, not locked.

Gold must contain multiple tonal zones. Flat `#d4af37` is unacceptable.

---

## 24. Gilding wear / bole

Subtle red-brown ground may appear through tiny irregular worn high points.

Purpose:

- suggest gold leaf
- avoid sprayed-plastic appearance
- imply age/craft

Do not add giant chips, cracks or fake distress.

---

## 25. Gold patina

Recesses naturally darken through:

- light occlusion
- darker material tone
- mild patina colour

Raised edges stay bright.

---

## 26. Gold irregularity

Use extremely low-opacity large-scale variation.

Good:

- faint mottling
- tiny hue shifts
- slight leaf inconsistency

Bad:

- scratches
- obvious texture tiles
- TV-static noise

---

## 27. Inner liner

A calmer narrow gold liner around the artwork:

- convex profile
- bright top/left
- darker lower/right
- shadow into rabbet

---

# Carved Oak detailed spec

## 28. Profile

```text
rounded outer timber
↓
shallow carved channel
↓
broad main timber face
↓
restrained rope / bead inner moulding
↓
dark rabbet
↓
artwork
```

---

## 29. Ornament

Use restraint:

- small botanical corner carve
- rope or bead inner band
- shallow channel
- fine dentil/bead repetition

Enough to feel crafted, not generic.

---

## 30. Oak palette

```text
light catch      #b88b5c
base oak         #8a623e
grain            #62432d
dark pore        #473020
recess           #302117
```

Avoid orange farmhouse timber.

---

## 31. Grain

Use layered procedural grain:

- broad low-frequency elongated bands
- fine irregular streaks
- occasional dark pore hints

Avoid obvious knots in V1.

### Grain direction

```text
top/bottom rails → horizontal
side rails       → vertical
corners          → diagonal / mitred where feasible
```

This directional logic is a major realism cue.

---

## 32. Mitre joints

Oak may show very subtle 45° mitre seams near corners.

They should communicate physical construction, not become graphic decoration.

---

## 33. Finish

Satin oil/wax.

- broad soft highlight
- low gloss
- visible grain beneath light

---

# Dark Walnut detailed spec

## 34. Profile

```text
deep rounded outer moulding
↓
carved leaf band
↓
dark recessed channel
↓
polished inner moulding
↓
thin antique-gold liner
↓
rabbet
↓
artwork
```

---

## 35. Palette

```text
highlight        #76503b
warm surface     #533526
deep walnut      #3c271d
recess           #241813
near-black       #17100d
```

Use a subtle reddish undertone.

---

## 36. Finish

More reflective than oak, less than gold.

Think:

- long-term oil/wax
- slightly burnished high points
- near-black carved recesses

---

## 37. Ornament

Possible:

- foliate corner carvings
- repeating leaf/vine band
- deep stepped profile
- narrow antique-gold liner

Architectural, not Rococo.

---

# Later variants

## 38. Champagne Rococo

After Baroque is locked:

- paler gold
- slimmer frame
- shell motifs
- lighter flourishes
- more negative space
- delicate bands

## 39. Ebonised Black

After wood systems are locked:

- near-black timber
- subtle grain under highlights
- formal relief
- deep shadow
- antique-gold or ivory liner

---

# Material systems

## 40. Shared CSS variables

Possible vocabulary:

```css
--material-highlight;
--material-bright;
--material-base;
--material-mid;
--material-dark;
--material-recess;

--liner-color;
--frame-width;
--corner-size;
--recess-depth;

--light-x;
--light-y;
--specular-shift-x;
--specular-shift-y;
```

Variants consume them differently.

---

## 41. Texture rules

### Timber

Do not use stock `wood.jpg`.

Prefer:

- CSS gradients
- authored directional grain
- subtle SVG turbulence/noise where useful
- low-opacity overlays

### Gold

Gold realism should come mostly from:

- profile geometry
- relief
- light
- dark recesses
- tonal range

Texture is secondary.

---

# Demo app

## 42. Purpose

The demo exists to:

- compare variants
- validate ratios
- inspect scaling
- showcase the components

Do not build a frame editor.

---

## 43. Identity

Recommended:

```text
KORNIZA

Frames for things worth looking at.
```

---

## 44. Environment

Warm neutral gallery-wall tone, roughly soft limestone/plaster.

No fake gallery room.
No floor.
No skirting.
No spotlight cones.

---

## 45. Comparison

Initially use the **same artwork** in all variants.

This isolates frame quality from content quality.

Later add a simple ratio-validation section.

---

# Accessibility

## 46. Decorative semantics

Frame ornament should be `aria-hidden`.

The child content owns semantics.

Do not add pointless `tabIndex` values.

The wrapper must not break child interactions.

---

# Performance

## 47. Goals

Several visible frames should remain smooth while local pointer-light response runs.

Avoid:

- hundreds of repeated DOM/SVG paths
- heavy SVG filter stacks
- continuous loops on non-hovered frames
- giant raster textures
- WebGL

Prefer reusable motif tiles and CSS for simple moulding geometry.

---

# Suggested repo structure

## 48. Structure

```text
src/
├── App.tsx
├── main.tsx
│
├── components/
│   ├── GalleryFrame/
│   │   ├── GalleryFrame.tsx
│   │   ├── FrameGrid.tsx
│   │   ├── FrameOpening.tsx
│   │   └── types.ts
│   │
│   └── GalleryArtwork/
│       └── GalleryArtwork.tsx
│
├── variants/
│   ├── BaroqueGold/
│   │   ├── BaroqueGold.tsx
│   │   ├── baroque.css
│   │   └── ornaments/
│   │
│   ├── CarvedOak/
│   │   ├── CarvedOak.tsx
│   │   └── oak.css
│   │
│   └── DarkWalnut/
│       ├── DarkWalnut.tsx
│       └── walnut.css
│
├── ornaments/
│   ├── Acanthus.tsx
│   ├── Rosette.tsx
│   ├── Volute.tsx
│   ├── BeadReel.tsx
│   ├── Rope.tsx
│   └── LeafBand.tsx
│
├── hooks/
│   └── useFrameLighting.ts
│
├── demo/
│   ├── Gallery.tsx
│   └── DemoArtwork.tsx
│
└── styles/
    ├── global.css
    └── gallery.css
```

Do not split trivial code simply to match this tree. It is directional.

---

# V1 exclusions

## 49. Explicitly not included

- image uploader
- drag/drop
- cropper
- frame editor
- colour picker
- ornament picker
- mat configurator
- glass toggle
- museum plaques
- composited PNG export
- frame rotation
- hanging wire
- wall-layout builder
- 3D tilt
- Three.js
- user-authored variants

---

# Milestones

## 50. F0 — Scaffold

Set up:

- React 19
- TypeScript
- Vite
- demo shell
- CI
- GitHub Pages
- responsive base

No material work.

---

## 51. F1 — Generic scalable shell

Build a deliberately plain frame proving:

- nine-slice architecture
- fixed-proportion corners
- independently scaling rails
- arbitrary child content
- portrait/square/landscape
- responsive frame width
- inner clipping
- inner occlusion shadow
- wall contact/ambient shadows
- no visible seams

No ornament.
No gold.
No wood grain.
No glass.
No mat.

**Gate:** geometry must be excellent before ornament begins.

---

## 52. F2 — Baroque Gold

Implement:

- layered gold mouldings
- corner ornament
- rail ornament
- inner bead
- patina
- subtle bole
- liner
- local pointer lighting
- deep recess

**Gate:** a still screenshot with blank artwork should look expensive.

---

## 53. F3 — Carved Oak

Implement:

- procedural oak grain
- directional rail grain
- stepped profile
- restrained carving
- subtle mitres
- satin material response

---

## 54. F4 — Dark Walnut

Implement:

- dark directional grain
- polished high points
- deeper carving
- near-black recesses
- antique-gold liner

---

## 55. F5 — Ratio QA

Test all initial frames at:

- `1 / 1`
- `4 / 5`
- `5 / 4`
- `2 / 3`
- `3 / 2`
- `16 / 9`

Validate:

- corners remain undistorted
- rails do not smear
- ornament does not stretch on the wrong axis
- opening stays centred
- shadows remain coherent
- frame width remains believable

---

## 56. F6 — Responsive polish

Test:

- desktop
- tablet
- mobile
- high DPI

Focus on:

- corner overlap
- rail seams
- ornament density
- frame thickness
- liners
- shadows

---

## 57. F7 — Expand to five

Only after F2–F6 are locked:

- Champagne Rococo
- Ebonised Black

---

# Acceptance criteria

## 58. Physical read

A frame with blank white content must still unmistakably resemble a physical gallery frame.

## 59. Scalability

Portrait, square and landscape must all work without distorted corners or broken seams.

## 60. Material separation

Without labels:

- Gold reads as carved gilding
- Oak reads as natural timber
- Walnut reads as dark polished timber

## 61. Depth

Artwork visibly sits behind the mouldings.

## 62. Ornament

Baroque relief looks carved rather than printed.

## 63. Lighting

Pointer movement subtly changes material highlights without moving the object.

## 64. Content independence

Arbitrary React children render without needing Korniza-specific knowledge.

## 65. Performance

Several frames can be shown simultaneously with smooth local light response.

## 66. Mobile

No clipped ornament, absurd frame ratios, seam artefacts or page overflow.

---

# QA matrix

## Geometry

- [ ] 1:1
- [ ] 4:5
- [ ] 5:4
- [ ] 2:3
- [ ] 3:2
- [ ] 16:9
- [ ] corner proportions stable
- [ ] rails join cleanly
- [ ] opening remains centred
- [ ] no wrong-axis stretching

## Baroque material

- [ ] multiple gold tonal zones
- [ ] deep recesses
- [ ] high points catch light
- [ ] wear/bole subtle
- [ ] no flat metallic yellow

## Oak material

- [ ] grain follows rails
- [ ] grain is not repetitive
- [ ] satin rather than plastic
- [ ] mitres restrained

## Walnut material

- [ ] visibly dark timber, not flat black
- [ ] polished high points
- [ ] deep recesses
- [ ] gold liner subordinate

## Interaction

- [ ] light follows pointer subtly
- [ ] no frame tilt
- [ ] no highlight snapping
- [ ] no needless animation when not hovered
- [ ] reduced-motion remains polished

## Content

Test with:

- [ ] image
- [ ] blank colour block
- [ ] text/card
- [ ] canvas
- [ ] interactive child if practical

---

# Implementation rule

Build Korniza in this order:

> **geometry → physical depth → material → ornament → polish**

Do not begin Baroque Gold until the generic F1 shell is visually and structurally correct.
