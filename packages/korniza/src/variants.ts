/** Canonical order, identifiers and display names of the locked v1 collection. */
export const frameVariants = [
  { variant: 'baroque-gold', name: 'Baroque Gold', description: 'Carved gilt · generous relief' },
  { variant: 'champagne-rococo', name: 'Champagne Rococo', description: 'Pale champagne · lighter carving' },
  { variant: 'carved-oak', name: 'Carved Oak', description: 'Oiled timber · quiet warmth' },
  { variant: 'dark-walnut', name: 'Dark Walnut', description: 'Deep walnut · antique-gold slip' },
  { variant: 'ebonised-black', name: 'Ebonised Black', description: 'Blackened timber · fine gold lip' },
  { variant: 'modern-black', name: 'Modern Black', description: 'Blackened ash · broad, cut planes' },
] as const
export type FrameVariant = typeof frameVariants[number]['variant']
