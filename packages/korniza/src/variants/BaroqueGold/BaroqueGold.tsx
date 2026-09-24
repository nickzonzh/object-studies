import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame.js'
import './baroque.css'
import { BaroqueCorner } from './BaroqueCorner.js'
import { BaroqueRails } from './BaroqueRails.js'

export function BaroqueGold(props: Omit<GalleryFrameProps, 'variant' | 'decoration'>) {
  return <GalleryFrame {...props} variant="baroque-gold" decoration={<><BaroqueRails /><BaroqueCorner /></>} />
}
