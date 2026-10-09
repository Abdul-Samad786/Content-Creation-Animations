// Text helpers shared by the timeline, captions and the audio tools' output.

/** Remove ElevenLabs v3 performance tags like "[giggles]" from a line. */
export const stripTags = (s) => (s || "").replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();

/** Lower-case word without punctuation, for matching ("HE'S" → "he's"). */
export const normalizeWord = (w) =>
  (w || "").toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']/g, "").replace(/^'+|'+$/g, "");

const isPunctuationOnly = (token) => !/[a-z0-9]/i.test(token);

/** Caption words. Punctuation-only tokens ("—", "...") join the word before them. */
export function splitWords(text) {
  const words = [];
  for (const token of (text || "").split(/\s+/).filter(Boolean)) {
    if (words.length && isPunctuationOnly(token)) words[words.length - 1] += ` ${token}`;
    else words.push(token);
  }
  return words;
}

/** Rough syllable count, for estimating timing before audio exists. */
export function syllables(word) {
  const w = normalizeWord(word).replace(/'/g, "");
  if (!w) return 0;
  if (/^\d+$/.test(w)) return w.length * 1.5;
  const groups = w.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Extra pause (seconds) a speaker leaves after a word, from its punctuation. */
export function trailingPause(word) {
  if (/\.\.\.|…/.test(word)) return 0.32;
  if (/[.!?]["”']?$/.test(word)) return 0.2;
  if (/[,;:—-]["”']?$/.test(word)) return 0.1;
  return 0;
}

/**
 * Estimated word timing in seconds, used until the voice clip exists.
 * Leading "..." adds a hesitation before the first word.
 */
export function estimateWordTimes(text) {
  const words = splitWords(text);
  let t = /^\s*(\.\.\.|…)/.test(text || "") ? 0.35 : 0.05;
  return words.map((word) => {
    const shout = word === word.toUpperCase() && /[A-Z]{2,}/.test(word) ? 1.15 : 1;
    const dur = (0.1 + syllables(word) * 0.165) * shout;
    const out = { word, start: t, end: t + dur };
    t += dur + trailingPause(word) + 0.03;
    return out;
  });
}

/**
 * Caption words with timing from the generated audio's word list when it
 * matches, falling back to the estimate for any word it cannot place.
 * @param {string} text            caption text (no tags)
 * @param {{word,start,end}[]} audioWords  words from audio.json (seconds), may be null
 * @param {number} speakSeconds    total speaking length
 */
export function captionWordTimes(text, audioWords, speakSeconds) {
  const est = estimateWordTimes(text);
  if (!est.length) return [];
  const estEnd = est[est.length - 1].end || 1;
  const scaled = est.map((w) => ({
    word: w.word,
    start: (w.start / estEnd) * speakSeconds,
    end: (w.end / estEnd) * speakSeconds,
  }));
  if (!audioWords || !audioWords.length) return scaled;

  // Greedy in-order match on normalised words, looking a few words ahead
  const out = scaled.map((w) => ({ ...w, matched: false }));
  let j = 0;
  for (const w of out) {
    const target = normalizeWord(w.word.split(/\s+/)[0]);
    for (let k = j; k < Math.min(j + 4, audioWords.length); k++) {
      if (normalizeWord(audioWords[k].word) === target) {
        w.start = audioWords[k].start;
        w.end = audioWords[k].end;
        w.matched = true;
        j = k + 1;
        break;
      }
    }
  }
  // Unmatched words: spread between the matched neighbours
  for (let i = 0; i < out.length; i++) {
    if (out[i].matched) continue;
    let a = i - 1;
    while (a >= 0 && !out[a].matched) a--;
    let b = i + 1;
    while (b < out.length && !out[b].matched) b++;
    const from = a >= 0 ? out[a].end : 0;
    const to = b < out.length ? out[b].start : speakSeconds;
    const span = b - a - 1;
    const pos = i - a - 1;
    out[i].start = from + ((to - from) * pos) / span;
    out[i].end = from + ((to - from) * (pos + 1)) / span;
  }
  return out.map(({ word, start, end }) => ({ word, start, end }));
}
