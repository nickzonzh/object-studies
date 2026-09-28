import { FrameBands, FrameBoards, FrameOrnament } from '../../components/layers.js'
import './oak.css'
import { ornament } from './ornament.js'

/** The material: its layers and stylesheet, shared by the variant entry and the root Frame. */
export const carvedOakDecoration = <><FrameBoards /><FrameBands /><FrameBands member="sight" /><FrameOrnament layout={ornament} /></>
