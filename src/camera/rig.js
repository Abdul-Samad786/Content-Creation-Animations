// Vertical-native camera rig for the 1080x1920 composition.
//
// Layout (screen, top to bottom):
//   upper band   — captions live here (top 42% of the frame)
//   middle third — props / visuals
//   lower half   — Human and Byte side by side on the bench
//   bottom 400px — reserved for platform UI (nothing is drawn here)
//
// Everything here is a pure function of the frame number. No clocks, no
// Math.random, no physics, so every render produces identical frames.

// ── World layout ─────────────────────────────────────────────────────────────
export const HUMAN_POSITION = [-0.55, -0.45, 0.2];
export const AI_POSITION = [0.55, 0.55, 0.2];
export const BYTE_BASE_YAW = -0.2;

/** Face anchor points in world space. */
export const ANCHORS = {
  human: [-0.55, 1.78, 0.2],
  byte: [0.55, 1.64, 0.425],
  pair: [0, 1.71, 0.3],
  mid: [0.25, 1.68, 0.4],
};

/** Topmost points of each character in world space (hair and antenna tips). */
export const HEAD_TOP = {
  human: [-0.55, 2.1, 0.2],
  byte: [0.55, 2.35, 0.2],
};

// ── Frame geometry ───────────────────────────────────────────────────────────
export const FRAME_WIDTH = 1080;
export const FRAME_HEIGHT = 1920;
/** Captions must sit in the top 42% of the frame. */
export const CAPTION_SAFE_BOTTOM_PX = Math.round(FRAME_HEIGHT * 0.42);
/** Minimum clear space between a caption box and the top of any character. */
export const CAPTION_GAP_PX = 100;
/** Captions never go higher than this from the top of the frame. */
const CAPTION_MIN_BOTTOM_PX = 300;

/** Faces sit in the lower half, clear of the caption zone. */
export const PAIR_NDC = -0.3;
export const HUMAN_NDC = -0.2;

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

/** Default two-shot: Human and Byte side by side, faces in the lower half. */
export const STACKED_POSE = frameOn(ANCHORS.pair, PAIR_NDC, 5.6, 44);

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

// ── Projection (for caption clearance) ───────────────────────────────────────

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

/**
 * Where the caption box's bottom edge goes for this frame.
 *
 * The box is anchored to the safe band (top 42%) and pushed up to keep
 * CAPTION_GAP_PX clear above the topmost visible character. Characters whose
 * top is below the frame are ignored. A head cut off at the top edge cannot be
 * cleared, so `collision` is set.
 */
export function captionClearance(pose, { byteVisible = true } = {}) {
  const points = [HEAD_TOP.human];
  if (byteVisible) points.push(HEAD_TOP.byte);

  let topmost = null;
  let collision = false;
  for (const point of points) {
    const s = projectPx(point, pose);
    if (!s) continue;
    if (s.y > FRAME_HEIGHT) continue; // below the frame: not in shot
    if (s.y < 0) collision = true; // head is above the top edge
    const y = Math.max(s.y, 0);
    if (topmost === null || y < topmost) topmost = y;
  }

  if (topmost === null) {
    return { bottom: CAPTION_SAFE_BOTTOM_PX, topmost: null, collision: false };
  }

  const wanted = topmost - CAPTION_GAP_PX;
  if (wanted < CAPTION_MIN_BOTTOM_PX) collision = true;
  return {
    bottom: Math.min(CAPTION_SAFE_BOTTOM_PX, Math.max(wanted, CAPTION_MIN_BOTTOM_PX)),
    topmost,
    collision,
  };
}

// ── Shots ────────────────────────────────────────────────────────────────────
// A shot is one camera framing. Each line picks its shot from its visualNote
// (see shotForVisualNote). A line with no framing direction joins the shot
// already on screen, so the camera holds or pushes instead of cutting.
//
// Each shot's pose(state) receives the beat state from `beatStateAt`:
//   state.frame   absolute frame
//   state.lf      frames since this shot started
//   state.segT    0..1 progress through the whole shot segment (held lines included)
//   state.line    active dialogue entry (may be null)
//   state.lineLf  frames since that line started
//   state.fps
// `transition` is the blend length in frames from the previous shot (0 = hard cut).
// `track` pans and dollies toward whoever is speaking, eased over 12 frames per line.

/** Hand-held shake that decays over ~1s from the start of a line. Deterministic. */
export function shakeOffset(frame, lineLf) {
  const amp = 0.05 * Math.max(0, 1 - lineLf / 30);
  return [
    Math.sin(frame * 2.9) * amp + Math.sin(frame * 5.3) * amp * 0.5,
    Math.cos(frame * 3.7) * amp * 0.6,
    0,
  ];
}

/** Eased progress through the whole shot segment. */
const segEase = (state) => easeInOut(state.segT);

/**
 * Pan and dolly toward whoever is speaking, without cutting. Eases over
 * 12 frames from the previous line's speaker to the current one.
 */
function trackOffset(state, pose) {
  const focus = (line) => (!line ? 0 : line.speaker === "ai" ? 1 : -1);
  const ease = easeInOut(state.lineLf / 12);
  const f = lerp(focus(state.prevLine), focus(state.line), ease);

  // Pan half-way from the shot's centre toward the speaker, so the speaker ends up central.
  const speakerX = (line) => (line.speaker === "ai" ? AI_POSITION[0] : HUMAN_POSITION[0]);
  const panFor = (line) => (line ? 0.5 * (speakerX(line) - pose.target[0]) : 0);
  const pan = lerp(panFor(state.prevLine), panFor(state.line), ease);

  return { pan, dolly: 0.7 * Math.abs(f) };
}

function trackedPose(pose, track) {
  return {
    ...pose,
    position: [pose.position[0] + track.pan, pose.position[1], pose.position[2] - track.dolly],
    target: [pose.target[0] + track.pan, pose.target[1], pose.target[2]],
  };
}

export const SHOTS = {
  // Slow push-in on Human (lines 1–14), tracking whoever speaks.
  HUMAN_PUSH: {
    transition: 12,
    track: true,
    pose: (s) => frameOn(ANCHORS.human, HUMAN_NDC, 5.0 - 1.6 * segEase(s), 36),
  },

  // Wide two-shot with both characters small in frame (line 17). Holds through
  // the speakers on lines 18–25, tracking whoever speaks. The pull out is eased.
  WIDE_TWO_SHOT: {
    transition: 36,
    track: true,
    pose: () => frameOn(ANCHORS.pair, PAIR_NDC, 9.0, 44),
  },

  // Snaps in tight on Human (line 15), then shakes and decays over ~1s.
  // Hard cut, because the script says "snaps in".
  SNAP_HUMAN: {
    transition: 0,
    track: false,
    pose: (s) => {
      const base = frameOn(ANCHORS.human, HUMAN_NDC, 2.8, 30);
      const [dx, dy] = shakeOffset(s.frame, s.lineLf);
      return {
        ...base,
        position: [base.position[0] + dx, base.position[1] + dy, base.position[2]],
        target: [base.target[0] + dx, base.target[1] + dy, base.target[2]],
      };
    },
  },

  // Completely still on Human through the 2s despair pause (line 16). No push, no move.
  HOLD_HUMAN: {
    transition: 0,
    track: false,
    pose: () => frameOn(ANCHORS.human, HUMAN_NDC, 2.8, 30),
  },

  // Final beat: slow push-in on Byte, which turns to camera (line 26). The push
  // finishes with the spoken line; the closing pause is a still hold, then cut to black.
  FINAL_BYTE: {
    transition: 12,
    track: false,
    pose: (s) => {
      const speech = s.line ? s.line.speakingFrames : 1;
      const push = easeInOut(Math.min(s.lineLf, speech) / speech);
      return frameOn(ANCHORS.mid, 0.1, 4.6 - 0.8 * push, 40);
    },
  },
};

/**
 * Ordered rules: the first match on a line's visualNote picks its shot.
 * Anything that matches no rule (including "none") returns null, so the line
 * joins the shot already on screen.
 */
const VISUAL_RULES = [
  [/turns to camera/, "FINAL_BYTE"],
  [/snaps in/, "SNAP_HUMAN"],
  [/hold on human/, "HOLD_HUMAN"],
  [/wide two-shot/, "WIDE_TWO_SHOT"],
  [/human/, "HUMAN_PUSH"],
];

/** @returns {string|null} shot name, or null when the line should inherit the current shot */
export function shotForVisualNote(note) {
  if (!note) return null;
  const t = note.toLowerCase();
  for (const [pattern, shot] of VISUAL_RULES) {
    if (pattern.test(t)) return shot;
  }
  return null;
}

// ── Timeline → shot segments ─────────────────────────────────────────────────

/**
 * Group consecutive lines that share a shot into segments. Lines with no shot
 * join the segment before them. Each segment runs until the next one starts,
 * or to the end of the timeline.
 */
export function buildBeatSegments(timeline) {
  const segments = [];
  for (const entry of timeline) {
    const shot = shotForVisualNote(entry.visualNote);
    if (!shot) continue;
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
 * Everything a shot needs to know about `frame`.
 * The active line includes its trailing pause; past the end, the last line holds.
 */
export function beatStateAt(frame, timeline, segments, fps = 30) {
  let line = null;
  for (const entry of timeline) {
    if (frame >= entry.startFrame && frame < entry.endFrame) {
      line = entry;
      break;
    }
  }
  if (!line) {
    for (const entry of timeline) {
      if (entry.startFrame <= frame) line = entry;
    }
  }

  const lineIndex = line ? timeline.indexOf(line) : -1;
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
    beat: seg ? seg.beat : null,
    lf,
    segT: clamp01(lf / segLen),
  };
}

function poseForState(state) {
  const shot = SHOTS[state.beat];
  const pose = shot.pose(state);
  return shot.track ? trackedPose(pose, trackOffset(state, pose)) : pose;
}

/**
 * Camera pose for `frame`. Blends from the previous shot over that shot's
 * transition length, or cuts when the transition is 0.
 */
export function cameraPoseAt(frame, timeline, segments, fps = 30) {
  const state = beatStateAt(frame, timeline, segments, fps);
  if (!state.seg) return STACKED_POSE;

  const shot = SHOTS[state.beat];
  const current = poseForState(state);

  const prevSeg = segments[state.segIndex - 1];
  if (!prevSeg || shot.transition === 0 || state.lf >= shot.transition) {
    return current;
  }

  // Previous shot, evaluated at its last frame before this one starts.
  const prevState = beatStateAt(state.seg.startFrame - 1, timeline, segments, fps);
  const previous = poseForState(prevState);
  return lerpPose(previous, current, easeInOut(state.lf / shot.transition));
}

/** Byte turns to face camera during the final shot (line 26). */
export function byteYawAt(state) {
  if (state.beat !== "FINAL_BYTE") return BYTE_BASE_YAW;
  return lerp(BYTE_BASE_YAW, 0, easeOut(state.lf / (1 * state.fps)));
}

/** Human is out of focus behind Byte during the final shot (1 = sharp). */
export function humanFocusAt(state) {
  if (state.beat !== "FINAL_BYTE") return 1;
  return lerp(1, 0.45, easeOut(state.lf / (1 * state.fps)));
}
