export const toolIds = ['white', 'yellow', 'blue', 'pink', 'duster'] as const
export type ToolId = (typeof toolIds)[number]
