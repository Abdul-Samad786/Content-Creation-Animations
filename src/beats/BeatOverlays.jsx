import React from "react";
import { AbsoluteFill } from "remotion";
import { isHighIntensity } from "../camera/rig";

const clamp01 = (t) => Math.min(Math.max(t, 0), 1);

/**
 * Constant golden-hour grade over every shot, so the look never pops between
 * shots or lines: a warm wash and a soft dark vignette.
 */
export function WarmGrade() {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "rgba(255,160,80,0.10)", mixBlendMode: "soft-light" }} />
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 50%, rgba(40,14,0,0.38) 100%)" }}
      />
    </AbsoluteFill>
  );
}

/**
 * Emotional peak treatment for every intensity-High line: a red flare on the
 * cut that decays across the line, and a heavy red-black vignette that holds.
 * The caption turns red and the camera punches in (Captions.jsx, rig.js).
 */
function EmotionalPeak({ lineLf, duration }) {
  const rise = clamp01(lineLf / 3);
  const flare = rise * clamp01(1 - lineLf / duration);
  const vignette = clamp01(lineLf / 6) * clamp01((duration - lineLf) / 8);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "rgba(255,40,40,0.5)", opacity: flare, mixBlendMode: "multiply" }} />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(70,0,0,0.75) 100%)",
          opacity: vignette,
        }}
      />
    </AbsoluteFill>
  );
}

/** Per-line DOM treatments. Driven by the line's `intensity`, not its id. */
export default function BeatOverlays({ beat }) {
  const { line, lineLf } = beat;
  if (!line || !isHighIntensity(line)) return null;
  return <EmotionalPeak lineLf={lineLf} duration={line.endFrame - line.startFrame} />;
}
