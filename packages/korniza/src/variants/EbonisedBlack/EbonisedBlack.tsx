import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame'
import './ebonised.css'


export function EbonisedBlack(props: Omit<GalleryFrameProps, 'variant' | 'decoration'>) {
  return <GalleryFrame {...props} variant="ebonised-black" decoration={<div className="ebonised-material" aria-hidden="true">{['top', 'right', 'bottom', 'left'].map(side => <span key={side} className={`ebonised-board ebonised-board--${side}`} />)}</div>} />
}
