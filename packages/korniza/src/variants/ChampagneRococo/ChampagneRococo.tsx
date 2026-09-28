import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { champagneRococoDecoration } from './decoration.js'

export function ChampagneRococo(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="champagne-rococo" decoration={champagneRococoDecoration} />
}
