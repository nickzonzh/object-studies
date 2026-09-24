import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame'
import './baroque.css'
import { BaroqueCorner } from './BaroqueCorner'
import { BaroqueRails } from './BaroqueRails'

export function BaroqueGold(props: Omit<GalleryFrameProps, 'variant' | 'decoration'>) {
  return <GalleryFrame {...props} variant="baroque-gold" decoration={<><BaroqueRails /><BaroqueCorner /></>} />
}
