import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameBoards, FrameGlint } from '../../components/layers.js'
import '../../components/straight-grain.css'
import './ebonised.css'

/** Shared with the root Frame, so switching variants keeps the same component and its children. */
export const ebonisedBlackDecoration = <><FrameBoards /><FrameBands /><FrameGlint /></>

export function EbonisedBlack(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="ebonised-black" decoration={ebonisedBlackDecoration} />
}
