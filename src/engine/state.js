// Per-frame lookups into a plan (see timeline.js). Pure functions of `frame`.

import { EXPRESSIONS, NO_BLINK_EYES } from "./faces/expressions";
import { gestureOffsets } from "./characters/gestures";
import { MODEL_POSES, blendPose } from "./characters/poses";
import { clamp01, easeInOut, hash, lastAt, prevOf, seedOf } from "./math";
import { syllables } from "./words";

const POSE_BLEND = 10;
const LOOK_BLEND = 7;

/** Mouth openness 0..1 for a character at `frame` (0 when not speaking). */
function talkAt(track, frame) {
  for (const s of track.speech) {
    if (frame < s.start || frame >= s.end) continue;
    const lf = frame - s.start;
    const mouth = s.line.clip?.mouth;
    if (mouth && mouth.length) return mouth[Math.min(lf, mouth.length - 1)] ?? 0;
    // Estimated: open and close once per syllable inside each word
    const w = s.line.words.find((x) => lf >= x.start && lf < x.end);
    if (!w) return 0.05;
    const n = Math.max(1, Math.round(syllables(w.word)));
    const per = Math.max(3, (w.end - w.start) / n);
    return 0.3 + 0.7 * Math.abs(Math.sin((Math.PI * (lf - w.start)) / per));
  }
  return 0;
}

/** Deterministic blinks: one every ~2.5–4.5 s, each 6 frames long. */
function blinkAt(id, frame) {
  const seed = seedOf(id) * 1000;
  let t = Math.floor(hash(seed) * 60);
  for (let k = 0; t <= frame + 6; k++) {
    if (frame >= t && frame < t + 6) {
      const u = (frame - t) / 6;
      return u < 0.4 ? u / 0.4 : 1 - (u - 0.4) / 0.6;
    }
    t += 75 + Math.floor(hash(seed + k * 7.31) * 60);
  }
  return 0;
}

function blushBoostAt(track, frame) {
  let b = 0;
  for (const e of track.blushBoost) {
    if (frame < e.frame || frame >= e.end) continue;
    b = Math.max(b, Math.min(clamp01((frame - e.frame) / 6), clamp01((e.end - frame) / 10)));
  }
  return b;
}

/** Everything a character component needs for this frame. */
export function characterState(plan, id, frame) {
  const track = plan.chars[id];
  const visibleEv = lastAt(track.visible, frame);
  const faceEv = lastAt(track.face, frame);
  const expr = EXPRESSIONS[faceEv.value];

  const poses = MODEL_POSES[track.model];
  const poseEv = lastAt(track.pose, frame);
  const posePrev = prevOf(track.pose, poseEv);
  const poseT = posePrev ? easeInOut((frame - poseEv.frame) / POSE_BLEND) : 1;
  const pose = posePrev ? blendPose(poses[posePrev.value], poses[poseEv.value], poseT) : { ...poses[poseEv.value] };

  const lookEv = lastAt(track.look, frame);
  const lookPrev = prevOf(track.look, lookEv);
  const look = {
    from: lookPrev ? lookPrev.value : lookEv.value,
    to: lookEv.value,
    t: lookPrev ? easeInOut((frame - lookEv.frame) / LOOK_BLEND) : 1,
  };

  const g = gestureOffsets(track.gestures, frame);
  const talk = talkAt(track, frame);
  const blink = g.freeze > 0.5 || NO_BLINK_EYES.has(expr.eyes) ? 0 : blinkAt(id, frame);

  return {
    id,
    model: track.model,
    visible: visibleEv.value,
    face: {
      name: faceEv.value,
      eyes: expr.eyes,
      mouth: expr.mouth,
      brows: expr.brows,
      blush: Math.min(1, expr.blush + blushBoostAt(track, frame)),
      talk,
      blink,
      t: frame,
    },
    faceSince: faceEv.frame,
    pose,
    look,
    g,
    talking: talk > 0,
    frame,
  };
}

/** The dialogue line active at `frame` (including its trailing pause). */
export function lineAt(plan, frame) {
  let hit = null;
  for (const l of plan.lines) {
    if (l.startFrame <= frame) hit = l;
    else break;
  }
  return hit;
}

/** True while anyone is speaking (used to duck the music). */
export function speechActive(plan, frame) {
  return plan.lines.some((l) => l.kind === "say" && frame >= l.startFrame && frame < l.startFrame + l.speakFrames);
}
