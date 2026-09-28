import { FrameBands, FrameOrnament } from '../../components/layers.js'
import './baroque.css'
import { ornament } from './ornament.js'

/** The material: its layers and stylesheet, shared by the variant entry and the root Frame. */
export const baroqueGoldDecoration = <><FrameBands /><FrameOrnament layout={ornament} /></>
