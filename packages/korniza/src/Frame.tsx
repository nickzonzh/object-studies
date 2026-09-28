import type { ReactNode } from 'react'
import { baroqueGoldDecoration } from './variants/BaroqueGold/decoration.js'
import { champagneRococoDecoration } from './variants/ChampagneRococo/decoration.js'
import { carvedOakDecoration } from './variants/CarvedOak/decoration.js'
import { darkWalnutDecoration } from './variants/DarkWalnut/decoration.js'
import { ebonisedBlackDecoration } from './variants/EbonisedBlack/decoration.js'
import { modernBlackDecoration } from './variants/ModernBlack/decoration.js'
import { GalleryFrame, type GalleryFrameProps } from './components/GalleryFrame.js'
import { type FrameVariant, frameVariants } from './variants.js'

export type FrameProps = Omit<GalleryFrameProps, 'decoration'>
const decorations: Record<FrameVariant, ReactNode> = {
  'baroque-gold': baroqueGoldDecoration,
  'champagne-rococo': champagneRococoDecoration,
  'carved-oak': carvedOakDecoration,
  'dark-walnut': darkWalnutDecoration,
  'ebonised-black': ebonisedBlackDecoration,
  'modern-black': modernBlackDecoration,
}

/**
 * Width belongs to the wrapper; aspectRatio belongs to the recessed opening.
 * Every variant renders the same GalleryFrame, so switching variants restyles
 * the frame without remounting its children.
 */
export function Frame({ variant, ...props }: FrameProps) {
  /* The variant often arrives from untyped data, so name the bad value rather
     than rendering a frame with no material. */
  if (!Object.hasOwn(decorations, variant)) throw new Error(`korniza: unknown Frame variant ${JSON.stringify(variant)}. Expected one of ${frameVariants.map(item => item.variant).join(', ')}.`)
  return <GalleryFrame {...props} variant={variant} decoration={decorations[variant]} />
}
