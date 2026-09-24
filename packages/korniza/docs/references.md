# Frame references

Photographic sources consulted while carving the frames in this collection. Every
image listed was viewed, not just its caption; the measurements quoted in the
notes are luminance percentiles sampled from the linked photographs.

## Gilded Baroque / Louis XIV

| Reference | Source | URL | What it informed |
| --- | --- | --- | --- |
| Louis XIV style frame, 1975.1.2350, carved and gilded wood | The Metropolitan Museum of Art, Robert Lehman Collection | <https://www.metmuseum.org/art/collection/search/461587> · [web-large image](https://images.metmuseum.org/CRDImages/rl/web-large/SF-1975-1-2350.jpg) | The primary rail reference for the foliate pass. Ornament and plain moulding sit in one value family; the rail carving reads by shape, never as a lighter or darker stripe. The ornamented band is the outer ~45% of the section and is never a uniform repeat: unequal acanthus leaves and C-scrolls run between the corners, a shell cartouche breaks each rail at its centre, and the ground between the leaves is punched rather than smooth. |
| Louis XIV style Ovolo frame, 1975.1.2536, "carved, gilt; brown-red bole" | The Metropolitan Museum of Art, Robert Lehman Collection | <https://www.metmuseum.org/art/collection/search/461358> · [web-large image](https://images.metmuseum.org/CRDImages/rl/web-large/SF-1975-1-2536.jpg) | Bole colour under the gilding, and the proportion of ornamented edge to plain ogee on an ovolo section. Also how a corner ornament hands off: its tails run a long way down the rail and taper into the running carving instead of stopping at the mitre. Relief is read through light direction — lit upper-left edges, shadowed lower-right — not through contrast of its own. |
| The Sunderland Frame, stock no. 11673 (whole frame and three details) | Arnold Wiggins & Sons | <https://www.arnoldwiggins.com/notes/2019/11/29/the-sunderland-frame> | Colour range of water gilding: pale warm crests, mid-gold flats, warm brown — not black — in the hollows; red bole breaking through on the high points; irregular wear ticks across repeated scrolls. |
| British Rococo frame, carving and gilding sequence (gadrooned top edge, partly gilded over bole) | The Frame Blog | <https://theframeblog.com/2013/05/17/carving-gilding-a-british-rococo-frame/> | The primary gadroon reference. Measured band luminance p10/median/p90 = 37/61/116 against a plain ogee at 52/88/164: the gadroon is *darker* than the flat beside it and its contrast is no wider than the moulding's own. |
| English carved and gilded frame no. 8230, corner and rail detail | Rollo Whately Ltd. | <https://rollowhately.com/frames/about/> | A running carved band whose median luminance (81) matches the plain rail next to it (55–96 range); how ornament turns a mitre so rail and corner read as one carved object. |
| Gadrooning: tapered lozenge lobes set at a raking angle | Wikipedia / Lowy 1907 glossary | <https://en.wikipedia.org/wiki/Gadrooning> · <https://www.lowy1907.com/antique-picture-frames/> | Lobe geometry for the gadroon the rail used to carry. Superseded: measured against the two Met frames above, an even gadroon is the wrong ornament for a Louis XIV rail, and a regular lobe pitch is exactly what made the band read as twisted rope. The value rule from the row above still governs. |

## Carved oak

| Reference | Source | URL | What it informed |
| --- | --- | --- | --- |
| Seventeenth-century frame in carved oak with mouldings (full frame + raking-light corner detail) | Antikeo | <https://www.antikeo.com/en/catalog/decorative-objects/old-frames/seventeenth-century-frame-in-carved-oak-with-mouldings-118157> | The primary oak reference. Measured carved band p2/median/p98 = 4/49/114 against the plain flat at 15/51/95: identical medians, only ~35% more range. Oak fibre runs straight through the carving; lobes are irregular in size. |
| A Guide to Picture Frames at Knole, Kent | National Portrait Gallery, The Art of the Picture Frame | <https://www.npg.org.uk/collections/research/programmes/the-art-of-the-picture-frame/guides-knole> | Oak as the 16th–17th century frame timber, stained or waxed rather than gilded; the resulting low-contrast, patinated surface. |
| British picture framemakers 1600–1950, entry for Linnell: "egg-and-anchor moulding of deep section with corner leaves and an inner twisted rope sight edge" | National Portrait Gallery, Directory of British Framemakers | <https://www.npg.org.uk/collections/research/programmes/conservation/directory-of-british-framemakers/l> | Placement of a rope twist as a narrow sight-edge member rather than a broad rail ornament. |
| Frames in paintings, part 2 — the 17th century ("the sight edge suggested as an astragal broken into long beads, or the top sections of a spiral ribbon") | The Frame Blog | <https://theframeblog.com/2024/10/21/frames-in-paintings-part-2-the-17th-century/> | How a rope/bead sight edge reads at a distance: a soft broken astragal, not a row of hard teeth. |
| English frames, rope twist back edge | Rollo Whately Ltd. | <https://rollowhately.com/frames/about/> | Scale of a rope relative to the frame width — roughly one lobe pitch to one member width. |

## What the measurements changed (gadroon and rope pass)

Both bands were repainted as light and shade over the moulding instead of opaque
colour of their own, so the profile's gradient, the oak grain and the travelling
pointer light all carry through the carving.

| | value range (p2–p98) before | after | local moulding |
| --- | --- | --- | --- |
| Baroque gadroon | 165 | 97 | 70 |
| Carved Oak rope | 134 | 108 | 80 |

Band median tracked the moulding it was cut into (Baroque 164 against 169; Oak
130 against 127), which is the relationship measured in every reference above.
The Baroque half of this pass is superseded below; the Carved Oak rope stands.

## What the Louis XIV pass changed

Repainting the gadroon as light and shade fixed its colour but not its shape: an
even lobe pitch with one highlight per lobe still read as corrugated rope, and
because the band ended up *lighter* than the member beside it, it read as a
stripe laid on the rail rather than carving cut into it. The two Met frames were
viewed at `web-large` and carry no such band anywhere.

The rail now carries a scrolling acanthus rinceau over a punched ground
(`rail.svg`), a shell cartouche at the centre of every rail (`BaroqueRail.tsx`),
and corner tails that run out along the band and taper into the running carving.
Measured on the top rail of a 420px frame at 6×, sampling the ornamented band
(10–42% of the section) against the plain secondary roll beside it (62–77%):

| | median | value range (p2–p98) |
| --- | --- | --- |
| Gadroon band, before | 169 | 97 |
| Plain roll beside it | 155 | 128 |
| Rinceau band, after | 145 | 143 |
| Plain roll beside it, after | 161 | 113 |

The band is now darker than the plain member beside it and has about a quarter
more range than it — hollows that go dark and crests that catch, which is the
relationship measured in the gadroon and Rollo Whately references above, and the
inverse of what the old band did.

Relief direction: the nine-slice mirrors each rail about its own cross-section,
so what survives the mirror is *outer edge to sight edge*, not world up to down.
The rail tile is therefore keyed from the outer-upper side of every lobe, the
same axis `--profile` is painted along, and the bottom and right rails take
`--profile-shadow` to place them under the key. Ornament that sits proud of the
band — the corner carvings and the centre cartouches — is counter-reflected per
position instead, so its cast shadows fall lower-right on all four rails.

## Champagne Rococo / Louis XV and English Rococo

| Reference | Source | URL | What it informed |
| --- | --- | --- | --- |
| 19th century copy of a Louis XV style frame, 1975.1.2357, carved and gilded wood | The Metropolitan Museum of Art, Robert Lehman Collection | <https://www.metmuseum.org/art/collection/search/461451> · [web-large image](https://images.metmuseum.org/CRDImages/rl/web-large/SF-1975-1-2357.jpg) | The primary corner and centre reference. A domed boss sits at each mitre with one C-scroll sweeping around it into both rails; a cartouche breaks the centre of every rail; the ground between them is textured, never smooth, and mostly *empty*. Measured: the corner cartouche p2/median/p98 = 11/124/253 against the plain left rail at 25/142/253 — the carving is about 18 levels darker than the moulding beside it and carries a slightly wider range (243 against 229), not a lighter stripe. |
| Louis XV Regency style frame, 1975.1.2247, carved and gilded wood | The Metropolitan Museum of Art, Robert Lehman Collection | <https://www.metmuseum.org/art/collection/search/460907> · [web-large image](https://images.metmuseum.org/CRDImages/rl/web-large/SF-1975-1-2247.jpg) | The Régence end of the style, with a continuous foliate run on every rail. Used as the counter-example: this is how close a Rococo frame gets to the Baroque rinceau before the two stop reading as different characters, so the running band here stayed sparser than this. |
| Carving & gilding a British Rococo frame (Gainsborough, *Thomas Linley the Elder*, and the Paul Mitchell replica photographed at six stages) | The Frame Blog | <https://theframeblog.com/2013/05/17/carving-gilding-a-british-rococo-frame/> · [frame detail](https://i0.wp.com/theframeblog.com/wp-content/uploads/2013/05/gainsborough-detail1.jpg) · [gilded corner](https://i0.wp.com/theframeblog.com/wp-content/uploads/2013/05/top-left-hand-corner-2.jpg) | The primary section reference: "a leaf-tip back edge, a gadrooned top edge, and an acanthus leaf sight edge… also a small sanded frieze next to the sight edge", with "two scrolling raffle leaves support a deeply fluted shell, and trail small floral sprigs down the main ogee moulding". That is the arrangement `rail.svg` draws. Also the finish: "sand is added on top of the gesso in the small flat frieze… this gives a strong granular texture, and acts as a foil to the smoothness of the main ogee", and burnished passages standing out against matte ones. |
| The picture frames of Wright of Derby, centre cartouche details from the frames on the *Self-portrait* c.1772–73 and *Mr & Mrs Coltman* c.1771 | The Frame Blog / Paul Mitchell | <https://theframeblog.com/2025/11/03/the-picture-frames-of-wright-of-derby-1734-97/> · [centre cartouches](https://i0.wp.com/theframeblog.com/wp-content/uploads/2025/11/11-details-of-centre-cartouches-on-self-portrait-mr-mrs-coltman.jpg) | The champagne colour itself, and the anatomy of a rail centre: a cabochon on the axis, two unequal sweeps, acanthus laid over them, scroll eyes left as dark sockets, all over a hazzled ground. Sampled by luminance band, the gilding runs `#35272a` → `#6b4e47` → `#b9a495` → `#ddd6cd` → `#e5dfd9`: a pale, low-saturation gold whose crests are close to white gesso and whose hollows stay warm brown. |
| English picture frames, a short study guide; and the corner detail of frame no. 6795, English 18C centre-and-corner pattern with original gilding | Rollo Whately Ltd. | <https://rollowhately.com/frames/about/> · [corner detail](https://i0.wp.com/rollowhately.com/wp-content/uploads/2014/10/6795detail.jpg) | How the gilded ground is articulated rather than left flat: "light ring-punching on the ogee moulding… deeper point-punching on the corners… and more regimented in the cross-hatched panels. With the sand in the frieze, these ways of making the gold not-flat are very effective." Also that "flat areas of gilding are generally avoided… so the flat area is covered in sand before being gilded", which is why the frieze here is sanded and not burnished. The rosette boss at the mitre comes straight from this photograph. |
| English mid-18C swept and pierced frame (whole frame and rail detail); English 18C swept and pierced Rococo frame, 34 × 24¼ in., "asymmetric carving on the centres, more in the French Louis XV style" | Rollo Whately Ltd. | <https://rollowhately.com/frames/about/> · [rail detail](https://i0.wp.com/rollowhately.com/wp-content/uploads/2014/03/detail-swept.jpg) · [swept frame](https://i0.wp.com/rollowhately.com/wp-content/uploads/2014/03/english-swept-34-x-25-1_4a.jpg) | Lightness and economy — "carving that is light, playful but confident", "essentially a flat piece of wood with the sight and back carvings on it, with the rocaille and pierced centres and corners applied onto it". It set the ratio of ornament to empty ground on the rails, and confirmed that a Rococo centre is never a mirrored pair. |

## What the Champagne Rococo pass changed

Before this pass the corner was a thin outlined ribbon and a scallop shell laid
flat on the moulding, and the rails were a smooth gradient with nothing on them.
Measured on the top-left corner of a 530px frame at 2×, sampling the mitre
square (the frame's own width in each direction, which is where the cartouche
sits) against a run of plain rail of the same depth:

| | p2 | median | p98 | value range |
| --- | --- | --- | --- | --- |
| Corner ornament, before | 110 | 182 | 230 | 121 |
| Plain rail beside it, before | 68 | 179 | 226 | 159 |
| Corner cartouche, after | 62 | 150 | 218 | 156 |
| Rail band run, after | 70 | 162 | 230 | 160 |

The old ornament was *lighter* than the rail (median 182 against 179) and had a
quarter *less* range than it — a flat decal, which is exactly what it looked
like. The cartouche is now 12 levels darker than the band beside it with the
same range, the relationship measured on the Met Louis XV frame above, where the
corner runs 18 darker at a comparable range.

The corner is rebuilt with the technique the Baroque corner uses — three offset
dark copies for the cast shadow, one offset pale copy for the lit rim, a gilt
ramp per closed mass, turned folds, undercut sockets and crest lines — but with
Rococo geometry: one asymmetric sweep wraps the mitre instead of a mirrored pair
of volutes, a cabochon patera is seated on it, raffle leaves spray outward over
the back edge, and two deliberately unequal tendrils run out along the rails and
die into the running band. The rim colour is the one difference from Baroque
that is not geometry: champagne gilding is laid over white gesso, so the bole
that shows on worn crests is chalky, not red.

The rails carry the Gainsborough section's three orders, drawn in `rail.svg` at
one drawing unit to one percent of the moulding: a leaf-tip moulding on the
upper ogee, a ring-punched ground with one flowered sprig and one leaf pair per
2.08-width repeat, a sanded frieze, and a raking gadroon on the sight roll —
plus a lopsided rocaille cartouche at the centre of each rail. Against Baroque
Gold rendered beside it at the same size, mean saturation is 0.27 against 0.49
and mean colour `#b5a589` against `#9a7f52`: the two frames read as different
materials, and the Rococo rail is mostly articulated ground where the Baroque
one is continuous foliage.

## Timber: oak, walnut and blackened frames

| Reference | Source | URL | What it informed |
| --- | --- | --- | --- |
| American 19th-century moulding walnut frame, stock no. L10989 | Lowy | <https://lowy1907.com/product/american-19th-century-molding-walnut-frame-2/> · [image](https://lowyfs.com/frameapp/images/frames/web/L10989.webp) | The primary Dark Walnut reference. Measured across the top rail, the section reads as six members, not twenty: a pale honey outer roll (p90 ≈ 135), one deep scotia that falls to 23, a bolection roll catching 113–115, then dark steps to the sight. Median 47 with a p2–p98 range of 138 — a walnut frame is mostly dark, and what light it has is concentrated on two crests. |
| Dutch 17th-century ripple black frame, stock no. L6053 | Lowy | <https://lowy1907.com/product/dutch-17th-century-ripple-black-frame-7/> · [image](https://lowyfs.com/frameapp/images/frames/web/L6053.webp) | The primary Ebonised Black reference. Cross-section median 32, p98 126, and the cove bottoms at 1–7: the black is genuinely black in the hollows and never rises past a soft grey on the crests. The ripple is very fine relative to the rail — an even flicker of light, not a row of carved lobes — and it sits on the outer fascia, mitred round the corner. |
| Frame, museum no. O369441, wood veneered with turtleshell and ebony, 1640–1700 | Victoria and Albert Museum | <https://collections.vam.ac.uk/item/O369441> · [IIIF image](https://framemark.vam.ac.uk/collections/2014GY9866/full/!900,900/0/default.jpg) | Ripple pitch and amplitude on an Antwerp frame where the ripple runs on two separate members. Confirms the wave is cut across the rail so the modulation runs *along* it, and that at viewing distance it reads as texture rather than as individual waves. |
| Frame, museum no. O130678, joined and carved walnut, France 1700–1740 | Victoria and Albert Museum | <https://collections.vam.ac.uk/item/O130678> · [IIIF image](https://framemark.vam.ac.uk/collections/2006AE3542/full/!900,900/0/default.jpg) | Walnut carved in the solid: the ornament and the plain moulding are the same timber and the same value family, lit only by the direction of the cut. Warm amber catches sit on the raised edges, near-black in the ground between. |
| Tabernacle frame, 1975.1.1638, "Walnut. Carved, luminolegno." | The Metropolitan Museum of Art, Robert Lehman Collection | <https://www.metmuseum.org/art/collection/search/459204> | Corroboration that walnut frames of this class carry their figure straight through carved members; used as a cross-check on hue rather than on section. |
| Seventeenth-century frame in carved oak with mouldings | Antikeo | <https://www.antikeo.com/en/catalog/decorative-objects/old-frames/seventeenth-century-frame-in-carved-oak-with-mouldings-118157> | Already cited above for the rope. Re-viewed at the raking-light corner detail for this pass: oak fibre runs unbroken through the carving, and the wax sits darkest in the gouges, which is why the recesses here are painted by the section's own shading rather than by a darker colour. |
| *Quercus alba* (white oak), quartersawn and flatsawn board photographs | The Wood Database | <https://www.wood-database.com/white-oak/> · [quartersawn](https://www.wood-database.com/wp-content/uploads/quercus-alba-qs.jpg) | The Carved Oak colour anchor. Quartersawn median `#9f7c54`, a red:green:blue of 1 : .78 : .53 — anything more saturated reads as brass, which is exactly what the old profile did. Also the shape of medullary ray fleck: short pale lenses lying *across* the fibre, a few units long, not scratches. |
| *Juglans nigra* (black walnut) board photograph | The Wood Database | <https://www.wood-database.com/black-walnut/> · [image](https://www.wood-database.com/wp-content/uploads/juglans-nigra.jpg) | Walnut figure: long streaky darks that swing across the board, broad chatoyant lengths that change value, median `#70594f`, cross-fibre residual σ ≈ 11.9. |
| *Fraxinus americana* (white ash), sealed | The Wood Database | <https://www.wood-database.com/white-ash/> · [image](https://www.wood-database.com/wp-content/uploads/ash-sealed.jpg) | Ash grain: bold, widely spaced, nearly straight pore streaks — the shape of the shared `straight-grain.svg` both blackened variants paint with. |
| Black Ash solid-wood picture frame, no. 204 (corner and detail photographs) | American Frame | <https://www.americanframe.com/black-ash-hardwood-picture-frame> · [detail](https://www.americanframe.com/media/catalog/product/2/0/204_detail.jpg) | The Modern Black reference. The face is one smooth ramp — 50 down to 32 across its width, monotone, no steps — bounded by crisp arrises, and the open pores read *paler* than the stain that fills the fibre around them. It is why Modern Black keeps one plane and gains only edges and a faint grain. |
| Ebony ripple mouldings, how they were cut and why | Victoria and Albert Museum object note; The Frame Blog, "Frames in paintings, part 2 — the 17th century" | <https://collections.vam.ac.uk/item/O369441> · <https://theframeblog.com/2024/10/21/frames-in-paintings-part-2-the-17th-century/> | That the ripple is milled, not carved: straight strips run over a waved master, so the wave is perfectly periodic across the rail and only wear breaks it. The wear layer runs on a period unrelated to the tile for that reason. |

## What the timber pass changed

The four timber sections used to be hand-written stop lists, and every one of
them had the same fault: twenty-odd stops with abrupt value jumps between them,
which reads as a stack of evenly spaced stripes rather than as a moulding with
a light on it. They are now computed from a described cross-section by
`scripts/generate-profile.mjs`: members (flat, round, cove, chamfer) are walked
into a height field, and one key light arriving from the outer side at 40° off
normal supplies Lambert shading, a ray-marched cast shadow, and ambient
occlusion in the hollows. The result is exposed so a plain flat face lands
mid-ramp and pulled apart by a gamma, then read through a per-timber colour
ramp sampled from the photographs above, so a highlight stays the timber's own
pale honey or grey and a hollow stays its own brown or black. Stops are then
simplified to the fewest that carry the curve within about one percent: smooth
where the surface rolls, abrupt only at a true arris.

Measured on the top rail of each frame at 407px wide, sampling the full section
at 3×. "Members" counts extrema whose swing exceeds eight luminance units.

| | before p2 / median / p98 | after | before → after range |
| --- | --- | --- | --- |
| Carved Oak | 59 / 118 / 175 | 32 / 88 / 179 | 116 → 148 |
| Dark Walnut | 24 / 65 / 119 | 8 / 73 / 160 | 95 → 152 |
| Ebonised Black | 15 / 44 / 127 | 6 / 56 / 148 | 112 → 141 |
| Modern Black | 17 / 38 / 72 | 13 / 36 / 85 | 54 → 71 |

Every section gained range at both ends — hollows that actually go dark and
crests that actually catch — which is the relationship measured on the Lowy
walnut (23/47/161) and Lowy ripple (0/32/126) rails. Dark Walnut and Ebonised
Black also gained a member that carries its own material: a water-gilt slip and
a fine gold lip, cut into the section with a gilt ramp of their own and given a
narrower, brighter catch than the timber ever takes.

Grain was redrawn for the same reason the profiles were: it was invisible at
display size. Fewer and heavier fibres, plus the three figures a photograph
actually shows — quartersawn ray fleck for oak, chatoyant lengths for walnut,
straight open pores for ash. Oak and walnut blend their figure with `overlay`
so it modulates the moulding's own value instead of painting over it; the
blackened variants blend normally, because over a near-black ground only the
pale pores read at all, and they read very faintly: a light fibre at a tenth of
its own alpha already lifts a black face by a third of its value. Along-rail
residual σ, the measure of how much figure survives: Carved Oak 9.5 → 9.7,
Dark Walnut 7.6 → 8.7, Ebonised Black 7.6 → 9.5, Modern Black 5.9 → 6.9,
against 10.5–11.9 measured on the three board photographs.

The straight-grained ash texture lives in `src/components` and is offered to
variants as `--grain-straight`, so the stylesheet inlines it once for the two
blackened frames instead of carrying a near-identical copy in each. Together
with the redrawn oak and walnut textures that removed 24.7 kB from the four
timber variants' share of `dist/style.css`.
