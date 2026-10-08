import * as THREE from "three";
import { FaceController } from '../FaceController.js'
import { toneToExpression, EXPRESSIONS } from '../expressions.js'


/**
 * Standalone low-poly "Human Developer" character.
 * Boxy body, but a clearly human head, face and hands.
 * Fully independent of AIAgent — add `human.group` to any scene.
 *
 * Hierarchy (animation-ready joints — MainScene / Episode drive these by name):
 *   humanGroup
 *     └── hips
 *           ├── torso → neck → head (+ skull, hair, face, ears)
 *           │         ├── leftUpperArm → leftForearm → leftHand
 *           │         └── rightUpperArm → rightForearm → rightHand
 *           ├── leftUpperLeg → leftLowerLeg → leftFoot
 *           └── rightUpperLeg → rightLowerLeg → rightFoot
 */
export class HumanDeveloper {
  /** @param {Partial<typeof HumanDeveloper.DEFAULT_PARAMS>} [params] */
  constructor(params = {}) {
    this.params = { ...HumanDeveloper.DEFAULT_PARAMS, ...params };

    this.humanGroup = new THREE.Group();
    this.humanGroup.name = "humanGroup";
    this.group = this.humanGroup;

    this._buildMaterials();
    this._buildBody();

    this._torsoBaseScale = new THREE.Vector3(1, 1, 1);

    this.faceController = new FaceController(this.headMesh)
    this.isSpeaking = false
    this.currentExpression = { ...EXPRESSIONS.NEUTRAL }
    this.targetExpression  = { ...EXPRESSIONS.NEUTRAL }
    this.expressionStartFrame = 0
  }

  static DEFAULT_PARAMS = {
    headSize: 0.48,
    neckHeight: 0.12,
    neckWidth: 0.1,
    torsoWidth: 0.62,
    torsoHeight: 0.68,
    torsoDepth: 0.36,
    hipWidth: 0.5,
    hipHeight: 0.22,
    hipDepth: 0.3,
    // Short blue sleeves + skin forearms (reads clearly in the final look)
    upperArmLength: 0.28,
    forearmLength: 0.36,
    armThickness: 0.13,
    /** Hand span — large enough to read from Z≈4–7 on the bench */
    handSize: 0.17,
    upperLegLength: 0.4,
    lowerLegLength: 0.38,
    legThickness: 0.17,
    footLength: 0.28,
    footHeight: 0.09,
    footWidth: 0.15,
    /** Half-gap between leg centers */
    legSpread: 0.15,
    /** Tiny visual gap so joints read as separate parts */
    jointGap: 0.02,
  };

  // ── Materials (matte) ──────────────────────────────────────────────────

  setTone(tone, isSpeaking, frame) {
    this.isSpeaking = isSpeaking
    const key = isSpeaking ? toneToExpression(tone) : 'LISTENING'
    this.targetExpression = { ...EXPRESSIONS[key] }
    this.expressionStartFrame = frame
  }

  updateExpression(frame, fps = 30) {
    const elapsed = frame - this.expressionStartFrame
    const t = Math.min(elapsed / 12, 1.0)
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t

    this.faceController.updateFrame(this.currentExpression, this.targetExpression, ease)

    if (t >= 1.0) {
      this.currentExpression = { ...this.targetExpression }
    }

    if (this.isSpeaking) {
      const talk = Math.abs(Math.sin(frame * 0.65))
      if (this.lips) {
        this.lips.scale.y = 0.45 + talk * 0.2
      }
    } else {
      if (this.lips) {
        this.lips.scale.y = 0.45
      }
    }
  }
  _buildMaterials() {
    const mat = (hex) =>
      new THREE.MeshLambertMaterial({ color: new THREE.Color(hex) });

    this.materials = {
      navy: mat("#191E2D"),
      shirt: mat("#3474A4"),
      skin: mat("#E8AF87"),
      brown: mat("#2F241F"),
      eyeWhite: mat("#F5F0E8"),
      iris: mat("#3D2914"),
      lip: mat("#C47A6A"),
    };
  }

  _box(w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _sphere(radius, material, wSeg = 16, hSeg = 12) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, wSeg, hSeg),
      material,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _cylinder(rTop, rBot, height, material, segments = 10) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, height, segments),
      material,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // ── Body ───────────────────────────────────────────────────────────────

  _buildBody() {
    const p = this.params;
    const hipY =
      p.footHeight + p.lowerLegLength + p.upperLegLength + p.hipHeight * 0.5 + p.jointGap * 2;

    this.hips = new THREE.Group();
    this.hips.name = "hips";
    this.hips.position.set(0, hipY, 0);
    const hipMesh = this._box(p.hipWidth, p.hipHeight, p.hipDepth, this.materials.navy);
    hipMesh.name = "hipsMesh";
    this.hips.add(hipMesh);
    this.humanGroup.add(this.hips);

    // Torso sits on top of hips
    this.torso = new THREE.Group();
    this.torso.name = "torso";
    this.torso.position.set(0, p.hipHeight * 0.5 + p.torsoHeight * 0.5 + p.jointGap, 0);
    const torsoMesh = this._box(
      p.torsoWidth,
      p.torsoHeight,
      p.torsoDepth,
      this.materials.shirt,
    );
    torsoMesh.name = "torsoMesh";
    this.torso.add(torsoMesh);
    this.hips.add(this.torso);

    // Neck — soft cylinder
    this.neck = new THREE.Group();
    this.neck.name = "neck";
    this.neck.position.set(0, p.torsoHeight * 0.5 + p.neckHeight * 0.5 + p.jointGap, 0);
    const neckMesh = this._cylinder(
      p.neckWidth * 0.55,
      p.neckWidth * 0.62,
      p.neckHeight,
      this.materials.skin,
      12,
    );
    neckMesh.name = "neckMesh";
    this.neck.add(neckMesh);
    this.torso.add(this.neck);

    this._buildHead();

    this.leftUpperArm = this._buildArm("left");
    this.rightUpperArm = this._buildArm("right");
    // Keep legacy aliases used by setArmRotation
    this.leftArm = this.leftUpperArm;
    this.rightArm = this.rightUpperArm;
    this.torso.add(this.leftUpperArm, this.rightUpperArm);

    this.leftUpperLeg = this._buildLeg("left");
    this.rightUpperLeg = this._buildLeg("right");
    this.leftLeg = this.leftUpperLeg;
    this.rightLeg = this.rightUpperLeg;
    this.hips.add(this.leftUpperLeg, this.rightUpperLeg);
  }

  // ── Head ───────────────────────────────────────────────────────────────

  _buildHead() {
    const p = this.params;
    const R = p.headSize * 0.5;

    this.head = new THREE.Group();
    this.head.name = "head";
    this.head.position.set(0, p.neckHeight * 0.5 + R * 1.05 + p.jointGap * 0.5, 0);

    // Skull — slightly oval sphere (wider than deep, a touch taller than wide)
    const skull = this._sphere(R, this.materials.skin, 24, 18);
    skull.name = "headMesh";
    skull.scale.set(0.9, 1.05, 0.85);
    this.headMesh = skull;
    this.head.add(skull);

    this._addHair(R);
    this._addFace(R);

    this.neck.add(this.head);
  }

  _addHair(R) {
    // Top cap — a partial sphere hugging the crown. The cut sits ~55° down
    // from the pole, so the hairline lands high on the forehead and the
    // brows, eyes and forehead stay skin-coloured (no visor band).
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.08, 24, 12, 0, Math.PI * 2, 0, 0.95),
      this.materials.brown,
    );
    cap.name = "hairTop";
    cap.scale.set(0.9, 1.05, 0.85);
    cap.castShadow = true;
    this.head.add(cap);

    // Back — hair mass behind the skull, reaching down to the nape
    const back = this._sphere(R * 0.62, this.materials.brown, 14, 10);
    back.name = "hairBack";
    back.position.set(0, R * 0.1, -R * 0.52);
    back.scale.set(1.0, 1.15, 0.72);
    this.head.add(back);

    // Sideburns — behind the face plane, above and behind the ears
    [-1, 1].forEach((sign) => {
      const burn = this._sphere(R * 0.2, this.materials.brown, 8, 6);
      burn.name = sign < 0 ? "hairSideL" : "hairSideR";
      burn.position.set(sign * R * 0.8, R * 0.15, -R * 0.28);
      burn.scale.set(0.5, 1.2, 0.8);
      this.head.add(burn);
    });
  }

  _addFace(R) {
    const eyeX = R * 0.34;
    const eyeY = R * 0.1;
    const eyeR = R * 0.15;
    /** Face plane — just proud of the skull so every feature reads */
    const faceZ = R * 0.8;

    [-1, 1].forEach((sign) => {
      const side = sign < 0 ? "left" : "right";

      // Eye — white sclera with a dark brown iris, protruding on +Z
      const white = this._sphere(eyeR, this.materials.eyeWhite, 10, 8);
      white.name = `${side}Eye`;
      white.position.set(sign * eyeX, eyeY, faceZ);
      white.scale.set(1.15, 0.9, 0.5);
      this.head.add(white);

      const iris = this._sphere(eyeR * 0.6, this.materials.iris, 8, 6);
      iris.name = `${side}Iris`;
      iris.position.set(sign * eyeX, eyeY, faceZ + eyeR * 0.4);
      this.head.add(iris);

      // Brow — short thin box above its own eye, not one continuous band
      const brow = this._box(eyeR * 2.0, eyeR * 0.36, eyeR * 0.4, this.materials.brown);
      brow.name = `${side}Eyebrow`;
      brow.position.set(sign * eyeX, eyeY + eyeR * 2.2, faceZ + R * 0.02);
      brow.rotation.z = -sign * 0.12;
      this.head.add(brow);
    });

    // Nose — large, protruding skin-coloured sphere (readable in a medium shot)
    const nose = this._sphere(R * 0.22, this.materials.skin, 12, 10);
    nose.name = "nose";
    nose.position.set(0, -R * 0.14, faceZ + R * 0.1);
    nose.scale.set(0.78, 1.1, 1.3);
    this.head.add(nose);

    // Lips — soft lip-coloured shape under the nose
    const lips = this._sphere(R * 0.2, this.materials.lip, 12, 8);
    lips.name = "lips";
    lips.position.set(0, -R * 0.5, faceZ + R * 0.02);
    lips.scale.set(1.4, 0.45, 0.6);
    this.lips = lips;
    this._lipsBaseY = lips.position.y;
    this.head.add(lips);

    // Ears — small, on the sides of the skull
    [-1, 1].forEach((sign) => {
      const ear = this._sphere(R * 0.24, this.materials.skin, 8, 6);
      ear.name = sign < 0 ? "earL" : "earR";
      ear.position.set(sign * R * 0.9, 0, -R * 0.05);
      ear.scale.set(0.4, 1.05, 0.65);
      this.head.add(ear);
    });
  }

  // ── Arms ───────────────────────────────────────────────────────────────

  _buildArm(side) {
    const p = this.params;
    const sign = side === "left" ? -1 : 1;
    const shoulderX = (p.torsoWidth * 0.5 + p.armThickness * 0.4) * sign;
    const shoulderY = p.torsoHeight * 0.32;

    const upperArm = new THREE.Group();
    upperArm.name = `${side}UpperArm`;
    upperArm.position.set(shoulderX, shoulderY, 0);

    // Blue short sleeve
    const sleeve = this._box(
      p.armThickness * 1.05,
      p.upperArmLength,
      p.armThickness * 1.05,
      this.materials.shirt,
    );
    sleeve.name = `${side}UpperArmMesh`;
    sleeve.position.y = -p.upperArmLength * 0.5;
    upperArm.add(sleeve);

    const forearm = new THREE.Group();
    forearm.name = `${side}Forearm`;
    forearm.position.set(0, -(p.upperArmLength + p.jointGap), 0);
    const forearmMesh = this._box(
      p.armThickness,
      p.forearmLength,
      p.armThickness,
      this.materials.skin,
    );
    forearmMesh.name = `${side}ForearmMesh`;
    forearmMesh.position.y = -p.forearmLength * 0.5;
    forearm.add(forearmMesh);

    const hand = new THREE.Group();
    hand.name = `${side}Hand`;
    hand.position.set(0, -(p.forearmLength + p.jointGap), 0);

    // Palm
    const palm = this._box(
      p.handSize * 1.05,
      p.handSize * 0.55,
      p.handSize * 0.85,
      this.materials.skin,
    );
    palm.name = `${side}HandMesh`;
    palm.position.set(0, -p.handSize * 0.28, 0);
    hand.add(palm);

    // Fingers — hang from the palm, readable from camera
    const fingerW = p.handSize * 0.22;
    const fingerH = p.handSize * 0.55;
    const fingerD = p.handSize * 0.22;
    const fingerYs = -p.handSize * 0.28 - fingerH * 0.55;
    const spreads = [-0.35, -0.12, 0.12, 0.35];
    spreads.forEach((sx, i) => {
      const finger = this._box(fingerW, fingerH, fingerD, this.materials.skin);
      finger.name = `${side}Finger${i}`;
      finger.position.set(p.handSize * sx, fingerYs, p.handSize * 0.15);
      hand.add(finger);
    });

    // Thumb — angled outward
    const thumb = this._box(fingerW * 1.1, fingerH * 0.7, fingerD, this.materials.skin);
    thumb.name = `${side}Thumb`;
    thumb.position.set(sign * p.handSize * 0.45, -p.handSize * 0.2, p.handSize * 0.1);
    thumb.rotation.z = sign * 0.6;
    hand.add(thumb);

    forearm.add(hand);
    upperArm.add(forearm);

    if (side === "left") {
      this.leftForearm = forearm;
      this.leftHand = hand;
    } else {
      this.rightForearm = forearm;
      this.rightHand = hand;
    }

    return upperArm;
  }

  // ── Legs ───────────────────────────────────────────────────────────────

  _buildLeg(side) {
    const p = this.params;
    const sign = side === "left" ? -1 : 1;

    const upperLeg = new THREE.Group();
    upperLeg.name = `${side}UpperLeg`;
    upperLeg.position.set(p.legSpread * sign, -p.hipHeight * 0.5, 0);

    const thigh = this._box(
      p.legThickness,
      p.upperLegLength,
      p.legThickness * 1.05,
      this.materials.navy,
    );
    thigh.name = `${side}UpperLegMesh`;
    thigh.position.y = -p.upperLegLength * 0.5;
    upperLeg.add(thigh);

    const lowerLeg = new THREE.Group();
    lowerLeg.name = `${side}LowerLeg`;
    lowerLeg.position.set(0, -(p.upperLegLength + p.jointGap), 0);
    const shin = this._box(
      p.legThickness * 0.92,
      p.lowerLegLength,
      p.legThickness * 0.95,
      this.materials.navy,
    );
    shin.name = `${side}LowerLegMesh`;
    shin.position.y = -p.lowerLegLength * 0.5;
    lowerLeg.add(shin);

    const foot = new THREE.Group();
    foot.name = `${side}Foot`;
    foot.position.set(0, -(p.lowerLegLength + p.jointGap), 0);
    const footMesh = this._box(p.footWidth, p.footHeight, p.footLength, this.materials.navy);
    footMesh.name = `${side}FootMesh`;
    footMesh.position.set(0, -p.footHeight * 0.5, p.footLength * 0.2);
    foot.add(footMesh);

    lowerLeg.add(foot);
    upperLeg.add(lowerLeg);

    if (side === "left") {
      this.leftLowerLeg = lowerLeg;
      this.leftFoot = foot;
    } else {
      this.rightLowerLeg = lowerLeg;
      this.rightFoot = foot;
    }

    return upperLeg;
  }

  // ── Animation API ──────────────────────────────────────────────────────

  /**
   * @param {number} radians
   * @param {"both"|"left"|"right"} [side="both"]
   */
  setArmRotation(radians, side = "both") {
    if (side === "both" || side === "left") this.leftUpperArm.rotation.x = radians;
    if (side === "both" || side === "right") this.rightUpperArm.rotation.x = radians;
  }

  /**
   * @param {number} radians
   * @param {"y"|"x"|"z"} [axis="y"]
   */
  setHeadRotation(radians, axis = "y") {
    this.head.rotation[axis] = radians;
  }

  /**
   * @param {number} timeSeconds
   * @param {number} [amount=0.02]
   * @param {number} [speed=1.5]
   */
  idleBreathe(timeSeconds, amount = 0.02, speed = 1.5) {
    const s = 1 + Math.sin(timeSeconds * speed) * amount;
    this.torso.scale.set(
      this._torsoBaseScale.x,
      this._torsoBaseScale.y * s,
      this._torsoBaseScale.z,
    );
  }

  setPosition(x, y, z) {
    this.humanGroup.position.set(x, y, z);
  }

  setRotation(yRadians) {
    this.humanGroup.rotation.y = yRadians;
  }

  dispose() {
    this.humanGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
    });
  }
}

export default HumanDeveloper;
