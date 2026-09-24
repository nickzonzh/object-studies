import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame'
import './rococo.css'
import { RococoOrnament } from './RococoOrnament'

export function ChampagneRococo(props: Omit<GalleryFrameProps, 'variant' | 'decoration'>) {
  return <GalleryFrame {...props} variant="champagne-rococo" decoration={<RococoOrnament />} />
}
