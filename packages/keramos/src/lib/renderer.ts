import { FRAG, VERT } from './shader.js'
import { unitTexels } from './painter.js'
import { type Shape, sampleProfile, shapeExtent, shapeTop, PROFILE_SAMPLES } from './shapes.js'

/** A painted map, from the main thread (a canvas) or from the paint worker (a bitmap). */
export type TextureSource = HTMLCanvasElement | OffscreenCanvas | ImageBitmap

export type Finish = {
  interior: [number, number, number]
  interiorGloss: number
  handle: [number, number, number]
  handleGloss: number
  rim: [number, number, number]
  rimGold: number
  glaze: number
  relief: number
  /** Painted strokes down the handle's sides: rgb + strength. */
  handleStripe?: [number, number, number, number]
}

export type View = {
  /** Rotation around the vessel axis, radians. */
  rotation: number
  /** Window light azimuth and elevation, radians. */
  lightAz: number
  lightEl: number
}

const PITCH = 0.12
const MARGIN_X = 0.06
const TOP = 1.05
const BOTTOM = -0.1

export function frameFor(shape: Shape) {
  const extent = shapeExtent(shape)
  if (shape.kind === 'plate') {
    const half = 0.56
    return { extent, aspect: 1, halfW: half, height: half * 2, top: half, bottom: -half }
  }
  const top = Math.max(TOP, shapeTop(shape) + 0.05)
  const halfW = extent + MARGIN_X
  const height = top - BOTTOM
  return { extent, aspect: (halfW * 2) / height, halfW, height, top, bottom: BOTTOM }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return s
}

/** Everything the GPU needs to draw one piece: its profile, painted surface and finish. */
export type Scene = {
  shape: Shape
  profileTex: WebGLTexture
  colorTex: WebGLTexture
  matTex: WebGLTexture
  texSize: [number, number]
  finish: Finish
}

const MIN_DETAIL = 0.3
// Detail 2 already paints 6144-texel maps; much beyond that outgrows what browsers and GPUs will allocate.
const MAX_DETAIL = 2

/**
 * Texture detail for a piece shown `cssHeight` CSS px tall: 1.8 texels per
 * device pixel, for the supersampled render (it reproduces the hand-tuned 1.34
 * for a large bench piece and 0.8 on a shelf), so a small piece or a phone never
 * paints a texture far larger than it can show.
 */
export function detailFor(shape: Shape, cssHeight: number, dpr: number) {
  const unitPx = (cssHeight * Math.min(dpr || 1, 2)) / frameFor(shape).height
  return Math.max(MIN_DETAIL, Math.min(1.5, (1.8 * unitPx) / unitTexels(shape)))
}

/** The `detail` prop made safe to paint at, or undefined (follow the displayed size) for zero, negative or NaN. */
export function clampDetail(detail: number | undefined) {
  if (detail === undefined || !(detail > 0)) return undefined
  return Math.max(MIN_DETAIL, Math.min(MAX_DETAIL, detail))
}

/** Pixel budgets for supersampling: the live piece, a still while it moves, a still at rest. */
export const LIVE_BUDGET = 1.6e6
export const STILL_MOVING_BUDGET = 0.9e6
export const STILL_REST_BUDGET = 2.6e6

/** Supersampling factor (1 to 2) that keeps a render of w x h device pixels inside a budget. */
export function supersample(w: number, h: number, budget: number) {
  return Math.max(1, Math.min(2, Math.sqrt(budget / Math.max(1, w * h))))
}

/** The calm room light every piece sits in when nobody is pointing at it. */
export const DEFAULT_LIGHT = { az: -0.55, el: 0.5 }

/**
 * One WebGL2 context that can draw any number of scenes. A live piece owns a
 * renderer on its own canvas; still pieces share one offscreen renderer and
 * copy each frame into a plain 2D canvas, so a page full of pottery uses two
 * GPU contexts instead of one per piece.
 */
export class VaseRenderer {
  private gl: WebGL2RenderingContext
  private program!: WebGLProgram
  private shaders: WebGLShader[] = []
  /** Set once the program has finished compiling and linked cleanly. */
  private linked = false
  private parallel: KHR_parallel_shader_compile | null = null
  private uniforms = new Map<string, WebGLUniformLocation | null>()
  private scenes = new Set<Scene>()
  private restoreListeners = new Set<() => void>()
  /**
   * True between the browser dropping the GPU context (memory pressure, a
   * backgrounded mobile tab, a driver reset) and handing it back. Every texture
   * is gone by then, so scenes must be painted again once it is restored.
   */
  lost = false

  readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, opts: { preserve?: boolean } = {}) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', {
      premultipliedAlpha: true,
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: !!opts.preserve,
    })
    if (!gl) throw new Error('WebGL2 is not available')
    this.gl = gl
    canvas.addEventListener('webglcontextlost', this.onLost)
    canvas.addEventListener('webglcontextrestored', this.onRestored)
    this.init()
  }

  private onLost = (event: Event) => {
    // Without preventDefault the browser never offers the context back.
    event.preventDefault()
    this.lost = true
    this.scenes.clear()
    this.uniforms.clear()
  }

  private onRestored = () => {
    this.init()
    this.lost = false
    for (const listener of this.restoreListeners) listener()
  }

  /** Called after a lost context comes back, when every scene needs painting again. */
  onRestore(listener: () => void) {
    this.restoreListeners.add(listener)
    return () => {
      this.restoreListeners.delete(listener)
    }
  }

  /**
   * Starts compiling the shader. The ray-marcher is large enough that a
   * blocking compile freezes the page for seconds on some drivers (Direct3D on
   * Windows), so its status is not asked for until `ready()`, which lets the
   * browser compile it off the main thread where it can.
   */
  private init() {
    const gl = this.gl
    // A restored context starts with no extensions enabled, so this is asked again every time.
    this.parallel = gl.getExtension('KHR_parallel_shader_compile')
    const program = gl.createProgram()!
    this.shaders = [compile(gl, gl.VERTEX_SHADER, VERT), compile(gl, gl.FRAGMENT_SHADER, FRAG)]
    for (const shader of this.shaders) gl.attachShader(program, shader)
    gl.bindAttribLocation(program, 0, 'aPos')
    gl.linkProgram(program)
    // Send the commands now: nothing else may flush this context until the shader is ready.
    gl.flush()
    this.program = program
    this.linked = false

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  }

  /** Whether the shader can draw yet. Throws if it failed to compile or link. */
  ready() {
    const gl = this.gl
    // A lost context answers every query with null, which would read as a failed build. The
    // browser reports the loss only a little later, so this can come before `lost` is set.
    if (gl.isContextLost()) return false
    if (this.linked) return true
    if (this.parallel && !gl.getProgramParameter(this.program, this.parallel.COMPLETION_STATUS_KHR)) return false
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      if (gl.isContextLost()) return false
      const logs = [...this.shaders.map((shader) => gl.getShaderInfoLog(shader)), gl.getProgramInfoLog(this.program)]
      throw new Error(`Shader failed to build: ${logs.filter(Boolean).join(' ')}`)
    }
    this.linked = true
    return true
  }

  private u(name: string) {
    if (!this.uniforms.has(name)) this.uniforms.set(name, this.gl.getUniformLocation(this.program, name))
    return this.uniforms.get(name)!
  }

  createScene(shape: Shape, color: TextureSource, mat: TextureSource, finish: Finish): Scene {
    const gl = this.gl
    const profileTex = gl.createTexture()!
    const { r, dr } = sampleProfile(shape.points)
    const data = new Float32Array(PROFILE_SAMPLES * 2)
    for (let i = 0; i < PROFILE_SAMPLES; i++) {
      data[i * 2] = r[i]
      data[i * 2 + 1] = dr[i]
    }
    gl.bindTexture(gl.TEXTURE_2D, profileTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, PROFILE_SAMPLES, 1, 0, gl.RG, gl.FLOAT, data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const aniso =
      gl.getExtension('EXT_texture_filter_anisotropic') ||
      gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
    const upload = (src: TexImageSource, srgb: boolean) => {
      const tex = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      if (aniso) {
        const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
        gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max))
      }
      return tex
    }
    const scene: Scene = {
      shape,
      profileTex,
      colorTex: upload(color, true),
      matTex: upload(mat, false),
      texSize: [color.width, color.height],
      finish,
    }
    this.scenes.add(scene)
    return scene
  }

  deleteScene(scene: Scene) {
    if (!this.scenes.delete(scene)) return
    const gl = this.gl
    gl.deleteTexture(scene.profileTex)
    gl.deleteTexture(scene.colorTex)
    gl.deleteTexture(scene.matTex)
  }

  /**
   * Match the drawing buffer to a display size (CSS pixels). The buffer is
   * supersampled up to 2x beyond the screen's density while it stays inside a
   * pixel budget; the browser's downscale then smooths every edge.
   */
  resize(cssWidth: number, cssHeight: number, dpr: number, budget = LIVE_BUDGET) {
    const scale = Math.min(dpr, 2) * supersample(cssWidth * Math.min(dpr, 2), cssHeight * Math.min(dpr, 2), budget)
    this.setSize(Math.round(cssWidth * scale), Math.round(cssHeight * scale))
  }

  setSize(w: number, h: number) {
    w = Math.max(1, w)
    h = Math.max(1, h)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  /** Draws the scene, or returns false while the shader is still compiling. */
  render(scene: Scene, view: View) {
    if (this.lost || !this.ready()) return false
    const gl = this.gl
    const shape = scene.shape
    const f = scene.finish
    const { extent, halfW, height, top, bottom } = frameFor(shape)
    const plate = shape.kind === 'plate'

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)

    // A flat glazed face is a mirror: if the window sits behind the viewer the
    // whole plate goes white. Plates keep the window up high, so it gleams
    // along the rim and the well while the face stays readable.
    const winAz = view.lightAz
    const winEl = plate ? Math.min(0.9, Math.max(0.56, 0.62 + (view.lightEl - 0.5) * 0.4)) : view.lightEl

    // Camera: a long lens slightly above the vessel, framing it snugly.
    const dist = 7
    let camPos: number[]
    let fwd: number[]
    let right: number[]
    let up: number[]
    if (plate) {
      // face-on, tipping a few degrees with the light so the glaze plays
      const yaw = view.lightAz * 0.08
      const pitch = (view.lightEl - 0.5) * 0.1
      const cp = Math.cos(pitch)
      const dir = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp]
      camPos = dir.map((d) => d * dist)
      fwd = dir.map((d) => -d)
      right = [Math.cos(yaw), 0, -Math.sin(yaw)]
      up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]]
    } else {
      const cy = (top + bottom) / 2
      camPos = [0, cy + Math.sin(PITCH) * dist, Math.cos(PITCH) * dist]
      fwd = [0, -Math.sin(PITCH), -Math.cos(PITCH)]
      right = [1, 0, 0]
      up = [0, Math.cos(PITCH), -Math.sin(PITCH)]
    }
    const tanY = height / 2 / dist
    const tanX = halfW / dist

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, scene.profileTex)
    gl.uniform1i(this.u('uProfile'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, scene.colorTex)
    gl.uniform1i(this.u('uColor'), 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, scene.matTex)
    gl.uniform1i(this.u('uMat'), 2)

    gl.uniform2f(this.u('uTexSize'), scene.texSize[0], scene.texSize[1])
    gl.uniform1f(this.u('uProfileN'), PROFILE_SAMPLES)
    gl.uniform3fv(this.u('uCamPos'), camPos)
    gl.uniform3fv(this.u('uCamF'), fwd)
    gl.uniform3fv(this.u('uCamR'), right)
    gl.uniform3fv(this.u('uCamU'), up)
    gl.uniform2f(this.u('uTan'), tanX, tanY)
    gl.uniform1f(this.u('uPix'), (2 * tanY) / this.canvas.height)
    gl.uniform1f(this.u('uRot'), view.rotation)
    gl.uniform1i(this.u('uKind'), plate ? 1 : 0)
    gl.uniform1f(this.u('uTop'), shapeTop(shape))
    gl.uniform4fv(this.u('uHandleStripe'), f.handleStripe ?? [0, 0, 0, 0])
    gl.uniform1f(this.u('uWall'), shape.wall)
    gl.uniform1f(this.u('uFloor'), shape.floor)
    gl.uniform1f(this.u('uExtent'), extent + 0.01)

    const ha = new Float32Array(8)
    const hb = new Float32Array(8)
    const hf = new Float32Array([1, 1])
    shape.handles.slice(0, 2).forEach((h, i) => {
      ha.set([h.a[0], h.a[1], h.c[0], h.c[1]], i * 4)
      hb.set([h.b[0], h.b[1], h.angle, h.radius], i * 4)
      hf[i] = h.flat
    })
    gl.uniform1i(this.u('uHandles'), Math.min(2, shape.handles.length))
    gl.uniform4fv(this.u('uHA'), ha)
    gl.uniform4fv(this.u('uHB'), hb)
    gl.uniform1fv(this.u('uHFlat'), hf)

    gl.uniform3f(this.u('uWin'), winAz, winEl, plate ? 11.0 : 14.0)
    gl.uniform3fv(this.u('uInterior'), f.interior)
    gl.uniform1f(this.u('uInteriorGloss'), f.interiorGloss)
    gl.uniform3fv(this.u('uHandleCol'), f.handle)
    gl.uniform1f(this.u('uHandleGloss'), f.handleGloss)
    gl.uniform3fv(this.u('uRimCol'), f.rim)
    gl.uniform1f(this.u('uRimGold'), f.rimGold)
    gl.uniform1f(this.u('uGlaze'), f.glaze)
    gl.uniform1f(this.u('uRelief'), f.relief)

    gl.drawArrays(gl.TRIANGLES, 0, 3)
    return true
  }

  /**
   * Lets go of everything on the GPU. Browsers only allow a handful of live
   * contexts and drop the oldest (often the shared stills renderer) past that,
   * so the context itself is released once its canvas has left the page. A
   * canvas still on the page (hidden by <Activity>, say) keeps it: a new
   * renderer on that canvas gets the same context back and could not use a lost one.
   */
  dispose() {
    for (const scene of [...this.scenes]) this.deleteScene(scene)
    this.gl.deleteProgram(this.program)
    for (const shader of this.shaders) this.gl.deleteShader(shader)
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored)
    this.restoreListeners.clear()
    if (!this.canvas.isConnected) this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

// ------------------------------------------------------------ shared stills

let shared: VaseRenderer | null = null

/** The page-wide offscreen renderer that still pieces draw through. */
export function sharedRenderer() {
  if (!shared) shared = new VaseRenderer(document.createElement('canvas'), { preserve: true })
  return shared
}

/**
 * Draw a scene with the shared renderer, supersampled within a pixel budget,
 * and filter it down into a 2D canvas. Returns false if nothing could be drawn yet.
 */
export function renderInto(scene: Scene, view: View, target: HTMLCanvasElement, budget = STILL_REST_BUDGET) {
  const r = sharedRenderer()
  // keep the last frame on screen until a lost context is repainted or the shader is ready
  if (r.lost || !r.ready()) return false
  const ss = supersample(target.width, target.height, budget)
  r.setSize(Math.round(target.width * ss), Math.round(target.height * ss))
  r.render(scene, view)
  const ctx = target.getContext('2d')
  if (!ctx) return false
  ctx.clearRect(0, 0, target.width, target.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(r.canvas, 0, 0, r.canvas.width, r.canvas.height, 0, 0, target.width, target.height)
  return true
}

/**
 * The cursor as a lamp held a little in front of the page and slightly above
 * the pointer. Each piece works out where that lamp is from its own position,
 * so the piece under the pointer is lit from the front and anything far away
 * sees it low and to the side, fading back to the room light.
 */
export function lampLight(rect: DOMRect, x: number, y: number) {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height * 0.45
  const dx = x - cx
  const dy = y - cy
  const reach = Math.max(260, rect.height * 1.1)
  const az = Math.atan2(dx, reach)
  const el = Math.atan2(-dy + reach * 0.45, Math.hypot(dx, reach))
  const dist = Math.hypot(dx, dy)
  // beyond a couple of piece-heights the lamp stops mattering
  const w = Math.exp(-Math.max(0, dist - rect.height * 0.6) / (rect.height * 1.4))
  return {
    az: DEFAULT_LIGHT.az + (Math.max(-1.15, Math.min(1.15, az)) - DEFAULT_LIGHT.az) * w,
    el: DEFAULT_LIGHT.el + (Math.max(0.1, Math.min(0.95, el)) - DEFAULT_LIGHT.el) * w,
  }
}
