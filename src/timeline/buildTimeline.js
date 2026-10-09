// Lines that hold a still camera with no movement or cut for their whole pause.
// Each must have a pauseAfter of at least STATIC_HOLD_MIN_SECONDS.
const STATIC_HOLD_LINE_IDS = [16, 26];
const STATIC_HOLD_MIN_SECONDS = 2;

// Speaking length for a line whose clip has not been generated or measured yet.
const PLACEHOLDER_SPEAKING_FRAMES = 90;

/**
 * Speaking length in whole frames.
 *   - audio null        → 0; the line is its pauseAfter only (line 16)
 *   - id in audioDurations → the measured audioDurations[id].frames, rounded up
 *     to a whole frame (Remotion sequences need integers)
 *   - id missing        → PLACEHOLDER_SPEAKING_FRAMES, so the composition still renders
 */
function speakingFramesFor(line, audioDurations) {
  if (!line.audio) return 0;
  const measured = audioDurations[String(line.id)]?.frames;
  return typeof measured === "number" ? Math.ceil(measured) : PLACEHOLDER_SPEAKING_FRAMES;
}

/**
 * Frame-accurate timeline from the dialogue lines.
 *
 * Each line's screen time is its speaking length (see speakingFramesFor)
 * followed by its pauseAfter (already in frames);
 * start and end frames run sequentially from those totals.
 *
 * @param {object[]} lines           - dialogue.lines
 * @param {number}   fps             - frames per second
 * @param {object}   audioDurations  - audioDurations.json: { "<id>": { file, frames } }
 * @returns {object[]}
 */
export function buildTimeline(lines, fps = 30, audioDurations = {}) {
  let frame = 0;
  return lines.map((line) => {
    const speakingFrames = speakingFramesFor(line, audioDurations);
    const pauseFrames = line.pauseAfter || 0;

    const isStaticHold = STATIC_HOLD_LINE_IDS.includes(line.id);
    if (isStaticHold && pauseFrames < STATIC_HOLD_MIN_SECONDS * fps) {
      throw new Error(
        `[buildTimeline] Line ${line.id} is a static hold but pauseAfter is ` +
          `${pauseFrames} frames; expected at least ${STATIC_HOLD_MIN_SECONDS * fps}.`,
      );
    }

    const startFrame = frame;
    const endFrame = startFrame + speakingFrames + pauseFrames;
    frame = endFrame;

    // Every dialogue field is carried through (face, eyes, body, reaction,
    // visualNote, audio, …) so consumers never need a second lookup into
    // dialogue.json. The timing fields below are computed and win on any clash.
    return {
      ...line,
      lineId: line.id,
      startFrame,
      speakingFrames,
      pauseFrames,
      endFrame,
      // Still-camera window, present only on static-hold lines: from the end of
      // speech through the end of the pause. Null everywhere else.
      staticHold: isStaticHold
        ? { startFrame: startFrame + speakingFrames, endFrame }
        : null,
    };
  });
}

/**
 * Timeline plus total composition length.
 *
 * The final pause is the closing hold, so it is counted once: the composition
 * ends when that hold ends, and the last frame cuts to black. The hold length
 * is checked against dialogue.endingNote.
 *
 * @param {{lines: object[], endingNote?: {holdFrames?: number}}} dialogue
 * @param {number} fps
 * @param {object} audioDurations - optional; if provided, used for real speaking durations.
 *                                   Falls back to placeholder (90 frames) if not found.
 */
export function buildComposition(dialogue, fps = 30, audioDurations = null) {
  // If audioDurations not provided, load it from the JSON file (blocking, sync).
  // This is called from Episode.jsx during render setup, so the composition can
  // adapt to real audio durations without needing props.
  let durations = audioDurations || {};
  if (!audioDurations) {
    try {
      // Require is a special case for JSON in Webpack; it's safe to use here.
      durations = require("../episodes/ep01-degree/audioDurations.json");
    } catch (e) {
      // If the file doesn't exist yet (fresh project), fall back to placeholder durations.
      durations = {};
    }
  }

  const timeline = buildTimeline(dialogue.lines, fps, durations);
  const last = timeline[timeline.length - 1];

  const expectedHold = dialogue.endingNote?.holdFrames;
  if (expectedHold !== undefined && last.pauseFrames !== expectedHold) {
    throw new Error(
      `[buildComposition] Line ${last.lineId} hold is ${last.pauseFrames} frames, ` +
        `endingNote expects ${expectedHold}.`,
    );
  }

  return {
    timeline,
    totalFrames: last.endFrame,
    holdFrames: last.pauseFrames,
  };
}
