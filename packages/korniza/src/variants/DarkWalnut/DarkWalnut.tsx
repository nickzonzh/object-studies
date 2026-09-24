import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame'
import './walnut.css'


export function DarkWalnut(props: Omit<GalleryFrameProps, 'variant' | 'decoration'>) {
  return <GalleryFrame {...props} variant="dark-walnut" decoration={<div className="walnut-material" aria-hidden="true">{['top', 'right', 'bottom', 'left'].map(side => <span key={side} className={`walnut-board walnut-board--${side}`} />)}</div>} />
}
