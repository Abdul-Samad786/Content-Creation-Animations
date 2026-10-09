import React from "react";
import { AbsoluteFill } from "remotion";
import { CAPTION_BAND, easeOut } from "../camera/rig";
import { wordWindows, normalizeWord } from "../subtitles/captionTiming";
import { textCardAt } from "./textCards";

// On-screen visuals tied to one dialogue line each. Every element is chosen by
// lineId, so it mounts only on its own line and React unmounts it when the
// next line starts. All motion is a function of `lineLf` (frames into the line).
//
// Placement rules: overlays are fully opaque and never sit on a face. Lines 19
// and 24 lower the characters (camera/rig.js OVERLAY_ROOM_LINES) so their
// graphic fits between the caption band and the characters' heads. No numbers
// appear in any graphic.

const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
const fadeIn = (lf, frames) => easeOut(lf / frames);
const FONT = "Inter, system-ui, sans-serif";

/** Frame offset of the first spoken `word` in a line, or `fallback`. */
function wordLf(line, word, fallback) {
  const hit = wordWindows(line).find((w) => normalizeWord(w.word) === word);
  return hit ? hit.start : fallback;
}

/** Overlay band between the caption band and the lowered heads (lines 19, 24). */
const MID_BAND = { top: CAPTION_BAND.bottom + 40, height: 440 };

// ── Shared SVG pieces ────────────────────────────────────────────────────────

/** Mortarboard graduation cap. */
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

/** Head-and-shoulders silhouette. */
function Silhouette({ width = 120, fill = "#2A2633" }) {
  return (
    <svg width={width} viewBox="0 0 60 120">
      <circle cx="30" cy="22" r="16" fill={fill} />
      <path d="M5 120 L5 62 Q5 44 30 44 Q55 44 55 62 L55 120 Z" fill={fill} />
    </svg>
  );
}

const Check = ({ size = 34, color = "#1F9D55" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill={color} />
    <path d="M7 12.5 L10.5 16 L17 8.5" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FileIcon = ({ size = 56, color = "#3474A4" }) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 40 50">
    <path d="M4 2 H26 L36 12 V48 H4 Z" fill={color} />
    <path d="M26 2 V12 H36" fill="#ffffff55" />
    <rect x="10" y="22" width="20" height="3" rx="1.5" fill="#fff" opacity="0.85" />
    <rect x="10" y="29" width="16" height="3" rx="1.5" fill="#fff" opacity="0.85" />
    <rect x="10" y="36" width="18" height="3" rx="1.5" fill="#fff" opacity="0.85" />
  </svg>
);

// ── Line 1: cutaway to a framed degree ───────────────────────────────────────

/** Brief cutaway (lineLf 20–70): dim hallway wall, a framed degree hung slightly crooked. */
function DegreeCutaway({ lineLf }) {
  const opacity = Math.min(fadeIn(lineLf - 20, 6), 1 - clamp01((lineLf - 64) / 6));
  if (opacity <= 0) return null;
  const serif = "Georgia, 'Times New Roman', serif";
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <AbsoluteFill style={{ background: "linear-gradient(#3B2E26, #1E1813)" }} />
      {/* Ceiling light pooling on the wall */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 55% 35% at 50% 30%, rgba(255,214,150,0.35), transparent 70%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: `rotate(-3deg) scale(${1 + 0.02 * clamp01((lineLf - 20) / 50)})`, background: "linear-gradient(135deg,#6A4A30,#4A3220)", padding: 30, borderRadius: 6, boxShadow: "0 30px 60px rgba(0,0,0,0.65)" }}>
          <div style={{ background: "#F3ECDC", width: 620, height: 450, padding: "38px 44px", boxSizing: "border-box", border: "3px double #B89A5E", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: serif, color: "#2B241C", textAlign: "center" }}>
            <div style={{ fontSize: 22, letterSpacing: 6, textTransform: "uppercase", color: "#6B5A3E" }}>Certificate of Degree</div>
            <div style={{ fontSize: 20, marginTop: 26, fontStyle: "italic" }}>This certifies that the graduate</div>
            <div style={{ fontSize: 20, fontStyle: "italic" }}>has completed every requirement for</div>
            <div style={{ fontSize: 48, marginTop: 18, fontWeight: 700 }}>Bachelor of Science</div>
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
              <div style={{ width: 150, borderTop: "2px solid #6B5A3E", fontSize: 14, paddingTop: 6 }}>Registrar</div>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: "radial-gradient(#D9B65A,#A8862E)", border: "4px solid #8A6B22" }} />
              <div style={{ width: 150, borderTop: "2px solid #6B5A3E", fontSize: 14, paddingTop: 6 }}>Dean</div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ── Line 3: phone glow on Human, an empty inbox ──────────────────────────────

/** Soft cold glow on Human's face and an opaque phone with an empty inbox, held low-left, clear of the face. */
function PhoneInbox({ lineLf }) {
  const on = fadeIn(lineLf - 6, 14);
  const flicker = 0.92 + 0.08 * Math.sin(lineLf * 0.12);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 26% 14% at 48% 56%, rgba(150,200,255,0.22) 0%, transparent 100%)",
          opacity: on * flicker,
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 50,
          top: 1150,
          width: 330,
          height: 560,
          borderRadius: 44,
          background: "#15181F",
          padding: 12,
          boxSizing: "border-box",
          boxShadow: "0 24px 50px rgba(0,0,0,0.55)",
          transform: `rotate(-5deg) translateY(${(1 - on) * 80}px)`,
          opacity: on,
          fontFamily: FONT,
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: 34, background: "#F6F7FA", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 34, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: 90, height: 20, borderRadius: 10, background: "#15181F" }} />
          </div>
          <div style={{ padding: "8px 22px 0", fontSize: 34, fontWeight: 800, color: "#14161C" }}>Inbox</div>
          <div style={{ margin: "12px 22px", height: 36, borderRadius: 12, background: "#E4E7EE", color: "#8A90A0", fontSize: 18, display: "flex", alignItems: "center", paddingLeft: 14 }}>Search mail</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#6A7080" }}>
            <svg width="96" height="72" viewBox="0 0 48 36">
              <rect x="2" y="2" width="44" height="32" rx="4" fill="none" stroke="#B7BDCB" strokeWidth="3" />
              <path d="M3 4 L24 20 L45 4" fill="none" stroke="#B7BDCB" strokeWidth="3" />
            </svg>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#3A3F4C", marginTop: 16 }}>No new messages</div>
            <div style={{ fontSize: 18, marginTop: 6 }}>Nothing back yet</div>
          </div>
        </div>
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
      <rect width="1080" height="1920" fill="#3A2F2A" />
      {/* Projector screen sits below the caption band so it never sits behind caption text */}
      <rect x="240" y="560" width="600" height="320" fill="#F2E3C8" />
      {rows.map((r) => (
        <g key={r}>
          {[0, 1, 2, 3, 4, 5, 6].map((c) => (
            <rect key={c} x={120 + c * 120} y={960 + r * 110} width="80" height="50" rx="8" fill="#1F1915" />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Graduation cap on a dark ground. */
function CapScene() {
  return (
    <AbsoluteFill style={{ background: "#1A1512", justifyContent: "center", alignItems: "center" }}>
      <GradCap width={700} />
    </AbsoluteFill>
  );
}

/** Posed grad photo on a phone: a silhouette in a cap, inside a phone frame. */
function PhotoOnPhoneScene() {
  return (
    <AbsoluteFill style={{ background: "#14100D", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 520, height: 960, background: "#1E2430", borderRadius: 60, border: "10px solid #3A4152", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#F4C890, #C98A5A)" }} />
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

/** Opaque card in the caption band (the caption steps aside while it is up). */
function TextCard({ line, lineLf }) {
  const card = textCardAt(line, lineLf);
  if (!card) return null;
  const on = fadeIn(card.lf, 7) * clamp01(card.remaining / 6);
  // Line 14: the card arrives showing COULD YOU? and flips to HAVE YOU?
  const flipT = card.swapFrom ? clamp01((card.lf - 6) / 8) : 1;
  const text = card.swapFrom && flipT < 0.5 ? card.swapFrom : card.text;
  const flipScale = card.swapFrom ? Math.abs(Math.cos(flipT * Math.PI)) : 1;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: CAPTION_BAND.top + 20, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            background: "#FBF6EC",
            color: "#16161F",
            borderRadius: 26,
            padding: "26px 60px",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 118,
            letterSpacing: 2,
            whiteSpace: "nowrap",
            boxShadow: "0 22px 60px rgba(60,20,0,0.45)",
            borderBottom: "10px solid #FFB547",
            opacity: on,
            transform: `translateY(${(1 - on) * 30}px) scaleY(${Math.max(flipScale, 0.04)})`,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Line 19: two identical silhouettes, one lights up ────────────────────────

function PersonCard({ lit, label }) {
  const glow = `0 0 ${Math.round(60 * lit)}px rgba(255,190,90,${0.85 * lit})`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          width: 300,
          height: 330,
          borderRadius: 28,
          background: lit > 0.01 ? `linear-gradient(rgba(255,233,190,${lit}), rgba(255,247,232,1))` : "#FFF7E8",
          boxShadow: `0 18px 36px rgba(60,25,0,0.35), ${glow}`,
          border: `4px solid rgba(255,170,60,${lit})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Silhouette width={170} fill={lit > 0.5 ? "#3A2A1E" : "#4A4250"} />
        {lit > 0.01 && (
          <div style={{ position: "absolute", top: 18, right: 18, background: "#1F9D55", color: "#fff", borderRadius: 999, padding: "8px 16px", fontFamily: FONT, fontWeight: 800, fontSize: 22, opacity: lit, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="#fff" /></svg>
            Call
          </div>
        )}
      </div>
      <div style={{ marginTop: 16, background: "#2B2230", color: "#FFF4E2", fontFamily: FONT, fontWeight: 800, fontSize: 26, borderRadius: 999, padding: "8px 22px" }}>{label}</div>
    </div>
  );
}

/** Two identical person cards on a soft ground shadow; the right one lights up and gets the call. */
function SilhouettePair({ line, lineLf }) {
  const on = fadeIn(lineLf, 10);
  const litAt = wordLf(line, "one", 40);
  const lit = fadeIn(lineLf - litAt, 12);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: MID_BAND.top, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 60, opacity: on, transform: `translateY(${(1 - on) * 30}px)` }}>
        <PersonCard lit={0} label="Degree" />
        <PersonCard lit={lit} label="Degree" />
      </div>
    </AbsoluteFill>
  );
}

// ── Line 24: job application card, a work sample slides onto it ──────────────

function FieldRow({ label, value, done, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderTop: "2px solid #EEF0F4" }}>
      <div>
        <div style={{ fontSize: 20, color: "#8A90A0", fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 26, color: "#1D2030", fontWeight: 800, marginTop: 2 }}>{value}</div>
      </div>
      {children ?? (done ? <Check /> : null)}
    </div>
  );
}

/** Job application card. The work-sample file slides on as "Send it with your application" is spoken. */
function ApplicationCard({ line, lineLf }) {
  const on = fadeIn(lineLf, 10);
  const sendAt = wordLf(line, "send", Math.round(line.speakingFrames * 0.6));
  const slide = fadeIn(lineLf - sendAt, 16);
  const attached = slide > 0.98;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: MID_BAND.top - 10,
          left: 150,
          width: 780,
          background: "#FFFFFF",
          borderRadius: 28,
          boxShadow: "0 24px 50px rgba(60,25,0,0.4)",
          padding: "30px 38px 26px",
          boxSizing: "border-box",
          fontFamily: FONT,
          opacity: on,
          transform: `translateY(${(1 - on) * 30}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#2E5E4E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 26 }}>HP</div>
          <div>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#1D2030" }}>Junior Data Analyst</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#6A7080" }}>Harbor &amp; Pine · Application</div>
          </div>
        </div>
        <FieldRow label="Resume" value="resume.pdf" done />
        <FieldRow label="Cover letter" value="Written" done />
        <FieldRow label="Work sample" value={attached ? "sample-project.pdf" : "Add a file"}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ transform: `translateX(${(1 - slide) * 600}px) rotate(${(1 - slide) * 12}deg)`, opacity: clamp01(slide * 3) }}>
              <FileIcon size={44} color="#E07B39" />
            </div>
            {attached && <Check />}
          </div>
        </FieldRow>
        <div style={{ marginTop: 14, height: 62, borderRadius: 16, background: attached ? "#3474A4" : "#B8C6D6", color: "#fff", fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
          Submit application
        </div>
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
      return <PhoneInbox lineLf={lineLf} />;
    case 7:
      return <FlashCuts lineLf={lineLf} />;
    case 12:
    case 14:
      return <TextCard line={line} lineLf={lineLf} />;
    case 19:
      return <SilhouettePair line={line} lineLf={lineLf} />;
    case 24:
      return <ApplicationCard line={line} lineLf={lineLf} />;
    default:
      return null;
  }
}
