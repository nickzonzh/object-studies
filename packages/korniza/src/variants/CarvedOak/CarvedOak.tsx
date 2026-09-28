import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameBoards, FrameOrnament } from '../../components/layers.js'
import './oak.css'
import { ornament } from './ornament.js'

/** Shared with the root Frame, so switching variants keeps the same component and its children. */
export const carvedOakDecoration = <><FrameBoards /><FrameBands /><FrameBands member="sight" /><FrameOrnament layout={ornament} /></>

export function CarvedOak(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="carved-oak" decoration={carvedOakDecoration} />
}
