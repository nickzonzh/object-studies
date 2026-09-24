import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame'
import './modern-black.css'


export function ModernBlack(props: Omit<GalleryFrameProps, 'variant' | 'decoration'>) {
  return <GalleryFrame {...props} variant="modern-black" decoration={<div className="modern-material" aria-hidden="true">{['top', 'right', 'bottom', 'left'].map(side => <span key={side} className={`modern-board modern-board--${side}`} />)}</div>} />
}
