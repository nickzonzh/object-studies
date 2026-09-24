import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameOrnament } from '../../components/layers.js'
import './rococo.css'
import { ornament } from './ornament.js'

export function ChampagneRococo(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="champagne-rococo" decoration={<><FrameBands /><FrameOrnament layout={ornament} /></>} />
}
