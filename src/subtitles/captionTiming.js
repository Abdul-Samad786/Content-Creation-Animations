// Word timing for captions. Pure functions of the timeline, so every render is identical.
//
// Each line's real speaking length (speakingFrames, from audioDurations.json)
// is split across its words in proportion to word length, so long words get
// more time than short ones.

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

// ── Caption layout ───────────────────────────────────────────────────────────

/** Font sizes tried in order, largest first. */
export const CAPTION_FONT_SIZES = [72, 66, 60, 54, 48, 44];

/** Every way to split `n` words into `k` non-empty consecutive lines (k ≤ 3). */
function splits(n, k) {
  if (k === 1) return [[n]];
  const out = [];
  if (k === 2) {
    for (let a = 1; a < n; a++) out.push([a, n - a]);
  } else {
    for (let a = 1; a < n - 1; a++) {
      for (let b = 1; a + b < n; b++) out.push([a, b, n - a - b]);
    }
  }
  return out;
}

/**
 * Balanced caption lines: the largest font, then the fewest lines, whose widest
 * line fits `maxLinePx` and whose block fits `maxHeightPx`. Among the splits for
 * that line count it picks the most even one, and it never leaves a single short
 * word alone on a line.
 *
 * @param {string} text
 * @param {(text:string, fontSize:number) => number} measure  text width in px
 * @returns {{fontSize:number, lines:string[][]}}
 */
export function balanceCaption(text, measure, { maxLinePx, maxLines = 3, maxHeightPx, lineHeight = 1.2 }) {
  const words = splitWords(text);
  let fallback = null;
  for (const fontSize of CAPTION_FONT_SIZES) {
    const maxK = Math.min(maxLines, words.length, Math.floor(maxHeightPx / (fontSize * lineHeight)));
    for (let k = 1; k <= maxK; k++) {
      let best = null;
      for (const sizes of splits(words.length, k)) {
        let i = 0;
        const lines = sizes.map((count) => words.slice(i, (i += count)));
        const widths = lines.map((l) => measure(l.join(" "), fontSize));
        const widest = Math.max(...widths);
        if (widest > maxLinePx) continue;
        const orphan = k > 1 && lines.some((l) => l.length === 1 && l[0].length < 7);
        const score = widest + (widest - Math.min(...widths)) * 0.25 + (orphan ? 400 : 0);
        if (!best || score < best.score) best = { score, lines };
      }
      if (best) return { fontSize, lines: best.lines };
    }
    fallback = { fontSize, lines: [words] };
  }
  return fallback;
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
