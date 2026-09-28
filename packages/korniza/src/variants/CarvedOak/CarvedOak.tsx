import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { carvedOakDecoration } from './decoration.js'

export function CarvedOak(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="carved-oak" decoration={carvedOakDecoration} />
}
