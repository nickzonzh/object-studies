import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands, FrameOrnament } from '../../components/layers.js'
import './rococo.css'
import { ornament } from './ornament.js'

/** Shared with the root Frame, so switching variants keeps the same component and its children. */
export const champagneRococoDecoration = <><FrameBands /><FrameOrnament layout={ornament} /></>

export function ChampagneRococo(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="champagne-rococo" decoration={champagneRococoDecoration} />
}
