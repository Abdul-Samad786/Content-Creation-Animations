// Replays the phone events up to `frame` to get the chat screen's state.
//
// Script actions (each may carry "at"):
//   { "show": true } / { "hide": true }
//   { "send": "text" }          a message from Mia appears (clears the draft)
//   { "receive": "text" }       a message from the contact appears (stops typing)
//   { "typing": true | false }  the contact's "typing…" bubble
//   { "draft": "text", "dur": 0.8 }  Mia types into the input box over dur seconds
//   { "clear": true }           delete the draft
//   { "seen": "Seen 9:41 PM" }  read receipt under Mia's last message
//   { "call": "Mom", "avatar": "#FFB347" } / { "endCall": true }   (avatar defaults to the chat's)

import { clamp01, easeIn, easeOutBack } from "../math";

export function phoneStateAt(plan, frame) {
  const init = plan.episode.phone || {};
  const s = {
    contact: init.contact || "",
    avatar: init.avatar || "#7FB3FF",
    visible: !!init.visible,
    visibleSince: -1000,
    hiddenSince: -1000,
    messages: (init.messages || []).map((m, i) => ({ ...m, frame: -1000 + i })),
    typing: false,
    typingSince: -1000,
    draft: null,
    seen: init.seen || null,
    seenSince: -1000,
    call: null,
    lastSent: -1000,
  };
  const show = (f) => {
    if (!s.visible) {
      s.visible = true;
      s.visibleSince = f;
    }
  };

  for (const e of plan.phone) {
    if (e.frame > frame) break;
    const f = e.frame;
    if (e.show) show(f);
    if (e.hide) {
      s.visible = false;
      s.hiddenSince = f;
    }
    if (e.typing != null) {
      if (e.typing) show(f);
      if (e.typing && !s.typing) s.typingSince = f;
      s.typing = !!e.typing;
    }
    if (e.draft != null) {
      show(f);
      s.draft = { text: e.draft, start: f, dur: e.dur ?? Math.max(8, e.draft.length * 2) };
    }
    if (e.clear) s.draft = null;
    if (e.send != null) {
      show(f);
      s.messages.push({ from: "me", text: e.send, frame: f });
      s.draft = null;
      s.seen = null;
      s.lastSent = f;
    }
    if (e.receive != null) {
      show(f);
      s.messages.push({ from: "them", text: e.receive, frame: f });
      s.typing = false;
      s.seen = null;
    }
    if (e.seen != null) {
      s.seen = e.seen;
      s.seenSince = f;
    }
    if (e.call != null) {
      show(f);
      s.call = { name: e.call, avatar: e.avatar, since: f, ended: null };
    }
    if (e.endCall && s.call) s.call = { ...s.call, ended: f };
  }

  // Slide amount 0..1 (springy in, quick out)
  s.slide = s.visible ? clamp01(easeOutBack((frame - s.visibleSince) / 16, 1.4)) : 1 - easeIn((frame - s.hiddenSince) / 10);
  s.slide = Math.max(0, s.slide);
  // For the camera: 0..1 without overshoot
  s.amount = s.visible ? clamp01((frame - s.visibleSince) / 12) : clamp01(1 - (frame - s.hiddenSince) / 10);

  if (s.draft) {
    const n = s.draft.text.length;
    const shown = Math.round(n * clamp01((frame - s.draft.start) / s.draft.dur));
    s.draftShown = Array.from(s.draft.text).slice(0, shown).join("");
  } else {
    s.draftShown = "";
  }
  return s;
}
