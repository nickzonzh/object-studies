import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameOrnament } from '../../components/layers.js'
import './baroque.css'
import { ornament } from './ornament.js'

export function BaroqueGold(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="baroque-gold" decoration={<><FrameBands /><FrameOrnament layout={ornament} /></>} />
}
