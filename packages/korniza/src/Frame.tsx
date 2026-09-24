import { BaroqueGold } from './variants/BaroqueGold/BaroqueGold.js'
import { ChampagneRococo } from './variants/ChampagneRococo/ChampagneRococo.js'
import { CarvedOak } from './variants/CarvedOak/CarvedOak.js'
import { DarkWalnut } from './variants/DarkWalnut/DarkWalnut.js'
import { EbonisedBlack } from './variants/EbonisedBlack/EbonisedBlack.js'
import { ModernBlack } from './variants/ModernBlack/ModernBlack.js'
import type { GalleryFrameProps } from './components/GalleryFrame.js'

export type FrameProps = Omit<GalleryFrameProps, 'decoration'>
const components = {
  'baroque-gold': BaroqueGold,
  'champagne-rococo': ChampagneRococo,
  'carved-oak': CarvedOak,
  'dark-walnut': DarkWalnut,
  'ebonised-black': EbonisedBlack,
  'modern-black': ModernBlack,
}

/** Width belongs to the wrapper; aspectRatio belongs to the recessed opening. */
export function Frame({ variant, ...props }: FrameProps) {
  const Component = components[variant]
  return <Component {...props} />
}
