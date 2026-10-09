// Word timing for captions. Pure functions of the timeline, so every render is identical.
//
// Each line's real speaking length (speakingFrames, from audioDurations.json)
// is split across its words in proportion to word length, so long words get
// more time than short ones. The pause after the line is not part of the caption.

export function splitWords(text) {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Per-word windows in frames, relative to the start of the line.
 * The last word always ends exactly at speakingFrames.
 */
export function wordWindows(entry) {
  const words = splitWords(entry.text);
  const weights = words.map((w) => w.length + 1); // +1 for the following space
  const total = weights.reduce((sum, w) => sum + w, 0);

  let acc = 0;
  return words.map((word, i) => {
    const start = Math.round((entry.speakingFrames * acc) / total);
    acc += weights[i];
    const end = Math.round((entry.speakingFrames * acc) / total);
    return { word, start, end };
  });
}

// ── Caption box fitting ──────────────────────────────────────────────────────
// The box is 920px wide (maxWidth) with 28px side padding, and 18px top and bottom.
// Glyph width is estimated at 0.52em, a little wider than the bold sans fallback,
// so the estimate errs toward taller boxes.

const BOX_TEXT_WIDTH_PX = 920 - 56;
const BOX_VERTICAL_PADDING_PX = 36;
const BOX_LINE_HEIGHT = 1.2;
const GLYPH_EM = 0.52;

/** Font sizes tried in order, largest first. */
export const CAPTION_FONT_SIZES = [76, 68, 60, 52, 46];

/** Number of lines the text wraps to at `fontSize`, using greedy word wrap. */
export function captionLineCount(text, fontSize) {
  const perLine = Math.floor(BOX_TEXT_WIDTH_PX / (GLYPH_EM * fontSize));
  let lines = 1;
  let current = 0;
  for (const word of splitWords(text)) {
    const needed = current === 0 ? word.length : current + 1 + word.length;
    if (needed > perLine && current > 0) {
      lines += 1;
      current = word.length;
    } else {
      current = needed;
    }
  }
  return lines;
}

/** Estimated height of the caption box in px. */
export function captionBoxHeight(text, fontSize) {
  return captionLineCount(text, fontSize) * fontSize * BOX_LINE_HEIGHT + BOX_VERTICAL_PADDING_PX;
}

/**
 * Largest font size whose wrapped box fits in `availablePx` (the room between
 * the top of the frame and the caption's bottom edge). Falls back to the
 * smallest size when nothing fits.
 */
export function fitFontSize(text, availablePx) {
  for (const fontSize of CAPTION_FONT_SIZES) {
    if (captionBoxHeight(text, fontSize) <= availablePx) return fontSize;
  }
  return CAPTION_FONT_SIZES[CAPTION_FONT_SIZES.length - 1];
}

/** Lower-case form of a word, without punctuation, for matching emphasis words. */
export function normalizeWord(word) {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/** Index of the word active at `lineLf`, or -1 before the first word. */
export function activeWordIndex(windows, lineLf) {
  let active = -1;
  windows.forEach((w, i) => {
    if (lineLf >= w.start) active = i;
  });
  return active;
}
