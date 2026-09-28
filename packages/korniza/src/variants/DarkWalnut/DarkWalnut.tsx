import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { darkWalnutDecoration } from './decoration.js'

export function DarkWalnut(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="dark-walnut" decoration={darkWalnutDecoration} />
}
