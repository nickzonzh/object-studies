import { getMaterials } from '../materials.js'

export type BoardTone = {
  slate: string
  slateLight: string
  slateDark: string
  /** 0–1 strength of the permanent residual chalk haze. */
  wear: number
}

export const defaultTone: BoardTone = {
  slate: '#26302b',
  slateLight: '#28312d',
  slateDark: '#222b27',
  wear: 0.35,
}

/**
 * Composes the slate material and the current chalk pixels — the board without
 * its frame. Every texture is drawn from a canvas this package generated, so
 * nothing taints the export (Mobile WebKit raises a SecurityError when a canvas
 * holding a filtered SVG is serialised; see src/assets/README.md).
 */
export function createBoardPng(
  marks: HTMLCanvasElement,
  tone: BoardTone = defaultTone,
  type = 'image/png',
): Promise<Blob> {
  const { width, height } = marks.getBoundingClientRect()
  const materials = getMaterials()
  const output = document.createElement('canvas')
  output.width = marks.width
  output.height = marks.height
  const ctx = output.getContext('2d')!
  ctx.scale(output.width / width, output.height / height)

  const angle = (118 * Math.PI) / 180
  const length =
    Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle))
  const dx = (Math.sin(angle) * length) / 2
  const dy = (-Math.cos(angle) * length) / 2
  const slate = ctx.createLinearGradient(
    width / 2 - dx,
    height / 2 - dy,
    width / 2 + dx,
    height / 2 + dy,
  )
  slate.addColorStop(0, tone.slateLight)
  slate.addColorStop(0.47, tone.slate)
  slate.addColorStop(1, tone.slateDark)
  ctx.fillStyle = slate
  ctx.fillRect(0, 0, width, height)

  ctx.globalCompositeOperation = 'soft-light'
  ctx.globalAlpha = 0.075
  ctx.drawImage(materials.clouds, 0, 0, width, height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = Math.max(0, Math.min(1, tone.wear))
  ctx.drawImage(materials.residue, 0, 0, width, height)
  ctx.globalAlpha = 1
  ctx.drawImage(marks, 0, 0, width, height)
  ctx.globalAlpha = 0.035
  ctx.fillStyle = ctx.createPattern(materials.grain, 'repeat')!
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1
  // Executor form on purpose: a published component should not require a
  // runtime new enough for Promise.withResolvers.
  return new Promise((resolve, reject) => {
    output.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('PNG could not be created')),
      type,
    )
  })
}

export function downloadBoard(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Keep the URL alive long enough for mobile browsers to consume the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
