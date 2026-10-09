import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FaceController } from '../FaceController.js'
import { EXPRESSIONS, speakerExpression, listenerExpression } from '../expressions.js'
import { buildPerformance } from '../performance.js'


/**
 * Standalone "Human" character: a young man seated on the bench.
 * Rounded clothing, an ellipsoid head with a face rig (FaceController), hair
 * cap, mitten hands.
 *
 * Hierarchy (animation-ready joints):
 *   humanGroup
 *     └── hips
 *           ├── torso → neck → head (+ skull, hair, face, ears)
 *           │         ├── leftUpperArm → leftForearm → leftHand
 *           │         └── rightUpperArm → rightForearm → rightHand
 *           ├── leftUpperLeg → leftLowerLeg → leftFoot
 *           └── rightUpperLeg → rightLowerLeg → rightFoot
 *
 * Driving it:
 *   setTimeline(timeline)  once, then update(frame) every frame (pure; any order)
 *   setLine / updateExpression remain for callers of the older per-line API.
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
    this._sit();

    const R = this.params.headSize * 0.5;
    this.faceController = new FaceController(this.head, {
      R,
      skullScale: HumanDeveloper.SKULL_SCALE,
      materials: {
        skin: this.materials.skin,
        eyeWhite: this.materials.eyeWhite,
        iris: this.materials.iris,
        irisInner: this.materials.irisInner,
        pupil: this.materials.pupil,
        glint: this.materials.glint,
        brow: this.materials.hair,
        lip: this.materials.lip,
        mouth: this.materials.mouth,
      },
    });

    this.plan = null;
    // Legacy per-line state (setLine / updateExpression without a timeline)
    this.isSpeaking = false
    this.targetExpression = { ...EXPRESSIONS.NEUTRAL }
    this.speakUntil = 0
  }

  static SKULL_SCALE = [0.9, 1.05, 0.85];

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
    upperArmLength: 0.28,
    forearmLength: 0.36,
    armThickness: 0.13,
    /** Hand span — large enough to read from Z≈4–7 on the bench */
    handSize: 0.15,
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

  // ── Driving ────────────────────────────────────────────────────────────

  /** Builds the frame-pure performance plan from the episode timeline. */
  setTimeline(timeline) {
    this.plan = buildPerformance(timeline, 'human');
  }

  /**
   * Older per-line API: speaker or listener expression for one line. Only used
   * when no timeline has been set.
   */
  setLine(line, isSpeaking, frame) {
    this.isSpeaking = isSpeaking
    const key = isSpeaking ? speakerExpression(line) : listenerExpression(line)
    this.targetExpression = { ...EXPRESSIONS[key] }
    this.speakUntil = frame + (line.speakingFrames ?? 0)
  }

  updateExpression(frame, fps = 30) {
    if (this.plan) return this.update(frame, fps)
    const face = this.faceController
    face.setMouthOpen(this.isSpeaking && frame < this.speakUntil ? Math.abs(Math.sin(frame * 0.6)) * 0.6 : 0)
    face.applyExpression(this.targetExpression)
  }

  /** Applies the whole performance for `frame`. Pure: depends only on frame and timeline. */
  update(frame, fps = 30) {
    if (!this.plan) return
    const st = this.plan.at(frame);
    const P = st.pose;
    const t = frame / fps;
    const e = { ...st.expr };

    let mouth = st.mouthOpen;
    let jaw = 0;
    let headX = P.headX;
    let headY = 0;
    let headZ = P.headZ;
    let torsoX = P.torsoX;
    let shoulderL = P.shoulder;
    let shoulderR = P.shoulder;
    let bounce = 0;
    let jab = 0;

    for (const ev of st.events) {
      const bell = Math.sin(Math.PI * ev.p);
      switch (ev.type) {
        case 'laugh': {
          // Shoulders bounce with each "ha", easing out at the end
          const k = ev.amount * Math.min(1, (1 - ev.p) * 4) * Math.min(1, ev.p * 8);
          const ha = Math.abs(Math.sin(ev.p * ev.dur * 0.42));
          bounce += ha * 0.014 * k;
          mouth = Math.max(mouth, (0.25 + 0.35 * ha) * k);
          headX -= 0.1 * k;
          e.mouthSmile = Math.max(e.mouthSmile, 0.9 * k);
          e.eyeSquint = Math.max(e.eyeSquint, 0.6 * k);
          e.mouthFrown *= 1 - k;
          break;
        }
        case 'tremble':
          e.mouthFrown = Math.min(1, e.mouthFrown + 0.4 * bell);
          jaw += Math.sin(frame * 2.3) * 0.25 * bell;
          headX += 0.03 * bell;
          break;
        case 'breath':
          shoulderL -= 0.022 * bell;
          shoulderR -= 0.022 * bell;
          torsoX += 0.04 * bell;
          break;
        case 'shrug':
          shoulderR += 0.06 * bell;
          headZ -= 0.05 * bell;
          break;
        case 'jab':
          jab = bell;
          break;
        case 'swallow':
          headX += 0.06 * bell;
          e.mouthFrown = Math.min(1, e.mouthFrown + 0.25 * bell);
          break;
        case 'jaw':
          jaw += 0.75 * bell;
          break;
        default:
          break;
      }
    }

    // Talking: small head emphasis that scales with the line's intensity
    if (st.speaking) {
      headX += Math.sin(st.lf * 0.21) * 0.035 * st.talkEnergy;
      headZ += Math.sin(st.lf * 0.13 + 1.2) * 0.03 * st.talkEnergy;
    }
    // Idle life: slow sway that never stops
    headZ += Math.sin(t * 0.9) * 0.012;
    headY += Math.sin(t * 0.6 + 1) * 0.02;

    // The head turns part of the way toward where the eyes look
    headY += st.gaze.x * 0.3;
    headX += -st.gaze.y * 0.24;

    // Breathing
    const breath = Math.sin((t * Math.PI * 2) / 3.6);
    this.torso.scale.set(1 + breath * 0.006, 1 + breath * 0.012, 1 + breath * 0.01);
    this.torso.rotation.set(torsoX + breath * 0.008, 0, P.torsoZ);
    this.torso.position.y = this._torsoBaseY + bounce;
    this.head.rotation.set(headX, headY, headZ);

    // Arms (mirrored: `in` swings toward the body on both sides)
    this.leftUpperArm.position.y = this._shoulderY + shoulderL + breath * 0.004;
    this.rightUpperArm.position.y = this._shoulderY + shoulderR + breath * 0.004;
    this.leftUpperArm.rotation.set(P.luX, 0, P.luIn);
    this.rightUpperArm.rotation.set(P.ruX - jab * 0.3, 0, -P.ruIn);
    this.leftForearm.rotation.set(P.lfX, 0, P.lfIn);
    this.rightForearm.rotation.set(P.rfX + jab * 0.2, 0, -P.rfIn);

    // Face
    const face = this.faceController;
    face.setGaze(st.gaze.x * 0.75, st.gaze.y * 0.8);
    face.setBlink(st.blink);
    face.setMouthOpen(mouth);
    face.setJawShift(jaw);
    face.applyExpression(e);
  }

  // ── Materials (matte) ──────────────────────────────────────────────────

  _buildMaterials() {
    const mat = (hex) =>
      new THREE.MeshLambertMaterial({ color: new THREE.Color(hex) });

    this.materials = {
      navy: mat("#1E2436"),
      shoe: mat("#2B2622"),
      shirt: mat("#3D82BC"),
      shirtDark: mat("#336FA3"),
      skin: mat("#E8AF87"),
      hair: mat("#1A0F00"),
      eyeWhite: mat("#F7F2EA"),
      iris: mat("#6B4423"),
      irisInner: mat("#4A2C14"),
      pupil: mat("#0B0705"),
      glint: new THREE.MeshBasicMaterial({ color: "#FFFFFF" }),
      lip: mat("#C07A68"),
      mouth: mat("#3A1414"),
    };
  }

  _mesh(geometry, material, shadows = true) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    return mesh;
  }

  _rounded(w, h, d, radius, material) {
    return this._mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(radius, w / 2, h / 2, d / 2)), material);
  }

  _sphere(radius, material, wSeg = 20, hSeg = 14) {
    return this._mesh(new THREE.SphereGeometry(radius, wSeg, hSeg), material);
  }

  _capsule(radius, length, material) {
    return this._mesh(new THREE.CapsuleGeometry(radius, Math.max(length, 0.001), 6, 14), material);
  }

  // ── Body ───────────────────────────────────────────────────────────────

  _buildBody() {
    const p = this.params;
    const hipY =
      p.footHeight + p.lowerLegLength + p.upperLegLength + p.hipHeight * 0.5 + p.jointGap * 2;

    this.hips = new THREE.Group();
    this.hips.name = "hips";
    this.hips.position.set(0, hipY, 0);
    const hipMesh = this._rounded(p.hipWidth, p.hipHeight, p.hipDepth, 0.06, this.materials.navy);
    hipMesh.name = "hipsMesh";
    this.hips.add(hipMesh);
    this.humanGroup.add(this.hips);

    // Torso: rounded shirt with a hoodie pocket and a collar that hides the neck seam
    this.torso = new THREE.Group();
    this.torso.name = "torso";
    this._torsoBaseY = p.hipHeight * 0.5 + p.torsoHeight * 0.5 + p.jointGap;
    this.torso.position.set(0, this._torsoBaseY, 0);
    const torsoMesh = this._rounded(p.torsoWidth, p.torsoHeight, p.torsoDepth, 0.09, this.materials.shirt);
    torsoMesh.name = "torsoMesh";
    this.torso.add(torsoMesh);

    const pocket = this._rounded(p.torsoWidth * 0.62, p.torsoHeight * 0.26, 0.03, 0.012, this.materials.shirtDark);
    pocket.name = "pocket";
    pocket.position.set(0, -p.torsoHeight * 0.26, p.torsoDepth * 0.5);
    this.torso.add(pocket);

    const collar = this._mesh(
      new THREE.TorusGeometry(p.neckWidth * 0.72, 0.028, 10, 24),
      this.materials.shirtDark,
    );
    collar.name = "collar";
    collar.rotation.x = Math.PI / 2;
    collar.position.y = p.torsoHeight * 0.5 + 0.005;
    this.torso.add(collar);
    this.hips.add(this.torso);

    this.neck = new THREE.Group();
    this.neck.name = "neck";
    this.neck.position.set(0, p.torsoHeight * 0.5 + p.neckHeight * 0.5 + p.jointGap, 0);
    const neckMesh = this._mesh(
      new THREE.CylinderGeometry(p.neckWidth * 0.55, p.neckWidth * 0.62, p.neckHeight + 0.04, 16),
      this.materials.skin,
    );
    neckMesh.name = "neckMesh";
    neckMesh.position.y = -0.02;
    this.neck.add(neckMesh);
    this.torso.add(this.neck);

    this._buildHead();

    this._shoulderY = p.torsoHeight * 0.32;
    this.leftUpperArm = this._buildArm("left");
    this.rightUpperArm = this._buildArm("right");
    this.leftArm = this.leftUpperArm;
    this.rightArm = this.rightUpperArm;
    this.torso.add(this.leftUpperArm, this.rightUpperArm);

    this.leftUpperLeg = this._buildLeg("left");
    this.rightUpperLeg = this._buildLeg("right");
    this.leftLeg = this.leftUpperLeg;
    this.rightLeg = this.rightUpperLeg;
    this.hips.add(this.leftUpperLeg, this.rightUpperLeg);
  }

  /** Seated on the bench: thighs forward, shins down. */
  _sit() {
    this.leftUpperLeg.rotation.x = -Math.PI / 2;
    this.rightUpperLeg.rotation.x = -Math.PI / 2;
    this.leftLowerLeg.rotation.x = Math.PI / 2.2;
    this.rightLowerLeg.rotation.x = Math.PI / 2.2;
  }

  // ── Head ───────────────────────────────────────────────────────────────

  _buildHead() {
    const p = this.params;
    const R = p.headSize * 0.5;
    const [sx, sy, sz] = HumanDeveloper.SKULL_SCALE;

    this.head = new THREE.Group();
    this.head.name = "head";
    this.head.position.set(0, p.neckHeight * 0.5 + R * sy + p.jointGap * 0.5, 0);

    const skull = this._sphere(R, this.materials.skin, 48, 40);
    skull.name = "headMesh";
    skull.scale.set(sx, sy, sz);
    this.headMesh = skull;
    this.head.add(skull);

    this._addHair(R);

    // Nose
    const nose = this._sphere(R * 0.19, this.materials.skin, 16, 12);
    nose.name = "nose";
    nose.position.set(0, -R * 0.16, R * 0.86);
    nose.scale.set(0.8, 1.05, 1.15);
    this.head.add(nose);

    // Ears
    [-1, 1].forEach((sign) => {
      const ear = this._sphere(R * 0.24, this.materials.skin, 12, 10);
      ear.name = sign < 0 ? "earL" : "earR";
      ear.position.set(sign * R * 0.88, -R * 0.02, -R * 0.05);
      ear.scale.set(0.4, 1.05, 0.65);
      this.head.add(ear);
    });

    this.neck.add(this.head);
  }

  _addHair(R) {
    const [sx, sy, sz] = HumanDeveloper.SKULL_SCALE;
    const hair = this.materials.hair;

    // Cap: a shell that follows the skull, tipped back so the hairline sits
    // high on the forehead and low at the nape.
    const capGeo = new THREE.SphereGeometry(R * 1.06, 48, 24, 0, Math.PI * 2, 0, 1.18);
    // Tip the sphere first, then scale it, so the shell stays exactly 6% outside
    // the ellipsoid skull everywhere (scaling first would let the crown poke through).
    const cap = this._mesh(capGeo, hair);
    cap.material = hair.clone();
    cap.material.side = THREE.DoubleSide;
    cap.name = "hairTop";
    cap.rotation.x = -0.36;
    const capFit = new THREE.Group();
    capFit.scale.set(sx, sy, sz);
    capFit.add(cap);
    this.head.add(capFit);

    // Back: hair mass down to the nape
    const back = this._sphere(R * 0.66, hair, 20, 14);
    back.name = "hairBack";
    back.position.set(0, R * 0.12, -R * 0.42);
    back.scale.set(1.18, 1.1, 0.8);
    this.head.add(back);

    // Fringe: a few soft tufts along the hairline so the edge is not a hard line
    const surface = (az, el, k) => [
      R * sx * k * Math.cos(el) * Math.sin(az),
      R * sy * k * Math.sin(el),
      R * sz * k * Math.cos(el) * Math.cos(az),
    ];
    [-0.62, -0.3, 0, 0.3, 0.62].forEach((az, i) => {
      const tuft = this._sphere(R * 0.2, hair, 12, 8);
      tuft.name = `hairFringe${i}`;
      tuft.position.set(...surface(az, 0.78 + Math.abs(az) * 0.08, 1.0));
      tuft.scale.set(1.25, 0.55, 0.75);
      tuft.rotation.set(-0.5, az, (i - 2) * -0.12);
      this.head.add(tuft);
    });

    // Sideburns, above and in front of the ears
    [-1, 1].forEach((sign) => {
      const burn = this._sphere(R * 0.2, hair, 10, 8);
      burn.name = sign < 0 ? "hairSideL" : "hairSideR";
      burn.position.set(sign * R * 0.8, R * 0.22, -R * 0.12);
      burn.scale.set(0.45, 1.1, 0.9);
      this.head.add(burn);
    });
  }

  // ── Arms ───────────────────────────────────────────────────────────────

  _buildArm(side) {
    const p = this.params;
    const sign = side === "left" ? -1 : 1;
    const shoulderX = (p.torsoWidth * 0.5 + p.armThickness * 0.4) * sign;

    const upperArm = new THREE.Group();
    upperArm.name = `${side}UpperArm`;
    upperArm.position.set(shoulderX, p.torsoHeight * 0.32, 0);

    // Short sleeve, rounded
    const sleeve = this._rounded(
      p.armThickness * 1.12, p.upperArmLength + 0.06, p.armThickness * 1.12, 0.05, this.materials.shirt,
    );
    sleeve.name = `${side}UpperArmMesh`;
    sleeve.position.y = -p.upperArmLength * 0.5 + 0.02;
    upperArm.add(sleeve);

    const forearm = new THREE.Group();
    forearm.name = `${side}Forearm`;
    forearm.position.set(0, -(p.upperArmLength + p.jointGap), 0);
    const r = p.armThickness * 0.42;
    const forearmMesh = this._capsule(r, p.forearmLength - r, this.materials.skin);
    forearmMesh.name = `${side}ForearmMesh`;
    forearmMesh.position.y = -p.forearmLength * 0.5 + r * 0.5;
    forearm.add(forearmMesh);

    // Mitten hand: rounded palm with the fingers as one soft mass, plus a thumb
    const hand = new THREE.Group();
    hand.name = `${side}Hand`;
    hand.position.set(0, -(p.forearmLength + p.jointGap * 0.5), 0);
    const h = p.handSize;
    const palm = this._sphere(h * 0.5, this.materials.skin, 18, 14);
    palm.name = `${side}HandMesh`;
    palm.position.set(0, -h * 0.42, 0);
    palm.scale.set(0.95, 1.2, 0.55);
    hand.add(palm);
    const thumb = this._capsule(h * 0.13, h * 0.3, this.materials.skin);
    thumb.name = `${side}Thumb`;
    thumb.position.set(-sign * h * 0.36, -h * 0.3, h * 0.12);
    thumb.rotation.z = -sign * 0.55;
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
    upperLeg.position.set(p.legSpread * sign, -p.hipHeight * 0.5 + 0.04, 0);

    const thigh = this._rounded(
      p.legThickness, p.upperLegLength + 0.08, p.legThickness * 1.05, 0.06, this.materials.navy,
    );
    thigh.name = `${side}UpperLegMesh`;
    thigh.position.y = -p.upperLegLength * 0.5 + 0.02;
    upperLeg.add(thigh);

    const lowerLeg = new THREE.Group();
    lowerLeg.name = `${side}LowerLeg`;
    lowerLeg.position.set(0, -(p.upperLegLength + p.jointGap), 0);
    const shin = this._rounded(
      p.legThickness * 0.92, p.lowerLegLength + 0.06, p.legThickness * 0.95, 0.06, this.materials.navy,
    );
    shin.name = `${side}LowerLegMesh`;
    shin.position.y = -p.lowerLegLength * 0.5 + 0.02;
    lowerLeg.add(shin);

    const foot = new THREE.Group();
    foot.name = `${side}Foot`;
    foot.position.set(0, -(p.lowerLegLength + p.jointGap), 0);
    const footMesh = this._rounded(p.footWidth, p.footHeight, p.footLength, 0.04, this.materials.shoe);
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
