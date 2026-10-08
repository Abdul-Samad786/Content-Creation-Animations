import * as THREE from "three";

/**
 * Standalone "Human Developer" character (boxes + cylinders).
 * Fully independent of AIAgent — add `human.group` to any scene.
 *
 * Hierarchy (animation-ready joints):
 *   humanGroup
 *     └── hips
 *           ├── torso → neck → head (+ eyes, brows, hair)
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
    handSize: 0.13,
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

  _buildMaterials() {
    const mat = (hex) =>
      new THREE.MeshLambertMaterial({ color: new THREE.Color(hex) });

    this.materials = {
      navy: mat("#191E2D"),
      shirt: mat("#3474A4"),
      skin: mat("#E8AF87"),
      brown: mat("#2F241F"),
    };
  }

  _box(w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
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

    // Neck — thin box connector (matches final blocky look)
    this.neck = new THREE.Group();
    this.neck.name = "neck";
    this.neck.position.set(0, p.torsoHeight * 0.5 + p.neckHeight * 0.5 + p.jointGap, 0);
    const neckMesh = this._box(p.neckWidth, p.neckHeight, p.neckWidth, this.materials.skin);
    neckMesh.name = "neckMesh";
    this.neck.add(neckMesh);
    this.torso.add(this.neck);

    // Head
    this.head = new THREE.Group();
    this.head.name = "head";
    this.head.position.set(0, p.neckHeight * 0.5 + p.headSize * 0.5 + p.jointGap * 0.5, 0);
    const headMesh = this._box(p.headSize, p.headSize, p.headSize * 0.92, this.materials.skin);
    headMesh.name = "headMesh";
    this.head.add(headMesh);

    // Hair cap — dark brown slab on top / back
    const hair = this._box(
      p.headSize * 1.02,
      p.headSize * 0.22,
      p.headSize * 0.95,
      this.materials.brown,
    );
    hair.name = "hair";
    hair.position.set(0, p.headSize * 0.42, -p.headSize * 0.04);
    this.head.add(hair);

    this._addFace(p.headSize);
    this.neck.add(this.head);

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

  _addFace(headSize) {
    const faceZ = headSize * 0.47;
    const eyeX = headSize * 0.16;
    const eyeY = headSize * 0.06;
    // Solid dark cubes — matches final animation look
    const eye = headSize * 0.11;

    const leftEye = this._box(eye, eye, headSize * 0.04, this.materials.brown);
    leftEye.name = "leftEye";
    leftEye.position.set(-eyeX, eyeY, faceZ);
    this.head.add(leftEye);

    const rightEye = this._box(eye, eye, headSize * 0.04, this.materials.brown);
    rightEye.name = "rightEye";
    rightEye.position.set(eyeX, eyeY, faceZ);
    this.head.add(rightEye);

    const browW = eye * 1.35;
    const browH = headSize * 0.045;
    const browY = eyeY + headSize * 0.14;

    const leftBrow = this._box(browW, browH, headSize * 0.04, this.materials.brown);
    leftBrow.name = "leftEyebrow";
    leftBrow.position.set(-eyeX, browY, faceZ);
    this.head.add(leftBrow);

    const rightBrow = this._box(browW, browH, headSize * 0.04, this.materials.brown);
    rightBrow.name = "rightEyebrow";
    rightBrow.position.set(eyeX, browY, faceZ);
    this.head.add(rightBrow);

    // Nose — small skin-tone block sticking out from the face
    const nose = this._box(
      headSize * 0.12,
      headSize * 0.14,
      headSize * 0.12,
      this.materials.skin,
    );
    nose.name = "nose";
    nose.position.set(0, -headSize * 0.04, faceZ + headSize * 0.04);
    this.head.add(nose);

    // Lips — thin dark bar below the nose
    const lips = this._box(
      headSize * 0.22,
      headSize * 0.05,
      headSize * 0.05,
      this.materials.brown,
    );
    lips.name = "lips";
    lips.position.set(0, -headSize * 0.18, faceZ + headSize * 0.01);
    this.head.add(lips);
  }

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
    const handMesh = this._box(p.handSize, p.handSize * 0.9, p.handSize * 0.75, this.materials.skin);
    handMesh.name = `${side}HandMesh`;
    handMesh.position.y = -p.handSize * 0.4;
    hand.add(handMesh);

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
