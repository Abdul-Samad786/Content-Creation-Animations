import React from "react";
import { clamp01, easeIn } from "../math";
import { FONT } from "../fonts";
import { Bubble, TypingBubble } from "./Phone";

// Chat bubbles that float in the scene instead of on the phone — for someone
// who only ever exists as text (Leo across the café table). Same bubble look
// as the phone chat (reuses its Bubble / TypingBubble).
//
// Script actions (each may carry "at"), under a line's "bubble":
//   { "text": "i got it", "from": "them", "name": "Leo", "pos": "right" }
//   { "typing": true | false, "pos": "right" }
//   { "clear": true }                 fade every bubble out

const POS = {
  right: { right: 60, top: 1080, align: "flex-start" },
  left: { left: 60, top: 1080, align: "flex-end" },
  center: { left: 200, top: 1300, align: "flex-start" },
  "low-right": { right: 60, top: 1380, align: "flex-start" },
  "low-left": { left: 60, top: 1380, align: "flex-end" },
};
const W = 560;
const KEEP = 3;
// Bigger than the phone chat: these float in a full 9:16 scene, not on a screen
const SCALE = 1.3;

export function floatingChatAt(plan, frame) {
  const s = { messages: [], typing: false, typingSince: -1000, pos: "right", name: null, clearedAt: null };
  for (const e of plan.bubbles) {
    if (e.frame > frame) break;
    if (e.pos) s.pos = e.pos;
    if (e.name) s.name = e.name;
    if (e.clear) {
      s.clearedAt = e.frame;
      continue;
    }
    if (e.typing != null) {
      if (e.typing && !s.typing) s.typingSince = e.frame;
      s.typing = !!e.typing;
    }
    if (e.text != null) {
      if (s.clearedAt != null) {
        s.messages = [];
        s.clearedAt = null;
      }
      s.messages.push({ from: e.from || "them", text: e.text, frame: e.frame });
      s.typing = false;
    }
  }
  if (s.clearedAt != null && frame - s.clearedAt > 10) {
    s.messages = [];
    s.typing = false;
  }
  return s;
}

export default function FloatingChat({ plan, frame }) {
  if (!plan.bubbles.length) return null;
  const s = floatingChatAt(plan, frame);
  if (!s.messages.length && !s.typing) return null;
  const pos = POS[s.pos] || POS.right;
  const fade = s.clearedAt != null ? 1 - easeIn((frame - s.clearedAt) / 10) : 1;
  const msgs = s.messages.slice(-KEEP);
  const first = msgs[0]?.frame ?? s.typingSince;
  const drift = Math.sin(frame * 0.05) * 6;
  const label = clamp01((frame - first) / 8);
  return (
    <div style={{ position: "absolute", top: pos.top + drift, left: pos.left, right: pos.right, width: W, display: "flex", flexDirection: "column", alignItems: pos.align, fontFamily: FONT, opacity: fade, filter: "drop-shadow(0 12px 18px rgba(30,15,60,0.35))", transform: `scale(${SCALE})`, transformOrigin: pos.right != null ? "100% 0%" : "0% 0%" }}>
      {s.name && (
        <div style={{ fontSize: 30, fontWeight: 600, color: "#FFFFFF", background: "rgba(43,29,58,0.6)", borderRadius: 24, padding: "4px 18px", marginBottom: 6, opacity: label }}>💬 {s.name}</div>
      )}
      <div style={{ width: W }}>
        {msgs.map((m, i) => (
          <Bubble key={`${m.frame}-${i}`} m={m} frame={frame} isLast={i === msgs.length - 1} tailed={i === msgs.length - 1 || msgs[i + 1].from !== m.from} />
        ))}
        {s.typing && <TypingBubble frame={frame} since={s.typingSince} />}
      </div>
    </div>
  );
}
