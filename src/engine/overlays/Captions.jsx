import React from "react";
import { clamp01, easeOutBack } from "../math";
import { FONT } from "../fonts";

// Karaoke captions: each word pops in as it is spoken, the current word in the
// speaker's colour. They live in a fixed band near the top, clear of the
// platform UI, and break into at most three balanced lines.

const BAND_TOP = 330;
const MAX_W = 920;
const SIZES = [74, 68, 62, 56, 50];
const LINE_H = 1.14;
const HOLD = 12; // frames a caption stays up into the pause
const FADE = 5;

let measureCtx = null;
function measure(text, size) {
  if (typeof document === "undefined") return text.length * size * 0.55;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = `700 ${size}px Fredoka`;
  return measureCtx.measureText(text).width;
}

/** Largest size and fewest, most even lines that fit. */
function layout(words) {
  for (const size of SIZES) {
    const maxLines = 3;
    for (let k = 1; k <= Math.min(maxLines, words.length); k++) {
      let best = null;
      const splits = [];
      const rec = (start, left, acc) => {
        if (left === 1) return splits.push([...acc, words.length - start]);
        for (let n = 1; start + n <= words.length - (left - 1); n++) rec(start + n, left - 1, [...acc, n]);
      };
      rec(0, k, []);
      for (const sizes of splits) {
        let i = 0;
        const lines = sizes.map((n) => words.slice(i, (i += n)));
        const widths = lines.map((l) => measure(l.join(" "), size));
        const widest = Math.max(...widths);
        if (widest > MAX_W - 40) continue;
        const score = widest - Math.min(...widths) + (lines.some((l) => l.length === 1 && l[0].length < 5 && k > 1) ? 300 : 0);
        if (!best || score < best.score) best = { score, lines };
      }
      if (best) return { size, lines: best.lines };
    }
  }
  return { size: SIZES[SIZES.length - 1], lines: [words] };
}

export default function Captions({ plan, frame }) {
  const line = plan.lines.find((l) => l.kind === "say" && frame >= l.startFrame && frame < l.startFrame + l.speakFrames + Math.min(HOLD, l.pauseFrames));
  if (!line) return null;
  const lf = frame - line.startFrame;
  const end = line.speakFrames + Math.min(HOLD, line.pauseFrames);
  const opacity = clamp01((end - lf) / FADE);
  const words = line.words.map((w) => w.word);
  const { size, lines } = layout(words);
  const speaker = plan.cast[line.speaker];
  const color = speaker?.color || "#FFD60A";
  let idx = 0;

  return (
    <div style={{ position: "absolute", left: (1080 - MAX_W) / 2, top: BAND_TOP, width: MAX_W, display: "flex", flexDirection: "column", alignItems: "center", opacity, fontFamily: FONT }}>
      {line.offscreen && (
        <div style={{ fontSize: 34, fontWeight: 600, color: "#FFFFFF", background: color, borderRadius: 30, padding: "6px 22px", marginBottom: 12, border: "4px solid #FFFFFF" }}>📞 {speaker.name}</div>
      )}
      {lines.map((ws, li) => (
        <div key={li} style={{ display: "flex", gap: size * 0.26, lineHeight: LINE_H, whiteSpace: "nowrap" }}>
          {ws.map((word) => {
            const i = idx++;
            const w = line.words[i];
            const started = lf >= w.start;
            const nextStart = i < line.words.length - 1 ? line.words[i + 1].start : w.end + 6;
            const current = started && lf < nextStart;
            const pop = started ? easeOutBack(clamp01((lf - w.start) / 5), 2.6) : 0;
            const scale = started ? 0.6 + 0.4 * pop + (current ? 0.06 : 0) : 0.6;
            return (
              <span
                key={i}
                style={{
                  fontSize: size,
                  fontWeight: 700,
                  color: current ? color : "#FFFFFF",
                  WebkitTextStroke: `${Math.round(size * 0.17)}px #2B1D3A`,
                  paintOrder: "stroke fill",
                  textShadow: "0 6px 0 rgba(43,29,58,0.55)",
                  opacity: started ? 1 : 0,
                  transform: `scale(${scale}) translateY(${current ? -3 : 0}px)`,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
