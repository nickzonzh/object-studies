import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameBoards } from '../../components/layers.js'
import './oak.css'
import { OakCarving } from './OakCarving.js'

export function CarvedOak(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="carved-oak"
    decoration={<><FrameBoards /><FrameBands /><FrameBands member="sight" /><OakCarving /></>} />
}
