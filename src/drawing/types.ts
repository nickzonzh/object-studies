export type ChalkColor = 'white' | 'yellow' | 'blue' | 'pink'
export type ChalkPoint = { x: number; y: number; pressure: number }
export type ChalkStroke = {
  id: number
  tool: 'chalk'
  color: ChalkColor
  width: number
  seed: number
  // Points use the slate's CSS pixel space at the time of the stroke.
  space: { width: number; height: number }
  points: ChalkPoint[]
}
export type DusterStroke = {
  id: number
  tool: 'duster'
  width: number
  height: number
  seed: number
  space: { width: number; height: number }
  points: ChalkPoint[]
}
export type DrawingStroke = ChalkStroke | DusterStroke
export type DrawingTool = ChalkColor | 'duster'
export type ChalkStamp = ChalkPoint & {
  size: number
  angle: number
  opacity: number
  dust: { x: number; y: number; radius: number; opacity: number } | null
}
