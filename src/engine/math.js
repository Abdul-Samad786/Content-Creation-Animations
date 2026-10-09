// Small deterministic math helpers. Nothing here reads a clock or Math.random:
// Remotion renders frames out of order and in parallel, so every value must be
// a pure function of the frame number.

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
export const clamp01 = (t) => clamp(t, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const easeInOut = (t) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t) => Math.pow(clamp01(t), 3);

/** Overshoots past 1 and settles: the "boing" curve used for pops. */
export const easeOutBack = (t, s = 1.9) => {
  const x = clamp01(t) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
};

/** Damped spring response to a step at t=0 (t in frames). 0 → 1 with wobble. */
export const springStep = (t, { freq = 0.32, damping = 0.16 } = {}) => {
  if (t <= 0) return 0;
  return 1 - Math.exp(-damping * t) * Math.cos(freq * t);
};

/** Deterministic pseudo-random in [0, 1). */
export const hash = (n) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** Stable numeric seed from a string (character ids, fx types). */
export const seedOf = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};

/** Last item of a frame-sorted event list at or before `frame`, else null. */
export function lastAt(events, frame) {
  let hit = null;
  for (const e of events) {
    if (e.frame <= frame) hit = e;
    else break;
  }
  return hit;
}

/** The event before `lastAt` (for blending from the previous value). */
export function prevOf(events, current) {
  if (!current) return null;
  const i = events.indexOf(current);
  return i > 0 ? events[i - 1] : null;
}
