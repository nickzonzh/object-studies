import { GalleryFrame, type VariantFrameProps } from '../../components/GalleryFrame.js'
import { FrameBoards, FrameGlint } from '../../components/layers.js'
import './walnut.css'

export function DarkWalnut(props: VariantFrameProps) {
  return <GalleryFrame {...props} variant="dark-walnut" decoration={<><FrameBoards /><FrameGlint /></>} />
}
