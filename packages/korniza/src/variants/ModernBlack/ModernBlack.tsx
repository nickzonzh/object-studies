import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { modernBlackDecoration } from './decoration.js'

export function ModernBlack(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="modern-black" decoration={modernBlackDecoration} />
}
