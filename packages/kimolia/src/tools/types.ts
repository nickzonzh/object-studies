export const toolIds = ['white', 'yellow', 'blue', 'pink', 'duster'] as const
export type ToolId = (typeof toolIds)[number]
export type Activation = 'pointer' | 'touch' | 'keyboard'
export const toolLabels: Record<ToolId, string> = {
  white: 'White chalk',
  yellow: 'Pale yellow chalk',
  blue: 'Dusty blue chalk',
  pink: 'Faded pink chalk',
  duster: 'Chalkboard duster',
}
export type Point = { x: number; y: number }
export type Pose = Point & { angle: number }
