/* A centre cartouche breaks the running rinceau at the middle of every rail,
 * the way a Louis XIV rail carries a shell or a cabochon between its corners.
 * Authored across the band: 46 units is the ornamented band plus its margins,
 * 160 units the span of the cartouche, so the whole thing scales with
 * --frame-width. The two wings run out to fine tips that die into the rail
 * tile underneath, so neither end is a cut edge. */
export const masses = [
  // Fan of five flutes. Each flute is its own closed shape, so each takes its
  // own run of the gilt ramp and the shell reads as turned surfaces.
  'M80 38C71 36 60 31 52 24C55 20 58 17 61 16C66 24 73 33 80 38Z',
  'M80 38C74 34 66 26 61 17C66 14 71 13 75 13C77 21 79 31 80 38Z',
  'M80 38C77 31 74 20 73 12C76 11 80 11 83 12C82 21 81 31 80 38Z',
  'M80 38C83 31 86 20 88 12C91 13 95 14 98 16C93 26 86 34 80 38Z',
  'M80 38C87 33 95 24 99 16C103 18 106 21 108 25C100 31 89 36 80 38Z',
  // The hinge the fan is seated on, and the drop below it.
  'M72 37C76 35 84 35 88 37C90 41 87 45 80 45C73 45 70 41 72 37Z',
  // Wings: serrated acanthus in the same language as the rail run, and
  // deliberately unequal, as a hand-carved pair is.
  'M70 40C60 44 44 44 30 38C22 34 16 28 12 20C20 25 28 29 36 32C28 26 22 19 20 11C30 17 38 25 46 31C42 24 40 17 42 10C50 18 54 27 58 34C62 38 67 39 70 40Z',
  'M90 40C99 43 112 43 124 38C132 34 138 27 141 20C134 25 126 29 119 31C126 25 131 18 132 11C123 17 116 24 110 30C113 23 114 17 112 11C105 18 102 26 99 33C96 37 92 39 90 40Z',
  'M140 26C136 18 141 10 149 10C157 10 161 18 158 26C156 32 150 36 146 34C142 33 141 30 140 26Z',
  // Tips: tapering shoots that lie over the rail run and fade into it.
  'M13 21C8 19 3 18-2 19C3 21 8 23 13 24Z',
  'M158 24C163 23 168 24 172 27C167 27 162 27 157 26Z',
]
export const crests = [
  'M61 17C67 25 74 33 80 38M80 12 80 38M99 16C93 25 86 33 80 38',
  'M13 21C28 29 50 36 70 40M141 21C127 29 108 36 90 40',
  'M20 12C28 20 34 27 40 32M132 12C124 20 118 27 112 32',
  'M42 11C48 20 53 28 58 34M112 12C108 20 104 27 100 33M148 12C146 18 146 24 148 30',
]
