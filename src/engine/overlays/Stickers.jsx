import React from "react";
import { clamp01, easeIn, easeOutBack } from "../math";
import { FONT } from "../fonts";

// Hook sticker (first seconds — fully visible on frame 0 so it works as the
// thumbnail), a small series badge, and the outro sticker that teases the next
// episode.

const HOOK_SECONDS = 3.0;

export function Hook({ plan, frame }) {
  const text = plan.episode.hook;
  if (!text) return null;
  const end = Math.round(HOOK_SECONDS * plan.fps);
  if (frame >= end + 8) return null;
  const out = frame > end ? easeIn((frame - end) / 8) : 0;
  const wob = Math.sin(frame * 0.12) * 1.2;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", fontFamily: FONT }}>
      <div
        style={{
          maxWidth: 900,
          padding: "20px 38px",
          background: "#FFFFFF",
          color: "#2B1D3A",
          borderRadius: 36,
          fontSize: 54,
          fontWeight: 700,
          lineHeight: 1.15,
          textAlign: "center",
          boxShadow: "0 10px 0 #FF6FAE, 0 18px 30px rgba(30,10,60,0.35)",
          transform: `rotate(${-2 + wob}deg) scale(${1 - out})`,
          opacity: 1 - out,
        }}
      >
        {text}
      </div>
    </div>
  );
}

export function Badge({ plan, frame }) {
  const start = Math.round(HOOK_SECONDS * plan.fps);
  if (frame < start) return null;
  const pop = easeOutBack(clamp01((frame - start) / 10));
  const ep = plan.episode.number;
  return (
    <div style={{ position: "absolute", left: 40, top: 150, fontFamily: FONT, transform: `scale(${pop})`, transformOrigin: "0 50%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", borderRadius: 26, background: "rgba(43,29,58,0.55)", color: "#FFFFFF", fontSize: 28, fontWeight: 600, letterSpacing: 1 }}>
        <span style={{ color: "#FF8EC2" }}>●</span>
        {plan.series.title.toUpperCase()}
        {ep != null && <span style={{ opacity: 0.8 }}>· {plan.series.season != null ? `S${plan.series.season} ` : ""}EP {ep}</span>}
      </div>
    </div>
  );
}

export function Outro({ plan, frame }) {
  const text = plan.episode.outro;
  if (!text) return null;
  let start;
  let end = Infinity;
  if (plan.outroLine) {
    // "outroAt": the sticker owns that line, then gets out of the way for a sting
    start = plan.outroLine.startFrame;
    end = plan.outroLine.endFrame;
  } else {
    const lastSay = [...plan.lines].reverse().find((l) => l.kind === "say");
    const speechEnd = lastSay ? lastSay.startFrame + lastSay.speakFrames + 8 : 0;
    start = Math.max(speechEnd, plan.totalFrames - Math.round(2.0 * plan.fps));
  }
  if (frame < start || frame >= end) return null;
  const pop = easeOutBack(clamp01((frame - start) / 12), 2.2) * (end === Infinity ? 1 : 1 - easeIn((frame - (end - 8)) / 8));
  const bob = Math.sin(frame * 0.18) * 6;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 360 + bob, display: "flex", justifyContent: "center", fontFamily: FONT }}>
      <div
        style={{
          padding: "22px 40px",
          borderRadius: 40,
          background: "linear-gradient(135deg,#FF8EC2,#FF6FAE)",
          color: "#FFFFFF",
          fontSize: 50,
          fontWeight: 700,
          border: "6px solid #FFFFFF",
          boxShadow: "0 16px 30px rgba(30,10,60,0.35)",
          transform: `scale(${pop}) rotate(2deg)`,
        }}
      >
        {text}
      </div>
    </div>
  );
}
