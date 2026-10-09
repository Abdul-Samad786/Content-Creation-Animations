// Vertical-native camera shots, chosen per line with "camera":
//   two          both characters, faces large
//   wide         the whole room
//   close:<id>   one character's face and shoulders
//   zoom:<id>    comedic crash-zoom onto a face
//
// The camera is level and frontal (the cute "sitcom" angle). While the phone
// is on screen every shot lifts the faces into the top half so the chat sits
// below them. A line that repeats the previous shot continues it without a cut.

import { clamp01, easeInOut, easeOut, lerp } from "./math";

const tanHalf = (fov) => Math.tan((fov * Math.PI) / 360);

/** Level camera looking down -Z at `anchor`, with the anchor at screen height `ndc` (+1 top). */
export function frameOn(anchor, ndc, distance, fov) {
  const y = anchor[1] - ndc * distance * tanHalf(fov);
  return { position: [anchor[0], y, anchor[2] + distance], target: [anchor[0], y, anchor[2]], fov };
}

/** Screen pixel position of a world point, or null if behind the camera. */
export function projectPx(point, pose, width, height) {
  const [px, py, pz] = pose.position;
  const [tx, ty, tz] = pose.target;
  let f = [tx - px, ty - py, tz - pz];
  const fl = Math.hypot(...f);
  f = f.map((v) => v / fl);
  let r = [-f[2], 0, f[0]];
  const rl = Math.hypot(...r);
  r = r.map((v) => v / rl);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const d = [point[0] - px, point[1] - py, point[2] - pz];
  const zc = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  if (zc <= 0) return null;
  const xc = d[0] * r[0] + d[1] * r[1] + d[2] * r[2];
  const yc = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
  const t = tanHalf(pose.fov);
  const ndcX = xc / (zc * t * (width / height));
  const ndcY = yc / (zc * t);
  return { x: ((ndcX + 1) / 2) * width, y: ((1 - ndcY) / 2) * height, scale: 1 / (zc * t) };
}

/** Consecutive identical shots merge, so a repeated shot does not restart its move. */
function shotRuns(plan) {
  const runs = [];
  for (const c of plan.camera) {
    const last = runs[runs.length - 1];
    if (last && last.shot === c.shot && last.target === c.target && c.shot !== "zoom") continue;
    runs.push({ ...c });
  }
  return runs;
}

function shotPose(shot, target, anchors, lf, phoneAmt) {
  const ids = Object.keys(anchors);
  const lift = phoneAmt; // 0..1
  const drift = easeInOut(clamp01(lf / 110)); // slow push across a shot

  if (shot === "close" || shot === "zoom") {
    const a = anchors[target];
    const look = [a[0], a[1] - 0.05, a[2]];
    if (shot === "zoom") {
      const crash = easeOut(lf / 5);
      const d = lerp(3.4, 2.2, crash) - 0.06 * drift + lerp(0, 0.5, lift);
      return frameOn(look, lerp(-0.04, 0.34, lift), d, 34);
    }
    return frameOn(look, lerp(-0.04, 0.34, lift), 2.75 - 0.12 * drift + lerp(0, 0.6, lift), 34);
  }

  // two / wide: centre on all characters
  const mid = ids.reduce((acc, id) => acc.map((v, i) => v + anchors[id][i] / ids.length), [0, 0, 0]);
  const xs = ids.map((id) => anchors[id][0]);
  const span = Math.max(...xs) - Math.min(...xs);
  if (shot === "wide") return frameOn([mid[0], mid[1] - 0.35, mid[2]], lerp(0, 0.3, lift), 6.2 - 0.25 * drift, 36);
  const base = 3.3 + span * 1.25;
  return frameOn([mid[0], mid[1] - 0.06, mid[2]], lerp(0.1, 0.4, lift), base + lerp(0, 0.75, lift) - 0.16 * drift, 36);
}

/**
 * Camera pose at `frame`.
 * @param anchors   { id: [x,y,z] } face centres of the on-stage characters
 * @param phoneAmt  0..1 how much the phone is on screen
 */
export function cameraPoseAt(plan, frame, anchors, phoneAmt) {
  const runs = shotRuns(plan);
  let i = 0;
  for (let k = 0; k < runs.length; k++) if (runs[k].frame <= frame) i = k;
  const run = runs[i];
  const lf = frame - run.frame;
  let pose = shotPose(run.shot, run.target, anchors, lf, phoneAmt);

  // Handheld micro-sway so the frame never feels frozen
  const sway = [Math.sin(frame * 0.023) * 0.012, Math.sin(frame * 0.017 + 1.3) * 0.009, 0];
  // Crash zooms land with a little shake
  if (run.shot === "zoom" && lf < 14) {
    const amp = 0.03 * (1 - lf / 14);
    sway[0] += Math.sin(frame * 2.7) * amp;
    sway[1] += Math.cos(frame * 3.3) * amp * 0.7;
  }
  pose = {
    ...pose,
    position: pose.position.map((v, k) => v + sway[k]),
    target: pose.target.map((v, k) => v + sway[k]),
  };
  return pose;
}
