// Raster copies of the CSS textures: filtered SVG images taint the export
// canvas in WebKit, even when served from the same origin.
import mineralUrl from '../assets/mineral.png'
import noiseUrl from '../assets/noise.png'

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Slate texture could not be loaded'))
    image.src = url
  })

// The export composes the slate material and the current chalk pixels only.
// Textures are the same local, seeded assets used by the physical object's CSS.
export async function createBoardPng(marks: HTMLCanvasElement): Promise<Blob> {
  const snapshot = document.createElement('canvas')
  snapshot.width = marks.width
  snapshot.height = marks.height
  snapshot.getContext('2d')!.drawImage(marks, 0, 0)
  const { width, height } = marks.getBoundingClientRect()
  const [mineral, noise] = await Promise.all([
    loadImage(mineralUrl),
    loadImage(noiseUrl),
  ])
  const output = document.createElement('canvas')
  output.width = snapshot.width
  output.height = snapshot.height
  const ctx = output.getContext('2d')!
  ctx.scale(output.width / width, output.height / height)

  const angle = (118 * Math.PI) / 180
  const length =
    Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle))
  const dx = (Math.sin(angle) * length) / 2
  const dy = (-Math.cos(angle) * length) / 2
  const tone = ctx.createLinearGradient(
    width / 2 - dx,
    height / 2 - dy,
    width / 2 + dx,
    height / 2 + dy,
  )
  tone.addColorStop(0, '#28312d')
  tone.addColorStop(0.47, '#26302b')
  tone.addColorStop(1, '#222b27')
  ctx.fillStyle = tone
  ctx.fillRect(0, 0, width, height)

  const haze = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    colour: string,
  ) => {
    ctx.save()
    ctx.translate(x * width, y * height)
    ctx.scale(rx * width, ry * height)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    gradient.addColorStop(0, colour)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }
  haze(0.24, 0, 0.75, 0.75, '#3d494005')
  haze(0.72, 0.73, 0.45, 0.45, '#aab4a105')
  haze(0.43, 0.42, 0.65, 0.65, '#8b93880a')
  ctx.globalCompositeOperation = 'soft-light'
  ctx.globalAlpha = 0.075
  ctx.drawImage(mineral, 0, 0, width, height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 0.3
  haze(0.46, 0.54, 0.4, 0.009, '#bdc1ad07')
  haze(0.58, 0.775, 0.43, 0.011, '#bdc1ad08')
  haze(0.26, 0.43, 0.3, 0.015, '#bdc1ad08')
  haze(0.48, 1, 0.38, 0.015, '#d8d5b522')
  ctx.globalAlpha = 1
  ctx.drawImage(snapshot, 0, 0, width, height)
  ctx.globalAlpha = 0.035
  ctx.fillStyle = ctx.createPattern(noise, 'repeat')!
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1
  return new Promise((resolve, reject) => {
    output.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('PNG could not be created')),
      'image/png',
    )
  })
}

export function downloadBoardPng(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'kimolia-board.png'
  document.body.append(link)
  link.click()
  link.remove()
  // Keep the URL alive long enough for mobile browsers to consume the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
