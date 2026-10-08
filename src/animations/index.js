import { interpolate } from "remotion";

/**
 * Head nod while speaking — soft sin bob, eased in/out of the line.
 * @returns {number} radians (X axis pitch)
 */
export function headNod(frame, startFrame, endFrame) {
  if (frame < startFrame || frame > endFrame) return 0;

  const local = frame - startFrame;
  const envelope = interpolate(
    frame,
    [startFrame, startFrame + 6, endFrame - 6, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return Math.sin(local * 0.55) * 0.1 * envelope;
}

/**
 * Right-arm raise / gesture while human speaks.
 * @returns {number} radians for setArmRotation (positive = forward)
 */
export function armRaise(frame, startFrame, endFrame) {
  if (frame < startFrame || frame > endFrame) return 0;

  return interpolate(
    frame,
    [startFrame, startFrame + 10, endFrame - 12, endFrame],
    [0, 0.55, 0.55, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

/**
 * Continuous hover phase for the AI agent (pass into idleHover as time).
 * @returns {number} time-like value in seconds
 */
export function aiHover(frame) {
  return frame / 30;
}

/**
 * Emissive glow pulse while AI is speaking.
 * @returns {number} emissiveIntensity
 */
export function aiGlow(frame, startFrame, endFrame) {
  const base = 1.2;
  if (frame < startFrame || frame > endFrame) return base;

  const local = frame - startFrame;
  const envelope = interpolate(
    frame,
    [startFrame, startFrame + 6, endFrame - 6, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const pulse = (Math.sin(local * 0.7) + 1) * 0.5; // 0..1
  return base + pulse * 1.4 * envelope;
}

/**
 * Camera X target toward the active speaker.
 * @param {number} frame
 * @param {"left"|"right"|null} speakerSide
 * @returns {number} camera X offset
 */
export function cameraShift(frame, speakerSide) {
  if (speakerSide === "left") return -0.4;
  if (speakerSide === "right") return 0.4;
  return 0;
}

/**
 * Active dialogue line for the current frame, or null if in a gap.
 */
export function getActiveLine(frame, dialogue) {
  return (
    dialogue.find((line) => frame >= line.startFrame && frame <= line.endFrame) ??
    null
  );
}

/**
 * Last line that has started (for holding camera between gaps).
 */
export function getLatestLine(frame, dialogue) {
  let latest = null;
  for (const line of dialogue) {
    if (frame >= line.startFrame) latest = line;
  }
  return latest;
}

/**
 * Caption opacity — fade in over the first 8 frames of a line.
 */
export function captionOpacity(frame, startFrame, endFrame) {
  if (frame < startFrame || frame > endFrame) return 0;
  return interpolate(
    frame,
    [startFrame, startFrame + 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}
