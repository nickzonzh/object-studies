import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameOrnament } from '../../components/layers.js'
import './baroque.css'
import { ornament } from './ornament.js'

/** Shared with the root Frame, so switching variants keeps the same component and its children. */
export const baroqueGoldDecoration = <><FrameBands /><FrameOrnament layout={ornament} /></>

export function BaroqueGold(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="baroque-gold" decoration={baroqueGoldDecoration} />
}
