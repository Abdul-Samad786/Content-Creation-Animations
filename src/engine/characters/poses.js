// Held body poses a script can set with `"pose": "<name>"` (or a `"do"` word
// that is not a gesture). A pose holds until the next pose; changes blend.
//
// Girl joints (radians unless noted):
//   lean     torso tilt forward (+)        lie   0..1 lying back on the bed
//   yaw      torso turn toward +x (+)      headPitch  head down (+)
//   lFwd/rFwd   arm raised forward         lOut/rOut  arm raised outward
//   lElbow/rElbow  forearm bend forward    thigh / knee  leg angles
// Robot joints:
//   y, rx, rz   body offset / tilt         droop 0..1 antenna and body sag
//   lHand/rHand [x, y, z] hand offsets from the body centre

const GIRL_LEGS = { thigh: Math.PI / 2, knee: -Math.PI / 2 + 0.15 };

export const GIRL_POSES = {
  sit: { lean: 0.04, lie: 0, yaw: 0, headPitch: 0, lFwd: 0.55, lOut: 0.18, lElbow: 0.85, rFwd: 0.55, rOut: 0.18, rElbow: 0.85, ...GIRL_LEGS },
  phone: { lean: 0.08, lie: 0, yaw: 0, headPitch: 0.05, lFwd: 0.85, lOut: -0.12, lElbow: 1.25, rFwd: 0.85, rOut: -0.12, rElbow: 1.25, ...GIRL_LEGS },
  lean: { lean: 0.24, lie: 0, yaw: 0.05, headPitch: 0.1, lFwd: 1.0, lOut: -0.12, lElbow: 1.2, rFwd: 1.0, rOut: -0.12, rElbow: 1.2, ...GIRL_LEGS },
  cheer: { lean: -0.05, lie: 0, yaw: 0, headPitch: -0.12, lFwd: 0.35, lOut: 2.55, lElbow: 0.25, rFwd: 0.35, rOut: 2.55, rElbow: 0.25, ...GIRL_LEGS, thigh: Math.PI / 2 + 0.15 },
  cheeks: { lean: 0.06, lie: 0, yaw: 0, headPitch: -0.05, lFwd: 1.05, lOut: 0.42, lElbow: 2.3, rFwd: 1.05, rOut: 0.42, rElbow: 2.3, ...GIRL_LEGS },
  flop: { lean: 0, lie: 1, yaw: 0, headPitch: -0.1, lFwd: 0.2, lOut: 1.35, lElbow: 0.3, rFwd: 0.2, rOut: 1.35, rElbow: 0.3, thigh: Math.PI / 2 + 0.35, knee: -Math.PI / 2 + 0.6 },
  slump: { lean: 0.3, lie: 0, yaw: 0, headPitch: 0.3, lFwd: 0.25, lOut: 0.06, lElbow: 0.35, rFwd: 0.25, rOut: 0.06, rElbow: 0.35, ...GIRL_LEGS },
  grab: { lean: 0.26, lie: 0, yaw: 0.45, headPitch: 0, lFwd: 1.45, lOut: -0.05, lElbow: 0.3, rFwd: 1.45, rOut: -0.05, rElbow: 0.3, ...GIRL_LEGS },
};

export const ROBOT_POSES = {
  hover: { y: 0, rx: 0, rz: 0, droop: 0, lHand: [-0.4, -0.1, 0.06], rHand: [0.4, -0.1, 0.06] },
  lean: { y: -0.05, rx: 0.24, rz: 0, droop: 0, lHand: [-0.3, -0.06, 0.26], rHand: [0.3, -0.06, 0.26] },
  droop: { y: -0.2, rx: 0.22, rz: 0.08, droop: 1, lHand: [-0.38, -0.22, 0.02], rHand: [0.38, -0.22, 0.02] },
  hide: { y: -0.42, rx: 0.1, rz: 0, droop: 0.4, lHand: [-0.12, 0.04, 0.3], rHand: [0.12, 0.04, 0.3] },
  proud: { y: 0.05, rx: -0.1, rz: 0, droop: 0, lHand: [-0.36, -0.16, 0.1], rHand: [0.36, -0.16, 0.1] },
  cheer: { y: 0.06, rx: -0.08, rz: 0, droop: 0, lHand: [-0.42, 0.3, 0.05], rHand: [0.42, 0.3, 0.05] },
};

export const MODEL_POSES = { girl: GIRL_POSES, robot: ROBOT_POSES };
export const DEFAULT_POSE = { girl: "sit", robot: "hover" };

/** Linear blend of two pose objects (numbers and [x,y,z] arrays). */
export function blendPose(a, b, t) {
  const out = {};
  for (const k of Object.keys(b)) {
    const va = a[k] ?? b[k];
    const vb = b[k];
    out[k] = Array.isArray(vb) ? vb.map((v, i) => va[i] + (v - va[i]) * t) : va + (vb - va) * t;
  }
  return out;
}
