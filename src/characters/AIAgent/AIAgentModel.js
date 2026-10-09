import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ScreenFaceController } from '../FaceController.js'
import { EXPRESSIONS, speakerExpression, listenerExpression } from '../expressions.js'
import { buildPerformance } from '../performance.js'


/**
 * "Byte" — a floating robot, no legs.
 * Chamfered brick-red torso and head, a recessed chest panel, shoulder nubs
 * with stubby arms, a display face (ScreenFaceController) and a single
 * antenna with a pulsing tip.
 *
 * Hierarchy:
 *   aiAgentGroup            (placed on the ground; Episode sets its yaw)
 *     └── body              (hover bob, tilts, drift)
 *           ├── torso, chestPanel, shoulders, leftArm, rightArm, base, hoverGlow
 *           └── head → bezel, screen (face), antenna → rod, tip
 *
 * Driving it:
 *   setTimeline(timeline)  once, then update(frame) every frame (pure; any order)
 *   setLine / updateExpression remain for callers of the older per-line API.
 */
export class AIAgentModel {
  /** @param {Partial<typeof AIAgentModel.DEFAULT_PARAMS>} [params] */
  constructor(params = {}) {
    this.params = { ...AIAgentModel.DEFAULT_PARAMS, ...params };

    this.aiAgentGroup = new THREE.Group();
    this.aiAgentGroup.name = "aiAgentGroup";
    this.group = this.aiAgentGroup;

    this._buildMaterials();
    this._buildBody();

    this._hoverBaseY = this.body.position.y;

    this.face = new ScreenFaceController(this.screen, {
      colors: { screen: AIAgentModel.COLORS.screen, sclera: AIAgentModel.COLORS.sclera, glow: AIAgentModel.COLORS.teal },
      scale: 0.95,
    });

    this.plan = null;
    // Legacy per-line state (setLine / updateExpression without a timeline)
    this.isSpeaking = false
    this.targetExpression = { ...EXPRESSIONS.NEUTRAL }
    this.speakUntil = 0
  }

  static COLORS = {
    body: "#8B2020",
    panel: "#6B1818",
    accent: "#A02828",
    bezel: "#4E1212",
    screen: "#0A1A1A",
    sclera: "#0A2A2A",
    teal: "#00FFB2",
  };

  static DEFAULT_PARAMS = {
    torsoWidth: 0.66,
    torsoHeight: 0.54,
    torsoDepth: 0.44,
    headWidth: 0.58,
    headHeight: 0.44,
    headDepth: 0.42,
    /** Torso centre height above the group origin (the ground). Clears the bench seat and back. */
    floatHeight: 1.12,
  };

  // ── Driving ────────────────────────────────────────────────────────────

  /** Builds the frame-pure performance plan from the episode timeline. */
  setTimeline(timeline) {
    this.plan = buildPerformance(timeline, 'ai');
  }

  /** Older per-line API. Only used when no timeline has been set. */
  setLine(line, isSpeaking, frame) {
    this.isSpeaking = isSpeaking
    const key = isSpeaking ? speakerExpression(line) : listenerExpression(line)
    this.targetExpression = { ...EXPRESSIONS[key] }
    this.speakUntil = frame + (line.speakingFrames ?? 0)
  }

  updateExpression(frame, fps = 30) {
    if (this.plan) return this.update(frame, fps)
    this.face.setMouthOpen(this.isSpeaking && frame < this.speakUntil ? Math.abs(Math.sin(frame * 0.6)) * 0.6 : 0)
    this.face.applyExpression(this.targetExpression)
  }

  /** Applies the whole performance for `frame`. Pure: depends only on frame and timeline. */
  update(frame, fps = 30) {
    if (!this.plan) return
    const st = this.plan.at(frame);
    const P = st.pose;
    const t = frame / fps;
    const e = { ...st.expr };

    let nod = 0;
    let antBob = 0;
    let asym = 0;
    for (const ev of st.events) {
      const bell = Math.sin(Math.PI * ev.p);
      if (ev.type === 'nod') nod += 0.2 * bell;
      if (ev.type === 'antennaBob') antBob += bell;
      if (ev.type === 'asym') asym = Math.min(1, ev.p * 6);
    }

    // Hover: always bobbing, less when the script asks for stillness
    const phase = (t * Math.PI * 2) / 2.6;
    const bob = Math.sin(phase) * 0.035 * P.bob;
    this.body.position.set(-P.drift, this._hoverBaseY + bob, 0);

    // Talking: a little bounce and sway, scaled by intensity
    const talk = st.talkEnergy;
    const talkSway = Math.sin(st.lf * 0.17) * 0.035 * talk;
    const talkNod = Math.abs(Math.sin(st.lf * 0.23)) * 0.035 * talk;

    // Toward Human is -x for Byte, so its yaw goes negative
    this.body.rotation.set(
      P.tiltX + nod + talkNod + Math.sin(phase + 0.6) * 0.01,
      -(P.yaw + st.gaze.x * 0.12),
      -P.tiltZ + talkSway * 0.5 + Math.sin(phase * 0.5) * 0.012,
    );
    this.head.rotation.set(talkNod * 0.5, 0, P.headTilt + talkSway);

    // Arms trail the hover slightly and gesture a little while talking
    const lag = Math.sin(phase - 0.9);
    this.leftArm.rotation.set(-talk * 0.25 * Math.max(Math.sin(st.lf * 0.15), 0), 0, -0.3 - lag * 0.08);
    this.rightArm.rotation.set(-talk * 0.25 * Math.max(Math.sin(st.lf * 0.15 + 2), 0), 0, 0.3 + lag * 0.08);

    // Antenna: droop / rise from the script, a beat bob, and a gently pulsing tip
    this.antenna.rotation.x = P.antTilt * 0.85 - antBob * 0.3;
    this.antenna.scale.y = P.antLift;
    const pulse = 1 + 0.075 * (1 + Math.sin(frame / 10)); // 1.0 → 1.15 → 1.0, ~60 frames
    // The antenna group stretches in y; undo that on the tip so it stays round
    this.antennaTip.scale.set(pulse, pulse / P.antLift, pulse);
    this.antennaHalo.scale.set(pulse, pulse / P.antLift, pulse);
    this.antennaHalo.material.opacity = (0.18 + 0.8 * (pulse - 1)) * P.brightness;
    this.hoverGlow.material.opacity = 0.16 + 0.08 * Math.sin(phase + Math.PI) * P.bob;

    // Face: gaze mirrored (toward Human is screen-left)
    const face = this.face;
    face.setGaze(-st.gaze.x * 0.9, st.gaze.y);
    face.setBlink(st.blink);
    face.setMouthOpen(st.mouthOpen);
    face.setAsymmetry(asym);
    face.setBrightness(P.brightness);
    face.applyExpression(e);
  }

  // ── Build ──────────────────────────────────────────────────────────────

  _buildMaterials() {
    const C = AIAgentModel.COLORS;
    const std = (hex, extra = {}) =>
      new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.55, metalness: 0.08, ...extra });
    const glow = (hex, opacity) =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(hex), transparent: opacity < 1, opacity, depthWrite: opacity >= 1,
      });

    this.materials = {
      body: std(C.body),
      panel: std(C.panel, { roughness: 0.7 }),
      accent: std(C.accent),
      bezel: std(C.bezel, { roughness: 0.6 }),
      screen: std(C.screen, { roughness: 0.3, metalness: 0.2 }),
      teal: glow(C.teal, 1),
      tealHalo: glow(C.teal, 0.25),
      hover: glow(C.teal, 0.2),
    };
  }

  _rounded(w, h, d, radius, material) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 5, radius), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _mesh(geo, material, shadows = true) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    return mesh;
  }

  _buildBody() {
    const p = this.params;
    const m = this.materials;

    this.body = new THREE.Group();
    this.body.name = "body";
    this.body.position.set(0, p.floatHeight, 0);

    // Torso: chamfered box
    const torso = this._rounded(p.torsoWidth, p.torsoHeight, p.torsoDepth, 0.1, m.body);
    torso.name = "torso";
    this.body.add(torso);

    // Chest panel: darker inset with a lighter rim and a small status light
    const rim = this._rounded(p.torsoWidth * 0.6, p.torsoHeight * 0.5, 0.03, 0.03, m.accent);
    rim.name = "chestRim";
    rim.position.set(0, -0.03, p.torsoDepth * 0.5 - 0.006);
    const panel = this._rounded(p.torsoWidth * 0.52, p.torsoHeight * 0.4, 0.03, 0.025, m.panel);
    panel.name = "chestPanel";
    panel.position.set(0, -0.03, p.torsoDepth * 0.5 - 0.001);
    const light = this._mesh(new THREE.CircleGeometry(0.018, 20), m.teal, false);
    light.name = "statusLight";
    light.position.set(p.torsoWidth * 0.17, 0.02, p.torsoDepth * 0.5 + 0.0151);
    this.body.add(rim, panel, light);

    // Shoulder nubs and stubby arms with rounded end caps
    const nubGeo = new THREE.SphereGeometry(0.085, 24, 16);
    this.shoulders = [];
    for (const sign of [-1, 1]) {
      const side = sign < 0 ? "left" : "right";
      const nub = this._mesh(nubGeo, m.accent);
      nub.name = `${side}Shoulder`;
      nub.position.set(sign * (p.torsoWidth * 0.5 - 0.01), p.torsoHeight * 0.3, 0);
      nub.scale.set(1, 0.85, 1);
      this.body.add(nub);
      this.shoulders.push(nub);

      const arm = new THREE.Group();
      arm.name = `${side}Arm`;
      arm.position.copy(nub.position);
      const limb = this._mesh(new THREE.CapsuleGeometry(0.052, 0.14, 8, 16), m.body);
      limb.position.y = -0.12;
      const cap = this._mesh(new THREE.SphereGeometry(0.066, 20, 14), m.accent);
      cap.position.y = -0.22;
      arm.add(limb, cap);
      this.body.add(arm);
      if (sign < 0) this.leftArm = arm;
      else this.rightArm = arm;
    }

    // Hover base and glow (no legs)
    const base = this._mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.05, 28), m.bezel);
    base.name = "hoverBase";
    base.position.y = -p.torsoHeight * 0.5 - 0.02;
    this.body.add(base);
    this.hoverGlow = this._mesh(new THREE.CircleGeometry(0.2, 32), m.hover.clone(), false);
    this.hoverGlow.name = "hoverGlow";
    this.hoverGlow.rotation.x = -Math.PI / 2;
    this.hoverGlow.position.y = -p.torsoHeight * 0.5 - 0.06;
    this.body.add(this.hoverGlow);

    // Neck
    const neck = this._mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.07, 24), m.bezel);
    neck.name = "neck";
    neck.position.y = p.torsoHeight * 0.5 + 0.025;
    this.body.add(neck);

    this._buildHead();
    this.aiAgentGroup.add(this.body);
  }

  _buildHead() {
    const p = this.params;
    const m = this.materials;

    this.head = new THREE.Group();
    this.head.name = "head";
    this.head.position.y = p.torsoHeight * 0.5 + 0.05 + p.headHeight * 0.5;

    const shell = this._rounded(p.headWidth, p.headHeight, p.headDepth, 0.1, m.body);
    shell.name = "headShell";
    this.head.add(shell);

    // Bezel then screen, so the display reads as set into the head
    const front = p.headDepth * 0.5;
    const bezel = this._rounded(p.headWidth * 0.86, p.headHeight * 0.76, 0.03, 0.06, m.bezel);
    bezel.name = "bezel";
    bezel.position.z = front - 0.008;
    this.head.add(bezel);

    const sw = p.headWidth * 0.78;
    const sh = p.headHeight * 0.66;
    const shape = new THREE.Shape();
    const r = 0.05;
    shape.moveTo(-sw / 2 + r, -sh / 2);
    shape.lineTo(sw / 2 - r, -sh / 2);
    shape.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + r);
    shape.lineTo(sw / 2, sh / 2 - r);
    shape.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - r, sh / 2);
    shape.lineTo(-sw / 2 + r, sh / 2);
    shape.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - r);
    shape.lineTo(-sw / 2, -sh / 2 + r);
    shape.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + r, -sh / 2);
    const screenMesh = this._mesh(new THREE.ShapeGeometry(shape, 8), m.screen, false);
    screenMesh.name = "screenPanel";

    this.screen = new THREE.Group();
    this.screen.name = "screen";
    this.screen.position.set(0, 0, front + 0.009);
    this.screen.add(screenMesh);
    this.head.add(this.screen);

    // Antenna: collar, thin rod, teal tip with a soft halo
    this.antenna = new THREE.Group();
    this.antenna.name = "antenna";
    this.antenna.position.y = p.headHeight * 0.5 - 0.01;
    const collar = this._mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.035, 20), m.accent);
    collar.position.y = 0.012;
    const rod = this._mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.2, 12), m.bezel);
    rod.name = "antennaRod";
    rod.position.y = 0.12;
    this.antennaTip = this._mesh(new THREE.SphereGeometry(0.042, 20, 14), m.teal, false);
    this.antennaTip.name = "antennaTip";
    this.antennaTip.position.y = 0.24;
    this.antennaHalo = this._mesh(new THREE.SphereGeometry(0.075, 20, 14), m.tealHalo.clone(), false);
    this.antennaHalo.position.y = 0.24;
    this.antenna.add(collar, rod, this.antennaTip, this.antennaHalo);
    this.head.add(this.antenna);

    this.body.add(this.head);
  }

  // ── Animation helpers ─────────────────────────────────────────────────

  /** Gentle float bob — call each frame with elapsed seconds. */
  idleHover(timeSeconds, amount = 0.06, speed = 2) {
    this.body.position.y = this._hoverBaseY + Math.sin(timeSeconds * speed) * amount;
  }

  setPosition(x, y, z) {
    this.aiAgentGroup.position.set(x, y, z);
  }

  setRotation(yRadians) {
    this.aiAgentGroup.rotation.y = yRadians;
  }

  dispose() {
    this.aiAgentGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
    });
  }
}

export default AIAgentModel;
