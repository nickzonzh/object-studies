import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame'
import './oak.css'


export function CarvedOak(props: Omit<GalleryFrameProps, 'variant' | 'decoration'>) {
  return <GalleryFrame {...props} variant="carved-oak" decoration={<div className="oak-material" aria-hidden="true">{['top', 'right', 'bottom', 'left'].map(side => <span key={side} className={`oak-board oak-board--${side}`} />)}</div>} />
}
