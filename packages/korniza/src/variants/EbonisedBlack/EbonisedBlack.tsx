import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameBoards, FrameGlint } from '../../components/layers.js'
import '../../components/straight-grain.css'
import './ebonised.css'

export function EbonisedBlack(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="ebonised-black" decoration={<><FrameBoards /><FrameBands /><FrameGlint /></>} />
}
