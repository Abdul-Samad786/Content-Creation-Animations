import React from "react";
import { AbsoluteFill } from "remotion";
import { easeOut } from "../camera/rig";

const clamp01 = (t) => Math.min(Math.max(t, 0), 1);

/** V1: dim, faint teal glow from above. Byte is not on screen yet. */
function IntroDim() {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.35)" }} />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(94,207,207,0.22) 0%, transparent 45%)",
        }}
      />
    </AbsoluteFill>
  );
}

/** V6 line 13: red flare on the hard cut, decaying across the line. */
function RedFlare({ lineLf, duration }) {
  const rise = clamp01(lineLf / 3);
  const fade = clamp01(1 - lineLf / duration);
  return (
    <AbsoluteFill
      style={{
        background: "rgba(255,40,40,0.55)",
        opacity: rise * fade,
        mixBlendMode: "multiply",
        pointerEvents: "none",
      }}
    />
  );
}

/** V6 line 14: warm, locked still frame. */
function WarmHold({ lineLf }) {
  return (
    <AbsoluteFill
      style={{
        background: "rgba(255,170,90,0.3)",
        opacity: easeOut(lineLf / 6),
        pointerEvents: "none",
      }}
    />
  );
}

/** All DOM layers for the current line. Triggers are keyed to the rewritten script's line ids. */
export default function BeatOverlays({ beat }) {
  const { line, lineLf } = beat;
  const lineId = line ? line.lineId : null;
  const duration = line ? line.endFrame - line.startFrame : 1;

  return (
    <>
      {lineId === 1 && <IntroDim />}
      {lineId === 15 && <RedFlare lineLf={lineLf} duration={duration} />}
      {lineId === 17 && <WarmHold lineLf={lineLf} />}
    </>
  );
}
