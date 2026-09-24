import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands } from '../../components/layers.js'
import './baroque.css'
import { BaroqueCorner } from './BaroqueCorner.js'
import { BaroqueRail } from './BaroqueRail.js'

export function BaroqueGold(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="baroque-gold" decoration={<><FrameBands /><BaroqueRail /><BaroqueCorner /></>} />
}
