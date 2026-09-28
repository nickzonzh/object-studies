import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBoards, FrameGlint } from '../../components/layers.js'
import './walnut.css'

/** Shared with the root Frame, so switching variants keeps the same component and its children. */
export const darkWalnutDecoration = <><FrameBoards /><FrameGlint /></>

export function DarkWalnut(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="dark-walnut" decoration={darkWalnutDecoration} />
}
