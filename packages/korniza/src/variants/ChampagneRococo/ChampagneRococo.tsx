import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBands } from '../../components/layers.js'
import './rococo.css'
import { RococoOrnament } from './RococoOrnament.js'
import { RococoRail } from './RococoRail.js'

export function ChampagneRococo(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="champagne-rococo" decoration={<><FrameBands /><RococoRail /><RococoOrnament /></>} />
}
