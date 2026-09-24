import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import './rococo.css'
import { RococoOrnament } from './RococoOrnament.js'

export function ChampagneRococo(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="champagne-rococo" decoration={<RococoOrnament />} />
}
