import React from "react";
import { AbsoluteFill } from "remotion";
import { easeOut } from "../camera/rig";

// On-screen visuals tied to one dialogue line each. Every element is chosen by
// lineId, so it mounts only on its own line and React unmounts it when the
// next line starts. All motion is a function of `lineLf` (frames into the line).

const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
const fadeIn = (lf, frames) => easeOut(lf / frames);

// ── Shared SVG pieces ────────────────────────────────────────────────────────

/** Mortarboard graduation cap. Stands in for a grad-cap asset (none exists in the repo yet). */
function GradCap({ width = 300, color = "#1A1A24", tassel = "#F2B705" }) {
  return (
    <svg width={width} viewBox="0 0 200 140">
      <polygon points="100,20 195,55 100,90 5,55" fill={color} />
      <path d="M45 75 L45 110 Q100 135 155 110 L155 75 L100 95 Z" fill={color} opacity="0.85" />
      <line x1="180" y1="58" x2="180" y2="98" stroke={tassel} strokeWidth="3" />
      <rect x="176" y="96" width="8" height="16" fill={tassel} />
    </svg>
  );
}

/** Head-and-shoulders silhouette. Stands in for the crowd silhouette, which was retired. */
function Silhouette({ width = 120, fill = "#2A2633" }) {
  return (
    <svg width={width} viewBox="0 0 60 120">
      <circle cx="30" cy="22" r="16" fill={fill} />
      <path d="M5 120 L5 62 Q5 44 30 44 Q55 44 55 62 L55 120 Z" fill={fill} />
    </svg>
  );
}

// ── Line 1: cutaway to a framed degree ───────────────────────────────────────

/** Brief cutaway (lineLf 20–70): dim hallway wall with a framed degree, slightly crooked. */
function DegreeCutaway({ lineLf }) {
  const opacity = Math.min(fadeIn(lineLf - 20, 6), 1 - clamp01((lineLf - 64) / 6));
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <AbsoluteFill style={{ background: "rgba(8,10,14,0.78)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: "rotate(-3deg)", background: "#5A3E2B", padding: 26, borderRadius: 6, boxShadow: "0 18px 40px rgba(0,0,0,0.6)" }}>
          <div style={{ background: "#EFE8D8", width: 560, height: 400, borderRadius: 2, padding: 40, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ height: 22, background: "#2B2B33", width: "70%", alignSelf: "center" }} />
            <div style={{ height: 14, background: "#6B6B73", width: "50%", alignSelf: "center" }} />
            <div style={{ height: 14, background: "#6B6B73", width: "40%", alignSelf: "center" }} />
            <div style={{ width: 90, height: 90, borderRadius: "50%", border: "4px solid #9A7B3E", alignSelf: "center" }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ── Line 3: phone glow on Human, out-of-focus empty inbox ────────────────────

/** Soft cold glow on Human's face (about 60% down) and a blurred, empty inbox behind. */
function PhoneGlowInbox({ lineLf }) {
  const on = fadeIn(lineLf, 12);
  const flicker = 0.9 + 0.1 * Math.sin(lineLf * 0.12);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 60%, rgba(120,190,255,0.35) 0%, transparent 30%)",
          opacity: on * flicker,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "16%",
          top: "42%",
          width: "68%",
          height: "22%",
          background: "#F4F6FA",
          borderRadius: 18,
          filter: "blur(7px)",
          opacity: 0.8 * on,
          boxSizing: "border-box",
          padding: 36,
        }}
      >
        <div style={{ height: 24, width: "40%", background: "#C9D2E0", borderRadius: 6 }} />
      </div>
    </AbsoluteFill>
  );
}

// ── Line 7: three flash-cuts, each under half a second ───────────────────────

/** Lecture hall: rows of seats receding toward a projector screen. */
function LectureHallScene() {
  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <svg viewBox="0 0 1080 1920" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="1080" height="1920" fill="#2A2F3D" />
      <rect x="240" y="260" width="600" height="340" fill="#DDE6F0" />
      {rows.map((r) => (
        <g key={r}>
          {[0, 1, 2, 3, 4, 5, 6].map((c) => (
            <rect key={c} x={120 + c * 120} y={960 + r * 110} width="80" height="50" fill="#1B1F2A" />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Graduation cap on a dark ground. */
function CapScene() {
  return (
    <AbsoluteFill style={{ background: "#111318", justifyContent: "center", alignItems: "center" }}>
      <GradCap width={700} />
    </AbsoluteFill>
  );
}

/** Posed grad photo on a phone: a silhouette in a cap, inside a phone frame. */
function PhotoOnPhoneScene() {
  return (
    <AbsoluteFill style={{ background: "#0C0E12", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 520, height: 960, background: "#1E2430", borderRadius: 60, border: "10px solid #3A4152", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#A8C4E0, #5E7FA6)" }} />
        <div style={{ position: "absolute", left: "50%", top: "32%", transform: "translateX(-50%)" }}>
          <div style={{ position: "relative", width: 260 }}>
            <Silhouette width={260} fill="#1A1A24" />
            <div style={{ position: "absolute", left: "50%", top: "-4%", transform: "translateX(-50%)" }}>
              <GradCap width={230} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Each cut is [startLf, endLf) in line 7, 12 frames (0.4s) each. Hard cuts, no fades. */
const FLASH_CUTS = [
  { from: 6, to: 18, scene: LectureHallScene },
  { from: 18, to: 30, scene: CapScene },
  { from: 30, to: 42, scene: PhotoOnPhoneScene },
];

function FlashCuts({ lineLf }) {
  const cut = FLASH_CUTS.find((c) => lineLf >= c.from && lineLf < c.to);
  if (!cut) return null;
  const Scene = cut.scene;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Scene />
    </AbsoluteFill>
  );
}

// ── Lines 12 and 14: text cards ──────────────────────────────────────────────

/** Light text card, centred. Line 12 shows COULD YOU?, line 14 shows HAVE YOU?. */
function TextCard({ text, lineLf }) {
  const on = fadeIn(lineLf, 8);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          background: "rgba(245,242,236,0.94)",
          color: "#16161F",
          borderRadius: 24,
          padding: "28px 56px",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 112,
          letterSpacing: 2,
          whiteSpace: "nowrap",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          opacity: on,
          transform: `translateY(${(1 - on) * 24}px)`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}

// ── Line 19: two identical silhouettes, one lights up ────────────────────────

/** Two identical silhouettes side by side. The right one lights up from lineLf 18. */
function SilhouettePair({ lineLf }) {
  const lit = fadeIn(lineLf - 18, 15);
  const glow = `rgb(${Math.round(42 + (255 - 42) * lit)}, ${Math.round(38 + (176 - 38) * lit)}, ${Math.round(51 + (138 - 51) * lit)})`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: "44%", left: "28%", transform: "translateX(-50%)" }}>
        <Silhouette width={170} fill="#2A2633" />
      </div>
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: "72%",
          transform: "translateX(-50%)",
          filter: `drop-shadow(0 0 ${Math.round(40 * lit)}px rgba(255,176,138,${0.9 * lit}))`,
        }}
      >
        <Silhouette width={170} fill={glow} />
      </div>
    </AbsoluteFill>
  );
}

// ── Line 24: job-listing card with a file icon sliding on ────────────────────

/** Job-listing card in the middle third. A small file icon slides onto it from the right. */
function JobListingCard({ lineLf }) {
  const slide = 1 - fadeIn(lineLf - 6, 30);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: "16%",
          top: "44.5%",
          width: "68%",
          height: "13%",
          background: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 18px 40px rgba(0,0,0,0.4)",
          boxSizing: "border-box",
          padding: 40,
        }}
      >
        <div style={{ height: 30, width: "55%", background: "#2B2B33", borderRadius: 6 }} />
        <div style={{ height: 14, width: "80%", background: "#B8BEC9", borderRadius: 6, marginTop: 28 }} />
        <div style={{ height: 14, width: "65%", background: "#B8BEC9", borderRadius: 6, marginTop: 16 }} />
        <div
          style={{
            position: "absolute",
            right: 40,
            bottom: 36,
            width: 92,
            height: 116,
            background: "#3474A4",
            borderRadius: 10,
            transform: `translateX(${slide * 900}px)`,
            opacity: fadeIn(lineLf - 6, 12),
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * The one visual for the current line. Returns null on every other line, so
 * nothing from a previous line stays mounted.
 */
export default function LineVisuals({ line, lineLf }) {
  if (!line) return null;
  switch (line.lineId) {
    case 1:
      return <DegreeCutaway lineLf={lineLf} />;
    case 3:
      return <PhoneGlowInbox lineLf={lineLf} />;
    case 7:
      return <FlashCuts lineLf={lineLf} />;
    case 12:
      return <TextCard text="COULD YOU?" lineLf={lineLf} />;
    case 14:
      return <TextCard text="HAVE YOU?" lineLf={lineLf} />;
    case 19:
      return <SilhouettePair lineLf={lineLf} />;
    case 24:
      return <JobListingCard lineLf={lineLf} />;
    default:
      return null;
  }
}
