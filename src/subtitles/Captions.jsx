import React from "react";
import { AbsoluteFill } from "remotion";
import { CAPTION_BAND, isHighIntensity, shakeOffset } from "../camera/rig";
import { textCardAt } from "../beats/textCards";
import { activeWordIndex, balanceCaption, normalizeWord, wordWindows } from "./captionTiming";

// Captions sit in a fixed band (CAPTION_BAND), top-anchored so the first line
// is always in the same place. They never enter the top 120px or bottom 200px
// platform-UI zones, never exceed 3 lines, and break into balanced lines so no
// word is left alone on the last line.
const SHAKE_PX_PER_UNIT = 420; // converts the camera shake (world units) to pixels

export const CAPTION_FONT = "Inter, system-ui, sans-serif";
const SHADOW = "0 3px 10px rgba(0,0,0,0.9)";
const HIGHLIGHT = "#FFD60A";
const RED = "#FF3B30";
const PAD_X = 30;
const PAD_Y = 18;
const LINE_HEIGHT = 1.18;
/** Widest a caption line may be, inside the box padding. */
const MAX_LINE_PX = 900 - PAD_X * 2;
/** Short pauses keep the caption up so it does not flicker between lines. */
const HOLD_THROUGH_PAUSE_FRAMES = 20;
const FADE_FRAMES = 6;

/** Line-specific overrides, keyed by dialogue line id. */
const LINE_OVERRIDES = {
  // Line 1: no caption for the first 0.5s, then the whole line at once
  1: { mode: "delayed-full", delayFrames: 15 },
};

const normalizedEmphasis = (entry) =>
  new Set((entry.emphasis ?? "").split(/\s+/).map(normalizeWord).filter(Boolean));

let measureCtx = null;
/** Text width in px from the browser's own font metrics (deterministic per browser). */
function measure(text, fontSize) {
  if (typeof document === "undefined") return text.length * fontSize * 0.56;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = `900 ${fontSize}px ${CAPTION_FONT}`;
  return measureCtx.measureText(text).width;
}

/** The caption entry on screen at `frame`, with its visibility (0..1). */
function captionEntryAt(frame, timeline) {
  for (const e of timeline) {
    if (!e.speakingFrames) continue; // silent lines (16) have no caption
    const lf = frame - e.startFrame;
    const hold = Math.min(e.pauseFrames, HOLD_THROUGH_PAUSE_FRAMES);
    const end = e.speakingFrames + hold;
    if (lf >= 0 && lf < end) {
      const fade = Math.min(1, (end - lf) / FADE_FRAMES);
      return { entry: e, lf, opacity: hold < e.pauseFrames ? fade : 1 };
    }
  }
  return null;
}

/** Word-by-word highlight: spoken words white, current word yellow, unspoken dimmed. */
function Words({ lines, windows, active, emphasis, color }) {
  let index = 0;
  return lines.map((words, li) => (
    <div key={li} style={{ whiteSpace: "nowrap" }}>
      {words.map((word, wi) => {
        const i = index++;
        const isCurrent = i === active;
        const isFuture = i > active;
        const isEmphasis = emphasis.has(normalizeWord(windows[i]?.word ?? word));
        return (
          <React.Fragment key={wi}>
            <span
              style={{
                color: isCurrent ? (color ?? HIGHLIGHT) : (color ?? "#FFFFFF"),
                opacity: isFuture ? (color ? 0.35 : 0.45) : 1,
                textDecoration: isEmphasis ? "underline" : undefined,
                textDecorationColor: HIGHLIGHT,
                textDecorationThickness: "6px",
                textUnderlineOffset: "10px",
              }}
            >
              {word}
            </span>
            {wi < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </div>
  ));
}

export default function Captions({ frame, timeline }) {
  const hit = captionEntryAt(frame, timeline);
  if (!hit) return null;
  const { entry, lf, opacity } = hit;

  // A text card owns the band while it is up
  if (textCardAt(entry, lf)) return null;

  const override = LINE_OVERRIDES[entry.lineId] ?? { mode: "default" };
  if (override.mode === "delayed-full" && lf < override.delayFrames) return null;

  const layout = balanceCaption(entry.text, measure, {
    maxLinePx: MAX_LINE_PX,
    maxLines: 3,
    maxHeightPx: CAPTION_BAND.bottom - CAPTION_BAND.top - PAD_Y * 2,
    lineHeight: LINE_HEIGHT,
  });

  // Emotional peaks (intensity High): red words, shaking with the camera punch-in
  const high = isHighIntensity(entry);
  const [dx, dy] = high ? shakeOffset(frame, lf) : [0, 0];
  const windows = wordWindows(entry);
  const active = override.mode === "delayed-full" ? windows.length : activeWordIndex(windows, lf);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: CAPTION_BAND.top,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity,
          transform: `translate(${dx * SHAKE_PX_PER_UNIT}px, ${dy * SHAKE_PX_PER_UNIT}px)`,
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontFamily: CAPTION_FONT,
            fontWeight: 900,
            fontSize: layout.fontSize,
            lineHeight: LINE_HEIGHT,
            textShadow: SHADOW,
            background: high ? "rgba(40,0,0,0.6)" : "rgba(0,0,0,0.5)",
            borderRadius: 18,
            padding: `${PAD_Y}px ${PAD_X}px`,
          }}
        >
          <Words
            lines={layout.lines}
            windows={windows}
            active={active}
            emphasis={normalizedEmphasis(entry)}
            color={high ? RED : undefined}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}
