// Text cards that echo a spoken phrase ("COULD YOU?", "HAVE YOU?").
// A card takes the caption band while it is up and the caption steps aside,
// so the two never compete for the same space. Timing comes from the words
// themselves, so it follows the audio length.

import { wordWindows, normalizeWord } from "../subtitles/captionTiming";

/**
 * Card per line: shown from the spoken `from` word until `until` (a word, end
 * of that word plus `tail` frames) or the end of the line.
 */
const CARDS = {
  12: { text: "COULD YOU?", from: "could" },
  14: { text: "HAVE YOU?", swapFrom: "COULD YOU?", from: "have", until: "you", tail: 12 },
};

function findWord(windows, word, startIndex = 0) {
  for (let i = startIndex; i < windows.length; i++) {
    if (normalizeWord(windows[i].word) === word) return i;
  }
  return -1;
}

/**
 * The card active at `lf` frames into `line`, or null.
 * @returns {null | {text:string, swapFrom?:string, lf:number}}  lf = frames since the card appeared
 */
export function textCardAt(line, lf) {
  const card = line && CARDS[line.lineId];
  if (!card) return null;
  const windows = wordWindows(line);
  const fromIndex = findWord(windows, card.from);
  if (fromIndex < 0) return null;
  const start = windows[fromIndex].start;
  let end = line.endFrame - line.startFrame;
  if (card.until) {
    const untilIndex = findWord(windows, card.until, fromIndex + 1);
    if (untilIndex >= 0) end = windows[untilIndex].end + (card.tail || 0);
  }
  if (lf < start || lf >= end) return null;
  return { text: card.text, swapFrom: card.swapFrom, lf: lf - start, remaining: end - lf };
}
