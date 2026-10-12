import React from "react";
import { clamp, clamp01, easeIn, easeOutBack, hash } from "../math";
import { FONT } from "../fonts";

// A system notification that pops up over the robot's screen face (Byte's
// "Software update available" running gag). Drawn in 2D, anchored to the
// robot's projected face every frame, with a minimum size so it stays
// readable in a 9:16 two-shot.
//
// Script actions (each may carry "at"), under a line's "popup":
//   { "text": "Software update available", "detail": "…", "icon": "⬇️", "buttons": ["Later", "Install"] }
//   { "dismiss": true }               swipe it away
//   { "glitch": true, "dur": 0.6 }    flicker / RGB-split (it keeps showing)

const POP_IN = 10;
const OUT = 8;

export function popupAt(plan, frame) {
  let cur = null;
  let glitch = 0;
  for (const e of plan.popup) {
    if (e.frame > frame) break;
    if (e.text != null) cur = { ...e, since: e.frame, dismissed: null };
    if (e.dismiss && cur && cur.dismissed == null) cur.dismissed = e.frame;
    if (e.glitch) {
      const dur = e.dur ?? 18;
      if (frame < e.frame + dur) glitch = 1 - (frame - e.frame) / dur;
    }
  }
  if (cur && cur.dismissed != null && frame - cur.dismissed >= OUT) cur = null;
  return cur ? { ...cur, glitch } : null;
}

/**
 * @param anchor {x, y, scale} | null   robot face centre in screen px
 */
// Keep clear of the caption band (overlays/Captions.jsx: top 330, up to 3 lines)
const CAPTIONS_BOTTOM = 600;

export default function ScreenPopup({ plan, frame, anchor }) {
  // No robot on screen (e.g. a close-up on someone else): nothing to sit on
  if (!plan.popup.length || !anchor || anchor.x < 0 || anchor.x > plan.width) return null;
  const p = popupAt(plan, frame);
  if (!p) return null;

  const t = frame - p.since;
  const pop = easeOutBack(clamp01(t / POP_IN), 2.2);
  const out = p.dismissed != null ? easeIn((frame - p.dismissed) / OUT) : 0;
  const s = clamp(anchor.scale * 0.55, 1.1, 1.4);
  const w = 520 * s;
  const left = clamp(anchor.x - w / 2, 24, plan.width - w - 24);
  const top = Math.max(anchor.y - 150 * s, CAPTIONS_BOTTOM);

  // Glitch: jitter, flicker, colour split
  const g = p.glitch;
  const jx = g ? (hash(frame * 1.7) - 0.5) * 34 * g : 0;
  const flicker = g && hash(frame * 3.1) < 0.35 * g ? 0.25 : 1;
  const split = g ? `${6 * g}px 0 0 rgba(255,60,120,0.8), ${-6 * g}px 0 0 rgba(60,220,255,0.8)` : "none";

  return (
    <div
      style={{
        position: "absolute",
        left: left + jx + out * 260,
        top,
        width: w,
        fontFamily: FONT,
        transform: `scale(${pop * (1 - out * 0.3)})`,
        transformOrigin: "50% 100%",
        opacity: (1 - out) * flicker,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 * s, padding: `${16 * s}px ${22 * s}px`, borderRadius: 26 * s, background: "rgba(255,255,255,0.97)", boxShadow: "0 14px 28px rgba(30,15,60,0.4)", border: "3px solid #E3E9F6" }}>
        <div style={{ flex: "none", width: 64 * s, height: 64 * s, borderRadius: 16 * s, background: "linear-gradient(160deg,#5EA2FF,#2F6BFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 * s, color: "#FFFFFF" }}>{p.icon || "⬇"}</div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ fontSize: 34 * s, fontWeight: 700, color: "#1F2A44", lineHeight: 1.12, textShadow: split }}>{p.text}</div>
          {p.detail && <div style={{ fontSize: 26 * s, fontWeight: 500, color: "#D6336C", marginTop: 4 * s, lineHeight: 1.15 }}>{p.detail}</div>}
          {p.buttons && (
            <div style={{ display: "flex", gap: 10 * s, marginTop: 10 * s }}>
              {p.buttons.map((b, i) => (
                <div key={b} style={{ fontSize: 24 * s, fontWeight: 600, padding: `${4 * s}px ${16 * s}px`, borderRadius: 14 * s, background: i === p.buttons.length - 1 ? "#2F6BFF" : "#EEF2FA", color: i === p.buttons.length - 1 ? "#FFFFFF" : "#44506B" }}>{b}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
