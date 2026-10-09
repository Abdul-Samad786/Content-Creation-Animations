import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { shakeOffset } from "../camera/rig";
import { activeWordIndex, fitFontSize, normalizeWord, wordWindows } from "./captionTiming";

// Caption boxes are anchored by their bottom edge (see captionClearance in camera/rig.js),
// so they always clear the top of the characters. Nothing sits in the bottom 400px.
// The font shrinks when a long caption would run off the top of the frame.
const SHAKE_PX_PER_UNIT = 420; // converts the camera shake (world units) to pixels
const TOP_MARGIN_PX = 24; // smallest gap kept between the caption box and the top of the frame

const FONT = "Inter, system-ui, sans-serif";
const SHADOW = "0 3px 10px rgba(0,0,0,0.9)";
const HIGHLIGHT = "#FFD60A";
const RED = "#FF3B30";

/**
 * Line-specific overrides, keyed by dialogue line id.
 *   1  — no caption for the first 0.5s, then the whole line at once
 *   15 — red, shaking with the camera snap-in on line 15
 */
const LINE_OVERRIDES = {
  1: { mode: "delayed-full", delayFrames: 15 },
  15: { mode: "word", color: RED, shake: true },
};

const normalizedEmphasis = (entry) =>
  new Set((entry.emphasis ?? "").split(/\s+/).map(normalizeWord).filter(Boolean));

const baseBox = {
  maxWidth: 920,
  textAlign: "center",
  fontFamily: FONT,
  fontWeight: 900,
  fontSize: 76,
  lineHeight: 1.2,
  textShadow: SHADOW,
  background: "rgba(0,0,0,0.5)",
  borderRadius: 18,
  padding: "18px 28px",
};

/**
 * Default: word-by-word highlight. Spoken words are white, the current word yellow,
 * unspoken words dimmed. The line's emphasis word(s) are underlined in yellow.
 */
function WordHighlight({ entry, lineLf, color }) {
  const windows = wordWindows(entry);
  const active = activeWordIndex(windows, lineLf);
  const emphasis = normalizedEmphasis(entry);
  return (
    <>
      {windows.map((w, i) => {
        const isCurrent = i === active;
        const isFuture = i > active;
        const isEmphasis = emphasis.has(normalizeWord(w.word));
        return (
          <React.Fragment key={i}>
            <span
              style={{
                color: isCurrent ? (color ?? HIGHLIGHT) : (color ?? "#FFFFFF"),
                opacity: isFuture ? (color ? 0.3 : 0.45) : 1,
                textDecoration: isEmphasis ? "underline" : undefined,
                textDecorationColor: HIGHLIGHT,
                textDecorationThickness: "6px",
                textUnderlineOffset: "10px",
              }}
            >
              {w.word}
            </span>
            {i < windows.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function Captions({ frame, timeline, bottomPx }) {
  const entry = timeline.find(
    (e) => frame >= e.startFrame && frame < e.startFrame + e.speakingFrames,
  );
  if (!entry) return null;

  const lineLf = frame - entry.startFrame;
  const override = LINE_OVERRIDES[entry.lineId] ?? { mode: "default" };
  const fontSize = fitFontSize(entry.text, bottomPx - TOP_MARGIN_PX);

  // Line 1: nothing for the first 0.5s, then the whole line at once.
  if (override.mode === "delayed-full") {
    if (lineLf < override.delayFrames) return null;
    return (
      <CaptionBox bottomPx={bottomPx} fontSize={fontSize}>
        <span style={{ color: "#FFFFFF" }}>{entry.text}</span>
      </CaptionBox>
    );
  }

  // Line 15: red, shaking in sync with the camera snap-in shake.
  if (override.mode === "word") {
    const [dx, dy] = override.shake ? shakeOffset(frame, lineLf) : [0, 0];
    return (
      <CaptionBox
        bottomPx={bottomPx}
        fontSize={fontSize}
        offset={[dx * SHAKE_PX_PER_UNIT, dy * SHAKE_PX_PER_UNIT]}
      >
        <WordHighlight entry={entry} lineLf={lineLf} color={override.color} />
      </CaptionBox>
    );
  }

  return (
    <CaptionBox bottomPx={bottomPx} fontSize={fontSize}>
      <WordHighlight entry={entry} lineLf={lineLf} />
    </CaptionBox>
  );
}

function CaptionBox({ children, offset = [0, 0], fontSize, bottomPx }) {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 1920 - bottomPx,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `translate(${offset[0]}px, ${offset[1]}px)`,
        }}
      >
        <div style={{ ...baseBox, fontSize }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
}

/** Hook overlay above Human, from 0:00 to 0:03 (converted to frames via fps). */
export function HookOverlay({ frame, fps }) {
  const end = Math.round(3 * fps);
  if (frame >= end) return null;

  const opacity = interpolate(frame, [0, 6, end - 6, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 980,
          left: 60,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 56,
          color: "#FFFFFF",
          textShadow: SHADOW,
          opacity,
        }}
      >
        140 applications. 3 replies.
      </div>
    </AbsoluteFill>
  );
}

