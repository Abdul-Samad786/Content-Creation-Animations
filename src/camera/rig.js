// Vertical-native camera rig for the 1080x1920 composition.
//
// Layout (screen, top to bottom):
//   top 120px      — platform UI, nothing drawn
//   caption band   — CAPTION_BAND (captions and text cards only)
//   middle         — faces; overlay lines lower the faces to make room above
//   bottom 200px   — platform UI, no captions
//
// Every line gets a shot. Unmarked lines are a two-shot that favours the
// speaker, so the listener's reaction is always on screen; lines whose
// visualNote asks for a framing get that shot. Within a line the camera drifts
// slowly toward the speaker; between lines of the same shot it re-frames over
// a short ease instead of cutting.
//
// Everything here is a pure function of the frame number. No clocks, no
// Math.random, no physics, so every render produces identical frames.

import { wordWindows, normalizeWord } from "../subtitles/captionTiming";

// ── World layout ─────────────────────────────────────────────────────────────
export const HUMAN_POSITION = [-0.55, -0.45, 0.2];
/** Byte's group sits on the ground; its body hovers clear of the bench seat and back. */
export const AI_POSITION = [0.6, 0, 0.38];
export const BYTE_BASE_YAW = -0.2;

/** Face centres in world space. */
export const ANCHORS = {
  human: [-0.55, 1.8, 0.32],
  byte: [0.6, 1.68, 0.6],
  pair: [0.02, 1.74, 0.45],
};

/** Topmost points of each character in world space (hair and antenna tips). */
export const HEAD_TOP = {
  human: [-0.55, 2.07, 0.2],
  byte: [0.6, 2.18, 0.38],
};

// ── Frame geometry ───────────────────────────────────────────────────────────
export const FRAME_WIDTH = 1080;
export const FRAME_HEIGHT = 1920;
/** Platform UI zones: no captions inside these. */
export const SAFE_TOP_PX = 120;
export const SAFE_BOTTOM_PX = 200;
/** Fixed caption band: captions and text cards live here, max 3 lines. */
export const CAPTION_BAND = { top: 160, bottom: 470 };

const tanHalf = (fov) => Math.tan((fov * Math.PI) / 360);

/**
 * Level camera looking down -Z at `anchor`, with the anchor placed at
 * screen height `ndc` (+1 top, -1 bottom) at `distance` units away.
 */
export function frameOn(anchor, ndc, distance, fov) {
  const y = anchor[1] - ndc * distance * tanHalf(fov);
  return {
    position: [anchor[0], y, anchor[2] + distance],
    target: [anchor[0], y, anchor[2]],
    fov,
  };
}

/** Default two-shot. */
export const STACKED_POSE = frameOn(ANCHORS.pair, 0, 4.7, 40);

// ── Easing and interpolation ─────────────────────────────────────────────────
const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
export const easeInOut = (t) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const lerpVec = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function lerpPose(a, b, t) {
  return {
    position: lerpVec(a.position, b.position, t),
    target: lerpVec(a.target, b.target, t),
    fov: lerp(a.fov, b.fov, t),
  };
}

// ── Projection ───────────────────────────────────────────────────────────────

/**
 * Screen position in pixels (origin top-left) of a world point seen through `pose`.
 * Returns null if the point is behind the camera.
 */
export function projectPx(point, pose) {
  const [px, py, pz] = pose.position;
  const [tx, ty, tz] = pose.target;

  let f = [tx - px, ty - py, tz - pz];
  const fl = Math.hypot(f[0], f[1], f[2]);
  f = f.map((v) => v / fl);

  // right = forward × world up, camera up = right × forward
  let r = [-f[2], 0, f[0]];
  const rl = Math.hypot(r[0], r[1], r[2]);
  r = r.map((v) => v / rl);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];

  const d = [point[0] - px, point[1] - py, point[2] - pz];
  const zc = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  if (zc <= 0) return null;
  const xc = d[0] * r[0] + d[1] * r[1] + d[2] * r[2];
  const yc = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];

  const t = tanHalf(pose.fov);
  const ndcX = xc / (zc * t * (FRAME_WIDTH / FRAME_HEIGHT));
  const ndcY = yc / (zc * t);
  return {
    x: ((ndcX + 1) / 2) * FRAME_WIDTH,
    y: ((1 - ndcY) / 2) * FRAME_HEIGHT,
  };
}

// ── Shared camera motion ─────────────────────────────────────────────────────

/** Hand-held shake that decays over ~1s from the start of a line. Deterministic. */
export function shakeOffset(frame, lineLf) {
  const amp = 0.05 * Math.max(0, 1 - lineLf / 30);
  return [
    Math.sin(frame * 2.9) * amp + Math.sin(frame * 5.3) * amp * 0.5,
    Math.cos(frame * 3.7) * amp * 0.6,
    0,
  ];
}

export const isHighIntensity = (line) => /high/i.test(line?.intensity || "");

const speakerAnchor = (line) => (line?.speaker === "ai" ? ANCHORS.byte : ANCHORS.human);
const otherAnchor = (line) => (line?.speaker === "ai" ? ANCHORS.human : ANCHORS.byte);

/** Line progress 0..1 across its spoken part (the pause after holds at 1). */
const speechProgress = (line, lf) => clamp01(lf / Math.max(line.speakingFrames || line.endFrame - line.startFrame, 1));

/**
 * Move a pose toward a world point: dolly the camera `amount` units along the
 * line to the point and pan the target a quarter of that.
 */
function driftToward(pose, point, amount) {
  const d = [point[0] - pose.position[0], point[1] - pose.position[1], point[2] - pose.position[2]];
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  const step = d.map((v) => (v / len) * amount);
  return {
    ...pose,
    position: [pose.position[0] + step[0], pose.position[1] + step[1] * 0.3, pose.position[2] + step[2]],
    target: [pose.target[0] + step[0] * 0.25, pose.target[1], pose.target[2]],
  };
}

const offset = (pose, [dx, dy, dz]) => ({
  ...pose,
  position: [pose.position[0] + dx, pose.position[1] + dy, pose.position[2] + dz],
  target: [pose.target[0] + dx, pose.target[1] + dy, pose.target[2]],
});

/** Lines with an overlay in the middle of the frame: faces drop to make room above them. */
const OVERLAY_ROOM_LINES = new Set([19, 24]);

// ── Shots ────────────────────────────────────────────────────────────────────
// pose(line, lf, frame) returns the camera for frame `lf` of `line`.
// `blendFrames` is the ease in frames from the previous line's last pose when
// the previous line used the same shot family; 0 means a cut.

export const SHOTS = {
  // Two-shot favouring the speaker: both faces fully readable, speaker nearer
  // centre. Drifts 0.25 units toward the speaker across the line.
  TWO: {
    family: "two",
    blendFrames: 16,
    pose: (line, lf) => {
      const s = speakerAnchor(line);
      const o = otherAnchor(line);
      const roomy = OVERLAY_ROOM_LINES.has(line.lineId);
      const anchor = [lerp(s[0], o[0], 0.4), (s[1] + o[1]) / 2, ANCHORS.pair[2]];
      const base = frameOn(anchor, roomy ? -0.3 : 0.02, roomy ? 5.0 : 4.7, 40);
      return driftToward(base, s, 0.25 * easeInOut(speechProgress(line, lf)));
    },
  },

  // Single on Human, Byte fully out of frame. Line 1 pushes in slowly.
  HUMAN_SINGLE: {
    family: "single",
    blendFrames: 0,
    pose: (line, lf) => {
      const push = easeInOut(speechProgress(line, lf));
      const look = [ANCHORS.human[0] + 0.08, ANCHORS.human[1], ANCHORS.human[2]];
      return frameOn(look, -0.02, 3.4 - 0.6 * push, 34);
    },
  },

  // Line 17's wide two-shot: both small, then a slow push so faces stay readable.
  WIDE_TWO_SHOT: {
    family: "wide",
    blendFrames: 0,
    pose: (line, lf) => {
      const push = easeInOut(clamp01(lf / Math.max(line.endFrame - line.startFrame, 1)));
      return frameOn(ANCHORS.pair, -0.05, 6.4 - 1.5 * push, 40);
    },
  },

  // Snaps in tight on Human, then shakes and decays over ~1s. Hard cut.
  SNAP_HUMAN: {
    family: "snap",
    blendFrames: 0,
    pose: (line, lf, frame) => {
      const base = frameOn(ANCHORS.human, -0.02, 2.5, 30);
      const [dx, dy] = shakeOffset(frame, lf);
      return offset(base, [dx, dy, 0]);
    },
  },

  // Completely still on Human through the silence beat (line 16). No drift.
  HOLD_HUMAN: {
    family: "hold",
    blendFrames: 0,
    still: true,
    pose: () => frameOn(ANCHORS.human, -0.02, 2.5, 30),
  },

  // Final beat: from a two-shot favouring Byte, push in to a Byte single as it
  // turns to camera. The push ends with the spoken line; the hold is still.
  FINAL_BYTE: {
    family: "two",
    blendFrames: 16,
    still: true,
    pose: (line, lf) => {
      const push = easeInOut(speechProgress(line, lf));
      const s = ANCHORS.byte;
      const start = [lerp(s[0], ANCHORS.human[0], 0.4), (s[1] + ANCHORS.human[1]) / 2, ANCHORS.pair[2]];
      const anchor = lerpVec(start, [s[0], s[1], s[2]], push);
      return frameOn(anchor, lerp(0.02, -0.02, push), lerp(4.7, 2.7, push), lerp(40, 36, push));
    },
  },
};

/**
 * Ordered rules: the first match on a line's visualNote picks its shot.
 * Anything that matches no rule (including "none") is a speaker-favouring two-shot.
 */
const VISUAL_RULES = [
  [/turns to camera/, "FINAL_BYTE"],
  [/snaps in/, "SNAP_HUMAN"],
  [/hold on human/, "HOLD_HUMAN"],
  [/wide two-shot/, "WIDE_TWO_SHOT"],
  [/push-in on human|on human's face/, "HUMAN_SINGLE"],
];

/** Shot name for a timeline entry. */
export function shotForLine(entry) {
  const note = (entry?.visualNote || "").toLowerCase();
  for (const [pattern, shot] of VISUAL_RULES) {
    if (pattern.test(note)) return shot;
  }
  return "TWO";
}

/** Kept for callers that only have a note. */
export function shotForVisualNote(note) {
  return shotForLine({ visualNote: note });
}

// ── Timeline → per-frame state ───────────────────────────────────────────────

/** Consecutive lines that share a shot, as segments. */
export function buildBeatSegments(timeline) {
  const segments = [];
  for (const entry of timeline) {
    const shot = shotForLine(entry);
    const last = segments[segments.length - 1];
    if (last && last.beat === shot) {
      last.lines.push(entry.lineId);
    } else {
      segments.push({ beat: shot, startFrame: entry.startFrame, lines: [entry.lineId] });
    }
  }
  const end = timeline.length ? timeline[timeline.length - 1].endFrame : 0;
  segments.forEach((seg, i) => {
    seg.endFrame = i + 1 < segments.length ? segments[i + 1].startFrame : end;
  });
  return segments;
}

/**
 * Everything the overlays and camera need to know about `frame`.
 * The active line includes its trailing pause; past the end, the last line holds.
 */
export function beatStateAt(frame, timeline, segments, fps = 30) {
  let lineIndex = -1;
  timeline.forEach((entry, i) => {
    if (entry.startFrame <= frame) lineIndex = i;
  });
  const line = lineIndex >= 0 ? timeline[lineIndex] : null;
  const prevLine = lineIndex > 0 ? timeline[lineIndex - 1] : null;

  let segIndex = -1;
  segments.forEach((seg, i) => {
    if (seg.startFrame <= frame) segIndex = i;
  });
  const seg = segIndex >= 0 ? segments[segIndex] : null;
  const lf = seg ? frame - seg.startFrame : 0;
  const segLen = seg ? Math.max(seg.endFrame - seg.startFrame, 1) : 1;

  return {
    frame,
    fps,
    line,
    lineLf: line ? frame - line.startFrame : 0,
    prevLine,
    segIndex,
    seg,
    beat: line ? shotForLine(line) : null,
    lf,
    segT: clamp01(lf / segLen),
  };
}

/** A line's pose at line-frame `lf`, with breathing and the high-intensity punch-in. */
function linePose(line, lf, frame) {
  const shot = SHOTS[shotForLine(line)];
  let pose = shot.pose(line, lf, frame);

  // Emotional peak: fast push toward the speaker plus a decaying shake
  if (isHighIntensity(line) && shotForLine(line) !== "SNAP_HUMAN") {
    pose = driftToward(pose, speakerAnchor(line), 0.6 * easeOut(lf / 8));
    const [dx, dy] = shakeOffset(frame, lf);
    pose = offset(pose, [dx * 0.6, dy * 0.6, 0]);
  }

  // Breathing: a slow, tiny float so no shot is ever dead still. Holds stay locked.
  if (!shot.still) {
    pose = offset(pose, [Math.sin(frame * 0.021) * 0.012, Math.sin(frame * 0.017 + 1) * 0.008, 0]);
  }
  return pose;
}

/**
 * Camera pose for `frame`. Within one shot family the camera eases from the
 * previous line's final framing to this line's; across families it cuts.
 */
export function cameraPoseAt(frame, timeline, segments, fps = 30) {
  const state = beatStateAt(frame, timeline, segments, fps);
  const line = state.line;
  if (!line) return STACKED_POSE;

  const current = linePose(line, state.lineLf, frame);
  const prev = state.prevLine;
  if (!prev) return current;

  const shot = SHOTS[shotForLine(line)];
  const prevShot = SHOTS[shotForLine(prev)];
  if (shot.blendFrames === 0 || prevShot.family !== shot.family || state.lineLf >= shot.blendFrames) {
    return current;
  }
  const from = linePose(prev, prev.endFrame - prev.startFrame - 1, line.startFrame - 1);
  return lerpPose(from, current, easeInOut(state.lineLf / shot.blendFrames));
}

/** Frame offset of a spoken word in a line, or null. */
function wordLf(line, word) {
  const hit = wordWindows(line).find((w) => normalizeWord(w.word) === word);
  return hit ? hit.start : null;
}

/** Byte turns to face camera on "you" in the final line. */
export function byteYawAt(state) {
  if (state.beat !== "FINAL_BYTE" || !state.line) return BYTE_BASE_YAW;
  const turnAt = wordLf(state.line, "you") ?? Math.round(state.line.speakingFrames * 0.5);
  return lerp(BYTE_BASE_YAW, 0.05, easeOut((state.lineLf - turnAt) / 24));
}
