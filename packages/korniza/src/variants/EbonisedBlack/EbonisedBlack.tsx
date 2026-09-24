import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameBoards } from '../../components/layers.js'
import './ebonised.css'

export function EbonisedBlack(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="ebonised-black" decoration={<><FrameBoards /><FrameBands /></>} />
}
