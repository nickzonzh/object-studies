import { BaroqueGold } from './variants/BaroqueGold/BaroqueGold'
import { ChampagneRococo } from './variants/ChampagneRococo/ChampagneRococo'
import { CarvedOak } from './variants/CarvedOak/CarvedOak'
import { DarkWalnut } from './variants/DarkWalnut/DarkWalnut'
import { EbonisedBlack } from './variants/EbonisedBlack/EbonisedBlack'
import { ModernBlack } from './variants/ModernBlack/ModernBlack'
import type { GalleryFrameProps } from './components/GalleryFrame'

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
