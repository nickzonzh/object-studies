# Frame references

Photographic sources consulted while tuning the carved bands on Baroque Gold and
Carved Oak. Every image listed was viewed, not just its caption; the measurements
quoted in the notes are luminance percentiles sampled from the linked photographs.

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
