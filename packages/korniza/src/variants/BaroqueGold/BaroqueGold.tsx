import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { baroqueGoldDecoration } from './decoration.js'

export function BaroqueGold(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="baroque-gold" decoration={baroqueGoldDecoration} />
}
