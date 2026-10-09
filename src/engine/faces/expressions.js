// Face presets used by scripts: `"face": "panic"`.
//
// Each preset picks a drawing for the eyes, mouth and brows (see drawFace.js)
// plus a blush amount. Both character styles (the anime girl face and Byte's
// screen face) draw from the same presets, so one word in a script works for
// any character.

export const EXPRESSIONS = {
  neutral: { eyes: "open", mouth: "smile", brows: "neutral", blush: 0.35 },
  happy: { eyes: "happy", mouth: "grin", brows: "raised", blush: 0.55 },
  joy: { eyes: "happy", mouth: "open-smile", brows: "raised", blush: 0.8 },
  excited: { eyes: "sparkle", mouth: "open-smile", brows: "raised", blush: 0.6 },
  sparkle: { eyes: "star", mouth: "open-smile", brows: "raised", blush: 0.7 },
  love: { eyes: "heart", mouth: "cat", brows: "raised", blush: 1 },
  warm: { eyes: "happy", mouth: "smile", brows: "worried", blush: 0.6 },
  hopeful: { eyes: "sparkle", mouth: "small-o", brows: "worried", blush: 0.5 },
  flustered: { eyes: "squint", mouth: "wavy", brows: "worried", blush: 1 },
  embarrassed: { eyes: "teary", mouth: "wavy", brows: "worried", blush: 1 },
  smug: { eyes: "smug", mouth: "smirk", brows: "raised", blush: 0.35 },
  curious: { eyes: "open", mouth: "small-o", brows: "tilt", blush: 0.35 },
  focused: { eyes: "suspicious", mouth: "flat", brows: "determined", blush: 0.25 },
  suspicious: { eyes: "suspicious", mouth: "smirk", brows: "angry", blush: 0.2 },
  determined: { eyes: "open", mouth: "grin", brows: "determined", blush: 0.4 },
  deadpan: { eyes: "flat", mouth: "flat", brows: "flat", blush: 0.15 },
  worried: { eyes: "open", mouth: "wavy", brows: "worried", blush: 0.3 },
  nervous: { eyes: "teary", mouth: "wavy", brows: "worried", blush: 0.4 },
  "nervous-smile": { eyes: "happy", mouth: "wavy-smile", brows: "worried", blush: 0.6 },
  sad: { eyes: "teary", mouth: "frown", brows: "worried", blush: 0.3 },
  crying: { eyes: "cry", mouth: "wail", brows: "worried", blush: 0.5 },
  panic: { eyes: "shocked", mouth: "scream", brows: "worried", blush: 0.2 },
  shocked: { eyes: "shocked", mouth: "o", brows: "raised", blush: 0.2 },
  dizzy: { eyes: "spiral", mouth: "wavy", brows: "worried", blush: 0.3 },
  relieved: { eyes: "closed", mouth: "smile", brows: "worried", blush: 0.45 },
  sleepy: { eyes: "sleepy", mouth: "small-o", brows: "flat", blush: 0.35 },
  angry: { eyes: "suspicious", mouth: "frown", brows: "angry", blush: 0.5 },
};

export const FACE_NAMES = Object.keys(EXPRESSIONS);

/** Eye drawings that should never blink (already closed or stylised). */
export const NO_BLINK_EYES = new Set(["happy", "closed", "cry", "spiral", "heart", "star", "squint", "flat"]);
