import { createRng } from './rng.js'

// Logical table: an A3 cutting mat, 45 x 30 cm, drawn at 1000 x 640 units.
export const TABLE_WIDTH = 1000
export const TABLE_HEIGHT = 640
const CM = TABLE_WIDTH / 45

export function drawMat(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  const ctx = canvas.getContext('2d')!
  const s = (rect.width / TABLE_WIDTH) * dpr
  ctx.setTransform(s, 0, 0, s, 0, 0)
  const ground = ctx.createLinearGradient(0, 0, TABLE_WIDTH * 0.4, TABLE_HEIGHT)
  ground.addColorStop(0, '#317259')
  ground.addColorStop(1, '#2a6450')
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT)

  // Matte vinyl tooth, baked in once rather than blended live over the mat.
  const tooth = createRng(7)
  for (let i = 0; i < 22000; i++) {
    const light = tooth() < 0.5
    ctx.fillStyle = light ? 'rgba(220, 245, 230, 0.05)' : 'rgba(0, 20, 12, 0.08)'
    const size = 0.5 + tooth() * 0.9
    ctx.fillRect(tooth() * TABLE_WIDTH, tooth() * TABLE_HEIGHT, size, size)
  }

  // Knife scores from past projects. A self-healing mat never quite forgets.
  const rng = createRng(45)
  ctx.lineCap = 'round'
  for (let i = 0; i < 26; i++) {
    const x = rng() * TABLE_WIDTH
    const y = rng() * TABLE_HEIGHT
    const a = (rng() < 0.6 ? Math.round(rng() * 4) * (Math.PI / 4) : rng() * Math.PI) + (rng() - 0.5) * 0.03
    const len = 40 + rng() * 220
    ctx.strokeStyle = `rgba(16, 48, 36, ${0.14 + rng() * 0.12})`
    ctx.lineWidth = 0.6
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke()
    ctx.strokeStyle = 'rgba(190, 230, 205, 0.05)'
    ctx.beginPath(); ctx.moveTo(x, y + 0.7); ctx.lineTo(x + Math.cos(a) * len, y + 0.7 + Math.sin(a) * len); ctx.stroke()
  }

  // 1 cm grid, heavier every 5 cm, half-centimetre ticks along the rulers.
  const line = (x0: number, y0: number, x1: number, y1: number) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke() }
  for (let i = 1; i < 45; i++) {
    const major = i % 5 === 0
    ctx.strokeStyle = major ? 'rgba(214, 238, 222, 0.34)' : 'rgba(214, 238, 222, 0.13)'
    ctx.lineWidth = major ? 1 : 0.55
    line(i * CM, 18, i * CM, TABLE_HEIGHT)
  }
  for (let j = 1; j * CM < TABLE_HEIGHT - 18; j++) {
    const major = j % 5 === 0
    ctx.strokeStyle = major ? 'rgba(214, 238, 222, 0.34)' : 'rgba(214, 238, 222, 0.13)'
    ctx.lineWidth = major ? 1 : 0.55
    line(18, TABLE_HEIGHT - j * CM, TABLE_WIDTH, TABLE_HEIGHT - j * CM)
  }
  ctx.strokeStyle = 'rgba(240, 226, 150, 0.55)'
  ctx.lineWidth = 0.6
  for (let i = 1; i < 90; i++) line((i * CM) / 2, 18, (i * CM) / 2, 18 - (i % 2 ? 3 : 5))
  for (let j = 1; (j * CM) / 2 < TABLE_HEIGHT - 18; j++) line(18, TABLE_HEIGHT - (j * CM) / 2, 18 - (j % 2 ? 3 : 5), TABLE_HEIGHT - (j * CM) / 2)
  ctx.strokeStyle = 'rgba(240, 226, 150, 0.45)'
  line(18, 18, TABLE_WIDTH, 18)
  line(18, 18, 18, TABLE_HEIGHT)

  // 30°, 45° and 60° cutting guides from the bottom-left corner.
  ctx.setLineDash([6, 5])
  ctx.strokeStyle = 'rgba(240, 226, 150, 0.26)'
  for (const deg of [30, 45, 60]) {
    const a = (deg * Math.PI) / 180
    line(18, TABLE_HEIGHT, 18 + Math.cos(a) * 1400, TABLE_HEIGHT - Math.sin(a) * 1400)
  }
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(240, 226, 150, 0.78)'
  ctx.font = '650 8px ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  for (let i = 1; i < 45; i++) ctx.fillText(String(i), i * CM, 10)
  ctx.textAlign = 'right'
  for (let j = 1; j * CM < TABLE_HEIGHT - 24; j++) ctx.fillText(String(j), 14, TABLE_HEIGHT - j * CM + 3)
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(240, 226, 150, 0.5)'
  ctx.fillText('30°', 212, TABLE_HEIGHT - 104)
  ctx.fillText('45°', 150, TABLE_HEIGHT - 142)
  ctx.fillText('60°', 96, TABLE_HEIGHT - 184)
  ctx.font = '780 8px ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(214, 238, 222, 0.4)'
  ctx.fillText('K O L L A Z   ·   A 3   S E L F - H E A L I N G   ·   4 5  ×  3 0  C M', TABLE_WIDTH - 12, TABLE_HEIGHT - 10)
}
