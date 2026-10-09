import * as THREE from 'three'
import { EXPRESSIONS, blendExpressions } from './expressions.js'

// Face rigs. Both are driven the same way:
//   applyExpression(expr)  – brows, lids and mouth shape from an expression preset
//   setGaze(x, y)          – normalised eye direction in [-1, 1]
//   setBlink(t)            – 0 open, 1 closed
//   setMouthOpen(t)        – 0 closed, 1 fully open (talking)
//   render()               – writes everything to the meshes
// Every value is set per frame from a pure function of the frame number, so
// frames render identically in any order.

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
const lerp = (a, b, t) => a + (b - a) * t

// ── Mouth ────────────────────────────────────────────────────────────────────

/**
 * A curved mouth built as a triangle fan with fixed topology. Each frame only
 * the vertex positions change: width, corner curve (smile/frown) and opening.
 * `zAt(x, y)` places every vertex on the face surface, so a mouth on a round
 * head never sinks into it or floats off it.
 */
class MouthFan {
  constructor(material, zAt, segments = 16) {
    this.n = segments
    this.zAt = zAt
    const count = 1 + 2 * segments
    this.positions = new Float32Array(count * 3)
    const index = []
    const ring = 2 * segments
    // Counter-clockwise seen from the front (+Z), so the fan faces the camera
    for (let k = 0; k < ring; k++) index.push(0, 1 + ((k + 1) % ring), 1 + k)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geo.setIndex(index)
    this.mesh = new THREE.Mesh(geo, material)
    this.mesh.frustumCulled = false
  }

  /**
   * @param {object} s
   * @param {number} s.cx, s.cy  centre
   * @param {number} s.width
   * @param {number} s.curve     corner lift (+ smile, - frown) in world units
   * @param {number} s.up        upper edge height above the centre line
   * @param {number} s.down      lower edge depth below the centre line
   * @param {number} s.zOffset   distance in front of the surface
   */
  update({ cx, cy, width, curve, up, down, zOffset }) {
    const n = this.n
    const p = this.positions
    const put = (i, x, y) => {
      p[i * 3] = x
      p[i * 3 + 1] = y
      p[i * 3 + 2] = this.zAt(x, y) + zOffset
    }
    const centerLine = (u) => cy + curve * (u * u - 0.35)
    put(0, cx, centerLine(0) + (up - down) * 0.5)
    // upper edge, left → right
    for (let i = 0; i <= n; i++) {
      const u = -1 + (2 * i) / n
      const bulge = 1 - u * u
      put(1 + i, cx + (u * width) / 2, centerLine(u) + up * bulge)
    }
    // lower edge, right → left (corners shared with the upper edge)
    for (let i = 1; i < n; i++) {
      const u = 1 - (2 * i) / n
      const bulge = 1 - u * u
      put(1 + n + i, cx + (u * width) / 2, centerLine(u) - down * bulge)
    }
    this.mesh.geometry.attributes.position.needsUpdate = true
    this.mesh.geometry.computeBoundingSphere()
  }
}

// ── Shared state handling ────────────────────────────────────────────────────

class FaceBase {
  constructor() {
    this.expr = { ...EXPRESSIONS.NEUTRAL }
    this.gaze = { x: 0, y: 0 }
    this.blink = 0
    this.mouthOpen = 0
    this.asym = 0 // + narrows the right eye, - the left
    this.jawShift = 0 // sideways mouth offset, -1..1
  }

  applyExpression(expr) {
    this.expr = { ...EXPRESSIONS.NEUTRAL, ...expr }
    this.render()
  }

  setGaze(x, y) { this.gaze = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) } }
  setBlink(t) { this.blink = clamp(t, 0, 1) }
  setMouthOpen(t) { this.mouthOpen = clamp(t, 0, 1) }
  setAsymmetry(a) { this.asym = clamp(a, -1, 1) }
  setJawShift(s) { this.jawShift = clamp(s, -1, 1) }

  // Kept for callers of the original API: blend two presets and apply.
  updateFrame(fromExpr, toExpr, t) {
    this.applyExpression(blendExpressions(fromExpr, toExpr, t))
  }
}

// ── Human face ───────────────────────────────────────────────────────────────

/**
 * Organic face on an ellipsoid skull: rotating eyeballs with an iris ring,
 * pupil and catchlight; skin eyelids that close over the eye; rounded brows;
 * lips with an opening mouth.
 *
 * @param {THREE.Object3D} head  unscaled head group the features attach to
 * @param {object} opts
 * @param {number} opts.R              skull radius
 * @param {number[]} opts.skullScale   skull mesh scale [x, y, z]
 * @param {object} opts.materials      { skin, eyeWhite, iris, pupil, brow, lip, mouth }
 */
export class FaceController extends FaceBase {
  constructor(head, opts) {
    super()
    this.head = head
    this.R = opts.R
    const [sx, sy, sz] = opts.skullScale
    this.radii = [opts.R * sx, opts.R * sy, opts.R * sz]
    this.m = opts.materials

    const R = this.R
    this.eyeX = R * 0.34
    this.eyeY = R * 0.1
    this.eyeR = R * 0.155
    this.browBaseY = this.eyeY + this.eyeR * 1.75
    this.mouthY = -R * 0.5

    this._buildEyes()
    this._buildBrows()
    this._buildMouth()
    this.render()
  }

  /** Front surface depth of the skull at (x, y). */
  surfaceZ(x, y) {
    const [a, b, c] = this.radii
    const k = 1 - (x / a) ** 2 - (y / b) ** 2
    return c * Math.sqrt(Math.max(k, 0))
  }

  _mesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = false
    m.receiveShadow = false
    return m
  }

  _buildEyes() {
    const r = this.eyeR
    this.eyes = {}
    for (const sign of [-1, 1]) {
      const side = sign < 0 ? 'left' : 'right'
      const x = sign * this.eyeX
      // Socket: flattened so the eye sits in the face rather than on it
      const socket = new THREE.Group()
      socket.name = `${side}EyeSocket`
      socket.position.set(x, this.eyeY, this.surfaceZ(x, this.eyeY) - r * 0.32)
      socket.scale.set(1.12, 1.0, 0.62)

      // Eyeball rotates with gaze; iris and pupil are caps on its front
      const ball = new THREE.Group()
      const sclera = this._mesh(new THREE.SphereGeometry(r, 24, 16), this.m.eyeWhite)
      ball.add(sclera)
      const cap = (radius, theta, mat) => {
        const g = new THREE.SphereGeometry(radius, 24, 6, 0, Math.PI * 2, 0, theta)
        const mesh = this._mesh(g, mat)
        mesh.rotation.x = Math.PI / 2 // pole → +Z (front)
        return mesh
      }
      ball.add(cap(r * 1.006, 0.62, this.m.iris))
      ball.add(cap(r * 1.012, 0.42, this.m.irisInner))
      ball.add(cap(r * 1.018, 0.26, this.m.pupil))
      socket.add(ball)

      // Catchlight: fixed in the socket so it does not slide with the iris
      const glint = this._mesh(new THREE.SphereGeometry(r * 0.13, 8, 6), this.m.glint)
      glint.position.set(r * 0.28, r * 0.32, r * 1.0)
      socket.add(glint)

      // Lids: skin hemispheres slightly larger than the eye, rotated to close
      const lidGeo = new THREE.SphereGeometry(r * 1.13, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2)
      const upper = this._mesh(lidGeo, this.m.skin)
      const lower = this._mesh(lidGeo, this.m.skin)
      lower.scale.y = -1 // pole → -Y
      socket.add(upper, lower)
      // Lash line along the upper lid edge reads as an eye outline at phone size
      const lash = this._mesh(
        new THREE.TorusGeometry(r * 1.1, r * 0.09, 6, 24, Math.PI),
        this.m.brow,
      )
      upper.add(lash)
      lash.rotation.x = Math.PI / 2 // lid rim lies in the lid's base plane

      this.head.add(socket)
      this.eyes[side] = { socket, ball, upper, lower }
    }
  }

  _buildBrows() {
    const g = new THREE.CapsuleGeometry(this.R * 0.042, this.R * 0.3, 4, 10)
    g.rotateZ(Math.PI / 2)
    this.brows = {}
    for (const sign of [-1, 1]) {
      const side = sign < 0 ? 'left' : 'right'
      const brow = this._mesh(g, this.m.brow)
      brow.name = `${side}Brow`
      brow.scale.set(1, 1, 0.6)
      this.head.add(brow)
      this.brows[side] = brow
    }
  }

  _buildMouth() {
    const zAt = (x, y) => this.surfaceZ(x, y)
    this.lips = new MouthFan(this.m.lip, zAt)
    this.inner = new MouthFan(this.m.mouth, zAt)
    this.lips.mesh.name = 'lips'
    this.inner.mesh.name = 'mouthInner'
    this.head.add(this.lips.mesh, this.inner.mesh)
  }

  render() {
    const e = this.expr
    const R = this.R

    // Eyes: gaze, lids, blink
    for (const sign of [-1, 1]) {
      const side = sign < 0 ? 'left' : 'right'
      const eye = this.eyes[side]
      eye.ball.rotation.set(-this.gaze.y * 0.42, this.gaze.x * 0.55, 0)
      const asym = sign > 0 ? Math.max(this.asym, 0) : Math.max(-this.asym, 0)
      const squint = clamp(e.eyeSquint + asym * 0.6, 0, 1)
      const open = -1.02 - e.eyeWide * 0.28 + squint * 0.55 + Math.max(e.browInner, 0) * 0.12
      eye.upper.rotation.x = lerp(open, 1.5, this.blink)
      eye.lower.rotation.x = 1.25 - squint * 0.45 - e.mouthSmile * 0.2
    }

    // Brows: height from raise/furrow, slant from inner/furrow
    const browY = this.browBaseY + e.browRaise * R * 0.1 - e.browFurrow * R * 0.04
    const tilt = e.browInner * 0.32 - e.browFurrow * 0.12
    for (const sign of [-1, 1]) {
      const side = sign < 0 ? 'left' : 'right'
      const brow = this.brows[side]
      const x = sign * (this.eyeX - e.browFurrow * R * 0.035)
      const asym = sign > 0 ? this.asym : -this.asym
      const y = browY - asym * R * 0.03
      brow.position.set(x, y, this.surfaceZ(x, y) + R * 0.012)
      brow.rotation.set(0, sign * 0.25, sign < 0 ? tilt : -tilt)
    }

    // Mouth: smile/frown curve and talking opening
    const smile = e.mouthSmile - e.mouthFrown
    const width = R * (0.4 + e.mouthSmile * 0.1 - e.mouthFrown * 0.04)
    const curve = R * 0.08 * smile
    const open = this.mouthOpen
    const cx = this.jawShift * R * 0.08
    const cy = this.mouthY
    this.inner.update({ cx, cy, width: width * 0.86, curve, up: R * 0.03 * open, down: R * 0.17 * open, zOffset: R * 0.03 })
    this.lips.update({ cx, cy, width, curve, up: R * (0.045 + 0.04 * open), down: R * (0.05 + 0.19 * open), zOffset: R * 0.022 })
  }
}

// ── Screen face (Byte) ───────────────────────────────────────────────────────

/**
 * A face drawn on a flat display: dark sclera discs with glowing pupils and a
 * soft halo, lids in the screen colour that slide and tilt for blinks and
 * moods, lower lids that rise into happy crescents, and a glowing mouth.
 *
 * @param {THREE.Object3D} screen  group whose local XY plane is the display
 * @param {object} opts
 * @param {object} opts.colors     { screen, sclera, glow }
 * @param {number} [opts.scale=1]  overall feature scale
 */
export class ScreenFaceController extends FaceBase {
  constructor(screen, opts) {
    super()
    this.screen = screen
    this.s = opts.scale ?? 1
    this.colors = opts.colors
    this.brightness = 1
    this._glow = new THREE.Color(opts.colors.glow)
    this._build()
    this.render()
  }

  setBrightness(b) { this.brightness = clamp(b, 0.25, 1.4) }

  _basic(color, extra = {}) {
    return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), ...extra })
  }

  _build() {
    const s = this.s
    this.eyeR = 0.07 * s
    this.eyeX = 0.115 * s
    this.eyeY = 0.035 * s
    const r = this.eyeR

    this.mat = {
      sclera: this._basic(this.colors.sclera),
      halo: this._basic(this.colors.glow, { transparent: true, opacity: 0.28, depthWrite: false }),
      pupil: this._basic(this.colors.glow),
      glint: this._basic('#E8FFF6'),
      lid: this._basic(this.colors.screen),
      mouth: this._basic(this.colors.glow),
      mouthInner: this._basic(this.colors.sclera),
    }

    // Lid plane with its origin on its bottom edge, so tilting pivots on the lid line
    const lidGeo = new THREE.PlaneGeometry(r * 2.6, r * 2.2)
    lidGeo.translate(0, r * 1.1, 0)

    this.eyes = {}
    for (const sign of [-1, 1]) {
      const side = sign < 0 ? 'left' : 'right'
      const g = new THREE.Group()
      g.position.set(sign * this.eyeX, this.eyeY, 0)

      const sclera = new THREE.Mesh(new THREE.CircleGeometry(r, 40), this.mat.sclera)
      sclera.position.z = 0.001
      const iris = new THREE.Group()
      const halo = new THREE.Mesh(new THREE.CircleGeometry(r * 0.8, 32), this.mat.halo)
      halo.position.z = 0.002
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(r * 0.5, 32), this.mat.pupil)
      pupil.position.z = 0.003
      const glint = new THREE.Mesh(new THREE.CircleGeometry(r * 0.13, 12), this.mat.glint)
      glint.position.set(r * 0.17, r * 0.18, 0.004)
      iris.add(halo, pupil, glint)

      const upper = new THREE.Mesh(lidGeo, this.mat.lid)
      upper.position.z = 0.006
      const lower = new THREE.Mesh(new THREE.CircleGeometry(r * 1.35, 40), this.mat.lid)
      lower.position.z = 0.005

      g.add(sclera, iris, upper, lower)
      this.screen.add(g)
      this.eyes[side] = { g, iris, upper, lower }
    }

    const zAt = () => 0.008
    this.mouthOuter = new MouthFan(this.mat.mouth, zAt)
    this.mouthInner = new MouthFan(this.mat.mouthInner, () => 0.009)
    this.screen.add(this.mouthOuter.mesh, this.mouthInner.mesh)
  }

  render() {
    const e = this.expr
    const r = this.eyeR
    const s = this.s

    // Brightness: dims or lifts the glow colour
    const glow = this._glow.clone().multiplyScalar(this.brightness)
    this.mat.pupil.color.copy(glow)
    this.mat.mouth.color.copy(glow)
    this.mat.halo.color.copy(glow)
    this.mat.halo.opacity = 0.22 + 0.12 * this.brightness

    const pupilScale = 1 + e.eyeWide * 0.18 - e.eyeSquint * 0.1
    for (const sign of [-1, 1]) {
      const side = sign < 0 ? 'left' : 'right'
      const eye = this.eyes[side]
      eye.iris.position.set(this.gaze.x * r * 0.42, this.gaze.y * r * 0.36, 0)
      eye.iris.scale.setScalar(pupilScale)

      const asym = sign > 0 ? Math.max(this.asym, 0) : Math.max(-this.asym, 0)
      const squint = clamp(e.eyeSquint + asym * 0.7, 0, 1)
      // Upper lid edge: from above the eye (open) down past centre (half-lidded)
      const openEdge = r * (1.05 + e.eyeWide * 0.2 - squint * 0.95 - e.mouthFrown * 0.15)
      const edge = lerp(openEdge, -r * 1.05, this.blink)
      eye.upper.position.y = edge
      // Only as tall as needed to reach above the eye, so it never spills past the screen
      eye.upper.scale.y = Math.max(r * 1.25 - edge, 0.001) / (r * 2.2)
      const tilt = e.browInner * 0.38 - e.browFurrow * 0.22
      eye.upper.rotation.z = sign < 0 ? tilt : -tilt

      // Lower lid: a screen-coloured disc rising from below makes ^ crescents on a smile
      const lift = clamp(e.mouthSmile * 0.75 + squint * 0.2, 0, 1)
      eye.lower.position.y = -r * 2.4 + lift * r * 1.15
    }

    const smile = e.mouthSmile - e.mouthFrown
    const open = this.mouthOpen
    const width = 0.17 * s * (1 + e.mouthSmile * 0.2 - e.mouthFrown * 0.1)
    const curve = 0.028 * s * smile
    const cx = this.jawShift * 0.03 * s
    const cy = -0.1 * s
    this.mouthOuter.update({ cx, cy, width, curve, up: 0.011 * s + 0.01 * s * open, down: 0.011 * s + 0.055 * s * open, zOffset: 0 })
    this.mouthInner.update({ cx, cy, width: width * 0.82, curve, up: 0.008 * s * open, down: 0.045 * s * open, zOffset: 0 })
  }
}
