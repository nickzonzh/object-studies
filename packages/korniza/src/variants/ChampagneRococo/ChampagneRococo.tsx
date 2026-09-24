import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame.js'
import './rococo.css'
import { RococoOrnament } from './RococoOrnament.js'

export function ChampagneRococo(props: Omit<GalleryFrameProps, 'variant' | 'decoration'>) {
  return <GalleryFrame {...props} variant="champagne-rococo" decoration={<RococoOrnament />} />
}
