/* Champagne Rococo corner cartouche, 50 drawing units to one frame width.
 * Asymmetric C- and S-scroll rocaille rather than a pair of heraldic volutes:
 * one sweep wraps the mitre, a cabochon patera is seated on it, raffle leaves
 * spray outward over the back edge and two unequal tendrils run out along the
 * rails and die into the running band. Closed masses are reused for contact
 * relief, body and gilded edge catches, as the Baroque corner does. */
export const masses = [
  // One member wraps the whole mitre: a C-scroll entering the top rail thin,
  // swelling to its full section on the diagonal and leaving down the left rail,
  // with a rolled eye at either end. A Louis XV corner is one sweep, not a pair
  // of mirrored volutes, so the two ends are deliberately unequal in reach.
  'M61.9 13.3L61.5 13.1L61.2 12.6L61.2 12.1L61.5 11.5L62 11.1L62.7 11L63.4 11.2L64.1 11.7L64.4 12.5L64.4 13.4L63.9 14.3L63.1 14.9L62 15.1L60.7 14.7L59.7 13.7L57.7 12.1L55.1 10.3L52.3 8.6L49.4 7L46.5 5.7L43.5 4.5L40.4 3.4L37.2 2.5L34 1.9L30.9 1.8L27.8 1.9L24.7 2.3L21.6 3L18.5 4L15.7 5.6L13.1 7.5L10.6 9.7L8.4 12.1L6.4 14.9L5 18L4.1 21.2L3.6 24.3L3.3 27.3L3.1 30.3L3.4 33.4L3.8 36.5L4.3 39.7L5.1 42.8L6.1 45.9L7.3 49L8.8 52.1L10.4 55L11.8 57.3L12.8 58.5L13 59.9L12.7 61.1L11.9 61.9L10.9 62.3L9.9 62.2L9 61.8L8.6 61L8.4 60.2L8.7 59.5L9.2 59L9.8 58.8L10.4 58.8L10.8 59.1L11 59.6L11.7 59.5L11.7 58.7L11 57.8L9.9 57.2L8.5 57.3L7.1 58.1L6.1 59.6L6 61.6L6.8 63.6L8.6 65.2L11 65.8L13.7 65.2L16 63.4L17.3 60.6L17.2 57.5L16.7 55.2L15.9 52.6L15 49.7L14.3 46.7L13.9 44.1L14 41.7L14.2 39.1L14.6 36.5L15.2 34L15.9 31.7L16.4 29.5L17.1 27.4L17.9 25.6L18.7 24.2L19.6 23.1L20.4 22L21.5 20.8L22.8 19.7L24.1 18.8L25.5 18L26.8 17.2L28.3 16.5L30 15.9L31.9 15.4L34 15.1L36.2 14.7L38.7 14.5L41.4 14.6L44.1 14.7L46.6 15L49.2 15.6L51.9 16.5L54.7 17.6L57.1 18.5L59.3 19.3L62.3 19.6L65.2 18.5L67.2 16.5L68 13.9L67.6 11.4L66.2 9.6L64.3 8.6L62.4 8.6L60.8 9.4L59.9 10.7L59.7 12.1L60.1 13.2L60.9 13.9L61.7 14Z',
  // Cabochon patera seated on the sweep, the sunflower boss the English frames
  // set at the mitre. Eight unequal petals; the dome is carried in the folds.
  'M23.7 20L24.3 21.6L25.1 24L24.1 25.1L21.7 24.3L20.1 23.6L19.4 25.2L18.3 27.5L16.7 27.5L15.7 25.3L15 23.7L13.4 24.3L11 25.1L9.9 24.1L10.7 21.7L11.4 20.1L9.8 19.4L7.5 18.3L7.5 16.7L9.7 15.7L11.3 15L10.7 13.4L9.9 11L10.9 9.9L13.3 10.7L14.9 11.4L15.6 9.8L16.7 7.5L18.3 7.5L19.3 9.7L20 11.3L21.6 10.7L24 9.9L25.1 10.9L24.3 13.3L23.6 14.9L25.2 15.6L27.5 16.7L27.5 18.3L25.3 19.3Z',
  // Tendrils running out along each rail, thinning to a hair so the corner hands
  // off to the running band rather than stopping at a cut end. The vertical one
  // runs a third further than the horizontal, as a hand-carved pair does.
  'M56.8 16.2L59 17L62.3 18.1L66.2 19L70.1 19.6L73.7 19.1L77.1 18.1L80.4 17.1L83.6 16.1L86.8 15.1L90 14.1L93.1 13.2L96.1 12.6L99.3 12.3L102.5 12.3L105.7 12.5L108.8 12.9L112.1 13.6L115.6 14.6L118.7 15.6L120.9 16.2L121.1 15.8L119 14.8L116 13.5L112.6 12.2L109.2 11.1L106 10.4L102.7 9.8L99.3 9.5L95.9 9.4L92.4 9.8L89 10.4L85.7 11.2L82.4 11.9L79.1 12.7L75.9 13.5L72.8 14.1L69.9 14.4L66.7 14.6L63 14.3L59.7 14L57.2 13.8Z',
  'M13.8 57.2L14 59.8L14.4 63.4L14.6 67.4L14.5 70.9L14.2 74.1L13.6 77.4L12.7 80.9L12 84.5L11.3 88L10.5 91.6L9.8 95.2L9.5 98.9L9.5 102.5L9.9 106.1L10.4 109.6L11.1 113.2L12 116.8L13.2 120.3L14.4 123.8L15.5 127.1L16.5 130.5L17.4 134L18.2 137L18.8 139L19.2 139L18.8 136.8L18.1 133.8L17.3 130.3L16.5 126.9L15.6 123.5L14.5 119.9L13.6 116.3L12.9 112.8L12.5 109.4L12.3 105.9L12.2 102.5L12.5 99.1L13.1 95.8L14 92.4L15 89L16 85.5L17 82.1L18 78.6L19 74.9L19.5 71.1L19 66.9L18 62.8L17 59.2L16.2 56.8Z',
  // A small bracket lobe tucked under the sweep on the diagonal, over the frieze.
  'M25 25L26.1 24.7L27.8 24.8L29.7 25.2L31.5 25.8L33 26.5L34.1 27.4L35.1 28.5L35.9 29.7L36.4 30.9L36.5 32L36.1 33.1L35.1 34.3L33.9 35.4L32.7 36.2L31.5 36.5L30.4 36.3L29.1 35.7L27.9 34.8L26.8 33.7L26 32.5L25.4 31.1L24.8 29.3L24.5 27.5L24.6 26Z',
  // Raffle leaves: three unequal sprays to a rail, laid outward over the back
  // edge. They are what keeps the Rococo corner airy — mass at the mitre, then
  // leaf tips and ground, instead of Baroque's continuous foliate wall.
  'M30 8L34.7 8.6L35.7 6.8L36.2 5.1L36.3 3.9L37.9 2.7L40.8 1.8L43.9 1.1L46 .5L46 .5L43.9-.2L40.8-1.1L37.3-1.9L33.7-1.9L30.3-.2L27.9 2.2L26.8 4.5L30 8Z',
  'M42 10L45.6 11.1L47.5 9.4L49.2 7.6L50.5 6.3L52.4 5.7L55.2 5.7L58 5.9L60 6L60 6L58.3 5L55.8 3.6L52.8 2.3L49.5 1.7L46.1 2.6L43.2 4.3L41.2 6.3L42 10Z',
  'M20 10L23.3 8.6L23.3 6.7L23.1 5L22.9 3.9L23.6 2.5L25.5 .7L27.6-.8L29-2L29-2L27.2-1.7L24.6-1.2L21.7-.4L19.1 1.1L17.4 3.6L16.7 6.4L16.7 8.6L20 10Z',
  'M8 30L4.6 26.9L2.3 28L-.1 30.3L-1.8 33.7L-1.8 37.3L-1.1 40.8L-.2 43.9L.5 46L.5 46L1.1 43.9L1.7 40.8L2.6 37.9L3.8 36.3L5.1 36.1L6.8 35.6L8.6 34.6L8 30Z',
  'M10 42L6.4 41.2L4.4 43.3L2.7 46.2L1.8 49.5L2.3 52.8L3.6 55.8L5 58.3L6 60L6 60L5.9 58L5.6 55.2L5.6 52.4L6.2 50.5L7.5 49.2L9.3 47.5L11.1 45.6L10 42Z',
  'M10 20L8.6 16.8L6.4 16.8L3.7 17.5L1.1 19.2L-.3 21.8L-1.2 24.6L-1.7 27.2L-2 29L-2 29L-.8 27.6L.7 25.5L2.4 23.6L3.9 22.8L5 23L6.7 23.2L8.6 23.2L10 20Z',
  'M78 13L80.9 13.3L82.5 11.6L84.1 9.8L85.4 8.6L87.4 8.1L90.3 8.1L93.1 8.4L95 8.5L95 8.5L93.2 7.7L90.6 6.6L87.6 5.7L84.6 5.4L81.7 6.4L79.2 8.2L77.5 10.2L78 13Z',
  'M13 78L10.2 77.6L8.3 79.3L6.5 81.7L5.5 84.6L5.7 87.6L6.7 90.6L7.7 93.2L8.5 95L8.5 95L8.4 93.1L8.1 90.3L8 87.4L8.5 85.4L9.7 84L11.5 82.5L13.3 80.8L13 78Z',
  // Small flowered sprigs trailing down the ogee past the cartouche, the motif
  // the Gainsborough frame carries between its corners.
  'M106.9 11.2L105.8 11.4L106.2 12.8L106.1 14.8L104.8 14.9L103.7 13.2L103.2 12.2L102 12.9L100.1 13.5L99.6 12.3L100.9 10.7L101.7 9.9L100.6 9L99.5 7.4L100.4 6.5L102.4 7.3L103.3 7.8L103.9 6.5L105.1 4.9L106.2 5.5L106.1 7.6L105.9 8.7L107.3 8.8L109.2 9.5L108.9 10.7Z',
  'M12.1 103.8L14 104L15.1 105L13.9 106L12.1 106.2L11.8 106.7L12.2 108.5L11.6 109.9L10.2 109.1L9.5 107.4L9 107.2L7.4 108.1L5.9 108L6.2 106.5L7.6 105.3L7.6 104.7L6.2 103.5L5.9 102L7.4 101.9L9 102.8L9.5 102.6L10.3 100.9L11.6 100.2L12.2 101.6L11.8 103.4Z',
] as const

/* Secondary turned surfaces inside the masses: they take a second ramp so a
 * member reads as several facets rather than one silhouette. */
export const folds = [
  // The cabochon dome inside the patera: one turned surface, so it takes its own
  // run of the fold ramp and reads rounder than the petals around it.
  'M23 17.5L19.2 22.7L13.1 20.7L13.1 14.3L19.2 12.3Z',
  // The rolled crest of the sweep, offset to the lit side of its centreline.
  'M61.2 15.6L60.1 15.1L58.9 13.8L58.6 12.1L59 10.2L60.4 8.8L62.3 8.1L64.4 8.3L66.3 9.5L67.5 11.5L67.7 13.9L66.7 16.2L64.8 17.9L62.2 18.7L59.6 18.2L57.8 17.1L55.7 15.8L53.1 14.2L50.4 12.7L47.8 11.6L45.2 10.6L42.4 9.7L39.5 9L36.7 8.5L34 8.2L31.4 8.2L28.8 8.4L26.3 8.8L23.9 9.4L21.7 10.3L19.5 11.5L17.4 13L15.5 14.7L13.8 16.6L12.4 18.6L11.3 20.8L10.5 23.2L9.9 25.8L9.5 28.4L9.3 31L9.2 33.7L9.3 36.5L9.6 39.4L10 42.2L10.7 44.9L11.6 47.6L12.8 50.5L14.1 53.4L15.3 55.8L16.3 57.7L16.5 60.5L15.5 63.1L13.5 64.9L11 65.6L8.6 65.2L6.6 63.7L5.6 61.7L5.6 59.5L6.5 57.6L8.1 56.4L10 56.1L11.8 56.7L13 58L13.4 59.1L13.6 59.1L13.3 57.8L12 56.3L10.1 55.5L7.9 55.8L5.9 57.1L4.7 59.3L4.6 61.9L5.8 64.4L8.1 66.3L11.1 66.9L14.2 66.1L16.7 64L18.1 60.8L18 57.3L17.2 55L16.2 52.5L15.1 49.6L14.2 46.8L13.6 44.2L13.4 41.7L13.4 39.1L13.5 36.5L13.7 33.9L14.1 31.5L14.5 29.2L15.1 27L15.7 24.9L16.5 23.2L17.4 21.7L18.4 20.3L19.7 18.9L21.1 17.7L22.7 16.5L24.3 15.6L25.9 14.8L27.7 14.2L29.7 13.7L31.8 13.4L34 13.2L36.3 13.1L38.9 13.3L41.6 13.6L44.3 14L46.8 14.6L49.2 15.4L51.9 16.6L54.5 17.8L56.8 19L59 20L62.4 20.4L65.6 19.3L68 17L69 14.1L68.7 11.1L67.1 8.7L64.7 7.3L62.1 7.1L59.9 8.1L58.4 9.9L58 12.1L58.5 14.1L59.9 15.5L61.1 15.9Z',
] as const

/* Sockets that stay dark under every light direction. */
export const undercuts = [
  // The two scroll eyes are undercut, not drawn: a carver's gouge leaves a socket
  // that stays dark whatever the light does.
  'M64 13.7L61.1 15.8L60 12.4L63.6 12.4Z',
  'M13.7 59.6L10.7 61.7L9.5 58.2L13.2 58.2Z',
] as const

/* Crest lines, drawn pale on the lit side and shadowed by an offset copy. */
export const edges = [
  // Crest lines: the arris along the top of each member, caught by the key light
  // and shadowed by an offset copy below it.
  'M61.8 13.7L60.7 12.9L60.7 11.1L62.5 9.8L65.1 10.6L66.2 13.7L64.1 16.7L60 17L56.2 14.9L50.7 12.1L45.3 10.2L39.6 9L34 8.5L28.9 8.9L24.2 10.1L19.9 12.2L16.1 15.2L13 19L11 23.4L9.9 28.4L9.3 33.7L9.3 39.4L10 45L11.9 50.9L14.2 56.2L15.1 60.3L12.8 63.6L9.2 63.7L7.3 61.3L7.9 58.8L9.8 58L11.2 58.9',
  'M57 15L62.7 16.2L70 17L76.5 15.8L83 14L89.5 12.2L96 11L102.6 11.1L109 12L115.8 14.1L121 16',
  'M15 57L16.2 63.1L17 71L15.8 78L14 85L12.2 92L11 99L11.1 106L12 113L13.9 120.1L16 127L17.8 133.9L19 139',
  'M30 8L31.8 4.5L35 1L40.8 .3L46 .5',
  'M42 10L45.4 6.9L50 4L55.5 4.6L60 6',
  'M8 30L4.5 31.8L1 35L.3 40.8L.5 46',
  'M10 42L6.9 45.4L4 50L4.6 55.5L6 60',
] as const

/* Gouged veins: shallow shadowed grooves in the gilt. */
export const cuts = [
  // Shallow gouged veins in the smaller leaves; grooves in the gilding, not contours.
  'M20 10L20 6.5L21 2.5L25.1-.2L29-2',
  'M10 20L6.5 20L2.5 21L-.2 25.1L-2 29',
  'M78 13L80.9 9.9L85 7L90.4 7.4L95 8.5',
  'M13 78L9.9 80.9L7 85L7.4 90.4L8.5 95',
] as const
