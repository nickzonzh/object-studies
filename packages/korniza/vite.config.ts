import { packageConfig } from '../../vite.shared.ts'

/** One entry per material, so a single-variant consumer bundles only that one. */
export default packageConfig({
  entry: {
    index: 'src/index.ts',
    'baroque-gold': 'src/baroque-gold.ts',
    'champagne-rococo': 'src/champagne-rococo.ts',
    'carved-oak': 'src/carved-oak.ts',
    'dark-walnut': 'src/dark-walnut.ts',
    'ebonised-black': 'src/ebonised-black.ts',
    'modern-black': 'src/modern-black.ts',
  },
})
