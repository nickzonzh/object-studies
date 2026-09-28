import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBoards } from '../../components/layers.js'
import '../../components/straight-grain.css'
import './modern-black.css'

/** Shared with the root Frame, so switching variants keeps the same component and its children. */
export const modernBlackDecoration = <FrameBoards />

export function ModernBlack(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="modern-black" decoration={modernBlackDecoration} />
}
