import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { ebonisedBlackDecoration } from './decoration.js'

export function EbonisedBlack(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="ebonised-black" decoration={ebonisedBlackDecoration} />
}
