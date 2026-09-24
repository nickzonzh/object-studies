import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameBoards, FrameOrnament } from '../../components/layers.js'
import './oak.css'
import { ornament } from './ornament.js'

export function CarvedOak(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="carved-oak"
    decoration={<><FrameBoards /><FrameBands /><FrameBands member="sight" /><FrameOrnament layout={ornament} /></>} />
}
