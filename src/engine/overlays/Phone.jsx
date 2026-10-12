import React from "react";
import { clamp01, easeOutBack } from "../math";
import { FONT } from "../fonts";

// The chat screen: the star of a texting series. Sits in the lower half of the
// frame (above the platform's bottom UI) while the camera lifts the faces into
// the top half. Generic chat look — not any real app.

const W = 680;
const H = 640;
const BOTTOM = 1720; // keep clear of the platform UI below ~1720px

const PINK = "#FF6FAE";

export function Bubble({ m, frame, isLast, seen, seenSince, tailed }) {
  const me = m.from === "me";
  const age = frame - m.frame;
  const pop = m.frame < 0 ? 1 : easeOutBack(clamp01(age / 10), 2.2);
  const emojiOnly = /^\p{Extended_Pictographic}+$/u.test(m.text.trim());
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: me ? "flex-end" : "flex-start", margin: "6px 0" }}>
      <div
        style={{
          maxWidth: 470,
          padding: emojiOnly ? "4px 10px" : "16px 26px",
          borderRadius: 34,
          borderBottomRightRadius: me && tailed ? 10 : 34,
          borderBottomLeftRadius: !me && tailed ? 10 : 34,
          background: emojiOnly ? "transparent" : me ? `linear-gradient(135deg, #FF8EC2, ${PINK})` : "#F1EEF8",
          color: me ? "#FFFFFF" : "#2B1D3A",
          fontSize: emojiOnly ? 92 : 38,
          fontWeight: 500,
          lineHeight: 1.18,
          transform: `scale(${pop})`,
          transformOrigin: me ? "100% 100%" : "0% 100%",
          boxShadow: emojiOnly ? "none" : me ? "0 6px 14px rgba(255,111,174,0.35)" : "0 4px 10px rgba(60,40,90,0.08)",
        }}
      >
        {m.text}
      </div>
      {me && isLast && seen && (
        <div style={{ fontSize: 24, color: "#9A90AE", marginTop: 6, marginRight: 8, opacity: seenSince < 0 ? 1 : clamp01((frame - seenSince) / 8) }}>{seen} ✓✓</div>
      )}
    </div>
  );
}

export function TypingBubble({ frame, since }) {
  const pop = easeOutBack(clamp01((frame - since) / 8), 2.2);
  return (
    <div style={{ display: "flex", margin: "6px 0" }}>
      <div style={{ padding: "22px 28px", borderRadius: 34, borderBottomLeftRadius: 10, background: "#F1EEF8", display: "flex", gap: 10, transform: `scale(${pop})`, transformOrigin: "0% 100%" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "#A79CC0", transform: `translateY(${Math.sin(frame * 0.35 - i * 0.9) * 6}px)`, opacity: 0.6 + 0.4 * Math.sin(frame * 0.35 - i * 0.9) }} />
        ))}
      </div>
    </div>
  );
}

function CallScreen({ s, frame }) {
  const c = s.call;
  const since = frame - c.since;
  const connected = since > 40;
  const secs = Math.max(0, Math.floor((since - 40) / 30));
  const ended = c.ended != null && frame >= c.ended;
  const ring = Math.sin(frame * 0.3) * 0.5 + 0.5;
  const fadeOut = ended ? clamp01(1 - (frame - c.ended - 16) / 10) : 1;
  if (fadeOut <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: 44, background: "linear-gradient(180deg,#5B4A9E,#C77DB5)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 90, color: "#FFFFFF", opacity: fadeOut }}>
      <div style={{ position: "relative", width: 170, height: 170 }}>
        {!connected && !ended && <div style={{ position: "absolute", inset: -20 - ring * 16, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.5)", opacity: 1 - ring }} />}
        <div style={{ width: 170, height: 170, borderRadius: "50%", background: c.avatar || s.avatar, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 84, fontWeight: 600, border: "6px solid #FFFFFF" }}>{c.name[0]}</div>
      </div>
      <div style={{ fontSize: 58, fontWeight: 600, marginTop: 26 }}>{c.name}</div>
      <div style={{ fontSize: 34, opacity: 0.85, marginTop: 6 }}>
        {ended ? "call ended" : connected ? `00:${String(secs).padStart(2, "0")}` : `calling${".".repeat(1 + (Math.floor(frame / 8) % 3))}`}
      </div>
      <div style={{ position: "absolute", bottom: 50, width: 110, height: 110, borderRadius: "50%", background: "#FF5C6C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54, transform: "rotate(135deg)" }}>📞</div>
    </div>
  );
}

export default function Phone({ s, frame }) {
  if (s.slide <= 0.001) return null;
  const y = (1 - s.slide) * (H + 160);
  const msgs = s.messages.slice(-5);
  const last = msgs[msgs.length - 1];
  const caret = Math.floor(frame / 12) % 2 === 0;
  const status = s.typing ? "typing…" : "online";
  return (
    <div style={{ position: "absolute", left: (1080 - W) / 2, top: BOTTOM - H, width: W, height: H, transform: `translateY(${y}px) rotate(${(1 - s.slide) * 6}deg)`, fontFamily: FONT }}>
      {/* Phone body (pastel case) */}
      <div style={{ position: "absolute", inset: -16, borderRadius: 62, background: "linear-gradient(160deg,#FFC4DC,#FFA9CB)", boxShadow: "0 24px 50px rgba(40,20,70,0.45)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 46, background: "#FFFFFF", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 28px 18px", borderBottom: "2px solid #F1EEF8" }}>
          <div style={{ fontSize: 46, color: PINK, fontWeight: 600, marginRight: 4 }}>‹</div>
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: s.avatar, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 600 }}>{(s.contact || "?")[0]}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 38, fontWeight: 600, color: "#2B1D3A" }}>{s.contact}</div>
            <div style={{ fontSize: 24, color: s.typing ? PINK : "#9A90AE", fontWeight: s.typing ? 600 : 400 }}>{status}</div>
          </div>
        </div>
        {/* Messages, newest at the bottom */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "10px 26px" }}>
          {msgs.map((m, i) => (
            <Bubble key={`${m.frame}-${i}`} m={m} frame={frame} isLast={m === last} seen={s.seen} seenSince={s.seenSince} tailed={i === msgs.length - 1 || msgs[i + 1].from !== m.from} />
          ))}
          {s.typing && <TypingBubble frame={frame} since={s.typingSince} />}
        </div>
        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 22px 24px" }}>
          <div style={{ flex: 1, minHeight: 70, borderRadius: 36, background: "#F6F3FB", display: "flex", alignItems: "center", padding: "0 28px", fontSize: 34, color: s.draftShown ? "#2B1D3A" : "#B4ABC6", whiteSpace: "nowrap", overflow: "hidden" }}>
            {s.draftShown || (s.draft ? "" : "Message…")}
            {s.draft && <span style={{ display: "inline-block", width: 3, height: 40, marginLeft: 3, background: caret ? PINK : "transparent" }} />}
          </div>
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: s.draftShown ? PINK : "#E8E2F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: 38, fontWeight: 700, transform: `scale(${s.draftShown ? 1 + Math.sin(frame * 0.3) * 0.04 : 1})` }}>↑</div>
        </div>
        {s.call && <CallScreen s={s} frame={frame} />}
      </div>
    </div>
  );
}
