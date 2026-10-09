// One-shot body animations a script can trigger with `"do": "<name>"`.
//
// Each gesture is a pure function of `t`, the frames since it started, and
// returns offsets that are added on top of the character's pose:
//   x, y, z        world offset (units)
//   rx, ry, rz     body rotation (radians; rx > 0 leans forward)
//   squash         vertical stretch (+) / squash (−); width compensates
//   scale          uniform scale multiplier (default 1)
//   headPitch, headYaw, headRoll
//   freeze         0..1, damps idle motion and blinking (comic "stiffen")
//   typing         0..1, thumbs tap on the phone
//   toward         0..1, scoot toward the other character

import { clamp01, easeInOut, easeOut, easeOutBack } from "../math";

const decay = (t, dur) => Math.max(0, 1 - t / dur);

export const GESTURES = {
  bounce: {
    dur: 22,
    fn: (t) => {
      const hop = Math.abs(Math.sin((Math.PI * t) / 11));
      return { y: 0.09 * hop * decay(t, 22), squash: 0.08 * (hop - 0.5) * decay(t, 22) };
    },
  },
  jump: {
    dur: 28,
    fn: (t) => {
      if (t < 5) return { squash: -0.14 * Math.sin((Math.PI * t) / 10), y: -0.02 * (t / 5) };
      if (t < 19) {
        const u = (t - 5) / 14;
        return { y: 0.42 * Math.sin(Math.PI * u), squash: 0.14 * (1 - u) - 0.04, headPitch: -0.15 * Math.sin(Math.PI * u) };
      }
      const u = (t - 19) / 9;
      return { squash: -0.16 * Math.sin(Math.PI * u) * (1 - u * 0.5) };
    },
  },
  gasp: {
    dur: 18,
    fn: (t) => {
      const kick = Math.sin(Math.PI * clamp01(t / 7));
      const settle = decay(t, 18);
      return { y: 0.05 * kick, rx: -0.16 * settle, squash: 0.12 * kick * settle, headPitch: -0.14 * settle };
    },
  },
  shake: {
    dur: 26,
    fn: (t) => ({
      x: 0.035 * Math.sin(t * 2.4) * decay(t, 26),
      rz: 0.07 * Math.sin(t * 2.4 + 1) * decay(t, 26),
      headRoll: 0.08 * Math.sin(t * 2.1) * decay(t, 26),
    }),
  },
  shiver: {
    dur: 54,
    fn: (t) => ({
      x: 0.009 * Math.sin(t * 3.3) * Math.min(1, decay(t, 54) * 4),
      squash: 0.012 * Math.sin(t * 4.1),
      headRoll: 0.03 * Math.sin(t * 2.7),
    }),
  },
  nod: {
    dur: 24,
    fn: (t) => ({ headPitch: 0.22 * Math.sin((Math.PI * t) / 12) * (t < 24 ? 1 : 0), y: -0.01 * Math.sin((Math.PI * t) / 12) }),
  },
  headshake: {
    dur: 26,
    fn: (t) => ({ headYaw: 0.32 * Math.sin(t * 0.75) * decay(t, 26) }),
  },
  wiggle: {
    dur: 46,
    fn: (t) => {
      const env = Math.min(1, t / 6) * Math.min(1, decay(t, 46) * 5);
      return {
        rz: 0.1 * Math.sin(t * 0.36) * env,
        y: 0.03 * Math.abs(Math.sin(t * 0.36)) * env,
        headRoll: -0.12 * Math.sin(t * 0.36) * env,
      };
    },
  },
  spin: {
    dur: 26,
    fn: (t) => ({ ry: Math.PI * 2 * easeInOut(t / 26), y: 0.14 * Math.sin((Math.PI * t) / 26), squash: 0.06 * Math.sin((Math.PI * t) / 13) }),
  },
  "pop-in": {
    dur: 22,
    fn: (t) => ({ scale: Math.max(0.001, easeOutBack(t / 15, 2.4)), y: -0.45 * (1 - easeOut(t / 12)), squash: 0.12 * Math.sin((Math.PI * clamp01(t / 18)) * 2) * decay(t, 22) }),
  },
  zoom: {
    dur: 44,
    fn: (t) => {
      const go = t < 10 ? easeOut(t / 10) : t > 34 ? 1 - easeInOut((t - 34) / 10) : 1;
      return { toward: go, rx: 0.12 * go, squash: 0.05 * Math.sin((Math.PI * clamp01(t / 10))) };
    },
  },
  freeze: {
    dur: 46,
    fn: (t) => {
      const jolt = t < 6 ? Math.sin((Math.PI * t) / 6) : 0;
      return { freeze: t > 40 ? 1 - (t - 40) / 6 : 1, y: 0.02 * jolt, squash: 0.06 * jolt };
    },
  },
  type: {
    dur: 42,
    fn: (t) => ({ typing: Math.min(1, t / 4) * Math.min(1, decay(t, 42) * 6) }),
  },
};

export const GESTURE_NAMES = Object.keys(GESTURES);

/** Sum of every active gesture's offsets at `frame`. */
export function gestureOffsets(events, frame) {
  const out = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, squash: 0, scale: 1, headPitch: 0, headYaw: 0, headRoll: 0, freeze: 0, typing: 0, toward: 0 };
  for (const e of events) {
    if (e.frame > frame) break;
    const g = GESTURES[e.name];
    const t = frame - e.frame;
    if (t >= g.dur) continue;
    const o = g.fn(t);
    for (const k of Object.keys(o)) {
      if (k === "scale") out.scale *= o.scale;
      else if (k === "freeze" || k === "typing" || k === "toward") out[k] = Math.max(out[k], o[k]);
      else out[k] += o[k];
    }
  }
  return out;
}
