import * as THREE from 'three'
import { EXPRESSIONS, blendExpressions } from './expressions.js'

export class FaceController {
  constructor(headMesh) {
    // headMesh = the THREE.Mesh that is the character's head (sphere or low-poly head shape)
    this.headMesh = headMesh
    this.current = { ...EXPRESSIONS.NEUTRAL }
    this.target  = { ...EXPRESSIONS.NEUTRAL }

    // Create eye meshes (flat circles on the face surface)
    this._buildEyes()
    // Create brow meshes (thin boxes above eyes)
    this._buildBrows()
    // Create mouth mesh (thin cylinder/arc)
    this._buildMouth()
  }

  _buildEyes() {
    const eyeGeo = new THREE.CircleGeometry(0.055, 12)
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1a1a2e' })

    this.leftEye  = new THREE.Mesh(eyeGeo, eyeMat)
    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat)

    // Whites (slightly larger circle behind pupils)
    const whiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
    const whiteGeo = new THREE.CircleGeometry(0.075, 12)
    this.leftWhite  = new THREE.Mesh(whiteGeo, whiteMat)
    this.rightWhite = new THREE.Mesh(whiteGeo, whiteMat)

    const headR = 0.28 // radius of head sphere
    // Position on front face
    this.leftWhite.position.set(-0.10, 0.05, headR - 0.01)
    this.rightWhite.position.set( 0.10, 0.05, headR - 0.01)
    this.leftEye.position.set(-0.10, 0.05, headR)
    this.rightEye.position.set( 0.10, 0.05, headR)

    this.headMesh.add(this.leftWhite, this.rightWhite, this.leftEye, this.rightEye)
  }

  _buildBrows() {
    const browGeo = new THREE.BoxGeometry(0.13, 0.022, 0.01)
    const browMat = new THREE.MeshBasicMaterial({ color: '#2a1a0a' })

    this.leftBrow  = new THREE.Mesh(browGeo, browMat)
    this.rightBrow = new THREE.Mesh(browGeo, browMat)

    const headR = 0.28
    this.leftBrow.position.set(-0.10, 0.16, headR - 0.01)
    this.rightBrow.position.set( 0.10, 0.16, headR - 0.01)

    this.headMesh.add(this.leftBrow, this.rightBrow)
  }

  _buildMouth() {
    // Mouth = flat thin box, scaled/curved per expression
    const mouthGeo = new THREE.BoxGeometry(0.18, 0.025, 0.01)
    const mouthMat = new THREE.MeshBasicMaterial({ color: '#1a1a2e' })
    this.mouth = new THREE.Mesh(mouthGeo, mouthMat)

    const headR = 0.28
    this.mouth.position.set(0, -0.10, headR - 0.005)

    this.headMesh.add(this.mouth)
  }

  // Call this every frame with blend values (0→1)
  applyExpression(expr) {
    const { browRaise, browFurrow, mouthSmile, mouthFrown, eyeWide, eyeSquint } = expr

    const headR = 0.28
    const baseBrowY = 0.16

    // BROWS — raise/lower Y, tilt for furrow
    const browY = baseBrowY + browRaise * 0.05 - browFurrow * 0.03
    this.leftBrow.position.y  = browY
    this.rightBrow.position.y = browY
    // Furrow: inner ends rotate down
    this.leftBrow.rotation.z  =  browFurrow * 0.25 - browRaise * 0.1
    this.rightBrow.rotation.z = -browFurrow * 0.25 + browRaise * 0.1

    // EYES — scale Y for wide/squint
    const eyeScaleY = 1.0 + eyeWide * 0.4 - eyeSquint * 0.5
    this.leftEye.scale.y  = Math.max(0.15, eyeScaleY)
    this.rightEye.scale.y = Math.max(0.15, eyeScaleY)
    this.leftWhite.scale.y  = Math.max(0.2, eyeScaleY * 0.9)
    this.rightWhite.scale.y = Math.max(0.2, eyeScaleY * 0.9)

    // MOUTH — smile curves up, frown curves down, scale for wide smile
    const mouthY = -0.10 + mouthSmile * 0.025 - mouthFrown * 0.02
    this.mouth.position.set(0, mouthY, headR - 0.005)
    // Smile = wider + slight arc (fake with scale + rotation)
    this.mouth.scale.x = 1.0 + mouthSmile * 0.4
    this.mouth.scale.y = 1.0 + mouthSmile * 0.3
    this.mouth.rotation.z = mouthFrown * 0.15 - mouthSmile * 0.05
  }

  // Deterministic update — call from character update() with frame number
  updateFrame(fromExpr, toExpr, t) {
    const blended = blendExpressions(fromExpr, toExpr, t)
    this.applyExpression(blended)
  }
}