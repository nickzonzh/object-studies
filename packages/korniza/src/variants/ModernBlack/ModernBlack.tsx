import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBoards } from '../../components/layers.js'
import './modern-black.css'

export function ModernBlack(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="modern-black" decoration={<FrameBoards />} />
}
