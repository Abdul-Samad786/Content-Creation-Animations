// Character performance from the script.
//
// Every dialogue line carries direction for both characters: the speaker's
// `face`, `eyes` and `body`, and the listener's `reaction`. This module turns
// that text into keyframed tracks (expression, gaze, pose) plus procedural
// layers (talking mouth, blinks, breathing, nods, laughs).
//
// Everything is a pure function of the frame number and the timeline, built
// once up front. Remotion renders frames out of order and in parallel, so no
// state may carry from one frame to the next.

import { EXPRESSIONS, speakerExpression, listenerExpression } from './expressions.js'
import { GAZE, parseEyes } from './gaze.js'
import { wordWindows, normalizeWord } from '../subtitles/captionTiming.js'

const clamp01 = (t) => Math.min(Math.max(t, 0), 1)
const easeInOut = (t) => {
  const x = clamp01(t)
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}
const lerp = (a, b, t) => a + (b - a) * t

/** Deterministic pseudo-random in [0, 1). */
const hash = (n) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return s - Math.floor(s)
}

// ── Keyframe track ───────────────────────────────────────────────────────────

/**
 * Keys of flat numeric objects. The value at a frame eases from the previous
 * key's value to the current key's value over that key's `blend` frames.
 */
class Track {
  constructor(initial) {
    this.keys = [{ frame: -Infinity, value: initial, blend: 0 }]
  }

  add(frame, value, blend) {
    const prev = this.keys[this.keys.length - 1]
    // Same frame (or earlier, after rounding): the newer key wins
    if (frame <= prev.frame) {
      prev.value = { ...prev.value, ...value }
      return
    }
    this.keys.push({ frame, value: { ...prev.value, ...value }, blend })
  }

  at(frame) {
    const keys = this.keys
    let i = 0
    for (let k = 1; k < keys.length; k++) {
      if (keys[k].frame <= frame) i = k
      else break
    }
    const key = keys[i]
    if (i === 0 || key.blend <= 0) return key.value
    const t = easeInOut((frame - key.frame) / key.blend)
    if (t >= 1) return key.value
    const from = keys[i - 1].value
    const out = {}
    for (const name of Object.keys(key.value)) {
      out[name] = lerp(from[name] ?? key.value[name], key.value[name], t)
    }
    return out
  }
}

// ── Timing helpers ───────────────────────────────────────────────────────────

/** Frame offset (from line start) of the first spoken word matching `word`. */
function wordFrame(line, word) {
  if (!line.speakingFrames) return null
  const target = normalizeWord(word.split(/\s+/)[0])
  const hit = wordWindows(line).find((w) => normalizeWord(w.word) === target)
  return hit ? hit.start : null
}

/** Quoted word after "on", e.g. `then back up to Human on "worst"`. */
function cueWord(text) {
  const m = /on ["“']([^"”']+)["”']/.exec(text || '')
  return m ? m[1] : null
}

/** Frame offset for a cue: its quoted word if spoken, else a fraction of the line. */
function cueFrame(line, text, fraction) {
  const word = cueWord(text)
  const at = word ? wordFrame(line, word) : null
  if (at !== null) return at
  const span = line.speakingFrames || line.endFrame - line.startFrame
  return Math.round(span * fraction)
}

/** Mouth amplitude from the line's intensity (and "barely moving" direction). */
export function talkAmplitude(line) {
  const i = (line.intensity || '').toLowerCase()
  let amp = /high/.test(i) ? 1.0 : /medium/.test(i) ? 0.78 : 0.58
  if (/barely moving/.test((line.face || '').toLowerCase())) amp *= 0.55
  return amp
}

export const isHighIntensity = (line) => /high/i.test(line?.intensity || '')

/** Intensity rising across the line ("Medium rising to High"). */
const risesToHigh = (line) => /rising to high/i.test(line?.intensity || '')

// ── Gaze vectors ─────────────────────────────────────────────────────────────
// x = toward the other character (+) or away (-), y = up (+) / down (-).
// Characters mirror x when applying it, so both rigs use the same table.

const GAZE_VEC = {
  [GAZE.AT_OTHER]: { x: 1, y: 0.02 },
  [GAZE.PAST_OTHER]: { x: 0.7, y: 0.12 },
  [GAZE.SIDE_AT_OTHER]: { x: 0.85, y: -0.05 },
  [GAZE.DOWN]: { x: 0.1, y: -0.85 },
  [GAZE.DOWN_SIDE]: { x: -0.55, y: -0.6 },
  [GAZE.CAMERA]: { x: 0, y: 0.05 },
  UNFOCUSED: { x: 0.2, y: -0.25 },
}

/** Ordered gaze clauses of an `eyes` direction, with the frame each starts. */
function speakerGazeKeys(line) {
  const eyes = line.eyes || ''
  const lower = eyes.toLowerCase()
  if (/from human to camera/.test(lower)) {
    return [
      { lf: 0, key: GAZE.AT_OTHER },
      { lf: cueFrame(line, eyes, 0.6), key: GAZE.CAMERA },
    ]
  }
  // Only "then …" (or ", back …" / ", away …") starts a new look; other commas are description
  const clauses = eyes.split(/,?\s+then\s+|,\s+(?=back|away)/i).map((c) => c.trim()).filter(Boolean)
  const keys = []
  clauses.forEach((clause, i) => {
    let key = parseEyes(clause)
    if (!key && /\baway\b/i.test(clause)) key = GAZE.DOWN_SIDE
    if (!key && /\bback\b/i.test(clause)) key = GAZE.AT_OTHER
    if (!key) return
    const lf = i === 0 ? 0 : cueFrame(line, clause, 0.5)
    keys.push({ lf, key })
  })
  return keys
}

/** Listener gaze from the line's reaction (and the speaker's eye direction). */
function listenerGazeKeys(line) {
  const r = (line.reaction || '').toLowerCase()
  const span = line.speakingFrames || line.endFrame - line.startFrame
  // The speaker's own eye direction can say the listener is not looking back
  if (/isn't looking back/i.test(line.eyes || '')) {
    return [
      { lf: 0, key: GAZE.DOWN },
      { lf: cueFrame(line, line.reaction, 0.75), key: GAZE.AT_OTHER },
    ]
  }
  if (/eyes flick to/.test(r)) {
    return [
      { lf: 0, key: GAZE.DOWN_SIDE },
      { lf: Math.round(span * 0.4), key: GAZE.AT_OTHER },
    ]
  }
  if (/looks down/.test(r)) {
    return [
      { lf: 0, key: GAZE.AT_OTHER },
      { lf: Math.round(span * 0.35), key: GAZE.DOWN },
    ]
  }
  if (/eyes lower/.test(r)) return [{ lf: Math.round(span * 0.2), key: GAZE.DOWN }]
  if (/unfocused/.test(r)) return [{ lf: Math.round(span * 0.3), key: 'UNFOCUSED' }]
  if (/eyes start moving|thinking it through/.test(r)) {
    // Thinking saccades: small looks away and back
    return [
      { lf: 0, key: GAZE.AT_OTHER },
      { lf: Math.round(span * 0.3), key: 'THINK_A' },
      { lf: Math.round(span * 0.5), key: 'THINK_B' },
      { lf: Math.round(span * 0.72), key: GAZE.AT_OTHER },
    ]
  }
  return [{ lf: 0, key: GAZE.AT_OTHER }]
}

GAZE_VEC.THINK_A = { x: 0.35, y: 0.3 }
GAZE_VEC.THINK_B = { x: -0.25, y: 0.22 }

// ── Poses ────────────────────────────────────────────────────────────────────
// Human: joint angles in radians. Arms are mirrored by the rig (`in` swings
// toward the body for either side). x rotations swing forward when negative.

const HUMAN_BASE = {
  torsoX: 0.04, torsoZ: 0, headX: 0, headZ: 0, shoulder: 0,
  luX: -0.35, luIn: 0.14, lfX: -0.62, lfIn: 0.08,
  ruX: -0.35, ruIn: 0.14, rfX: -0.62, rfIn: 0.08,
}

export const HUMAN_POSES = {
  REST: {},
  POCKETS: { luX: -0.28, luIn: 0.32, lfX: -0.95, lfIn: 0.55, ruX: -0.28, ruIn: 0.32, rfX: -0.95, rfIn: 0.55, shoulder: 0.03, headX: 0.05 },
  HANDS_LAP: { luX: -0.32, luIn: 0.3, lfX: -0.75, lfIn: 0.5, ruX: -0.32, ruIn: 0.3, rfX: -0.75, rfIn: 0.5, torsoX: 0.1 },
  PHONE: { luX: -0.45, luIn: 0.28, lfX: -1.25, lfIn: 0.35, ruX: -0.45, ruIn: 0.28, rfX: -1.3, rfIn: 0.4, headX: 0.12 },
  TICK: { luX: -0.55, luIn: 0.3, lfX: -1.45, lfIn: 0.35, ruX: -0.6, ruIn: 0.28, rfX: -1.35, rfIn: 0.45 },
  OPEN_PALMS: { luX: -0.55, luIn: -0.3, lfX: -0.85, lfIn: -0.1, ruX: -0.55, ruIn: -0.3, rfX: -0.85, rfIn: -0.1, headZ: 0.06 },
  FOLDED: { luX: -0.85, luIn: 0.05, lfX: -0.1, lfIn: 1.45, ruX: -0.72, ruIn: 0.05, rfX: -0.1, rfIn: 1.45, torsoX: -0.04 },
  FOLDED_BACK: { luX: -0.85, luIn: 0.05, lfX: -0.1, lfIn: 1.45, ruX: -0.72, ruIn: 0.05, rfX: -0.1, rfIn: 1.45, torsoX: -0.1, headX: -0.04 },
  GESTURE: { luX: -0.85, luIn: 0.05, lfX: -0.1, lfIn: 1.45, ruX: -1.05, ruIn: -0.12, rfX: -0.45, rfIn: 0.1, torsoX: 0.06 },
  HANDS_OUT: { luX: -1.15, luIn: -0.12, lfX: -0.3, lfIn: 0.05, ruX: -1.15, ruIn: -0.12, rfX: -0.3, rfIn: 0.05, torsoX: 0.16, headX: -0.04 },
  HANDS_FALL: { luX: -0.12, luIn: -0.08, lfX: -0.15, lfIn: 0, ruX: -0.12, ruIn: -0.08, rfX: -0.15, rfIn: 0, torsoX: 0.16, headX: 0.22, shoulder: -0.035 },
  SLUMP: { torsoX: 0.12, headX: 0.08, shoulder: -0.02 },
  HAND_FACE: { ruX: -0.95, ruIn: 0.4, rfX: -1.75, rfIn: 0.25, headX: -0.06 },
  ELBOWS_KNEES: { torsoX: 0.3, headX: -0.18, luX: -0.55, luIn: 0.25, lfX: -0.6, lfIn: 0.55, ruX: -0.55, ruIn: 0.25, rfX: -0.6, rfIn: 0.55 },
}

/** Human pose name from a body / reaction direction, or null to keep the last one. */
function humanPoseFor(text) {
  const t = (text || '').toLowerCase()
  if (/pocket/.test(t)) return 'POCKETS'
  if (/hand comes up to the face/.test(t)) return 'HAND_FACE'
  if (/arm unfolds|gesture sharply/.test(t)) return 'GESTURE'
  if (/weight shifts back/.test(t)) return 'FOLDED_BACK'
  if (/fold|bracing/.test(t)) return 'FOLDED'
  if (/both hands out|steps forward/.test(t)) return 'HANDS_OUT'
  if (/hands fall|shoulders cave/.test(t)) return 'HANDS_FALL'
  if (/ticks the items|on their fingers/.test(t)) return 'TICK'
  if (/tap/.test(t)) return 'PHONE'
  if (/palms up|arms open/.test(t)) return 'OPEN_PALMS'
  if (/rub|between the knees/.test(t)) return 'HANDS_LAP'
  if (/elbows on knees|leans forward/.test(t)) return 'ELBOWS_KNEES'
  if (/sinks|sit on/.test(t)) return 'SLUMP'
  return null
}

// Byte: body tilt (forward +), side tilt, extra yaw toward Human, drift toward
// Human, antenna droop (+ forward) and height, hover amount, screen brightness.
const BYTE_BASE = {
  tiltX: 0, tiltZ: 0, yaw: 0, drift: 0, headTilt: 0,
  antTilt: 0, antLift: 1, bob: 1, brightness: 1,
}

/** Byte pose overrides from a body / reaction direction. */
function bytePoseFor(text) {
  const t = (text || '').toLowerCase()
  const p = {}
  if (/tilts forward/.test(t)) p.tiltX = 0.14
  if (/tilts to one side/.test(t)) p.tiltZ = 0.16
  if (/head tilts/.test(t)) p.headTilt = 0.16
  if (/turns slightly toward/.test(t)) p.yaw = 0.22
  if (/drifts a little closer/.test(t)) p.drift = 0.14
  if (/antenna droops slightly/.test(t)) p.antTilt = 0.35
  if (/antenna droops in mock/.test(t)) p.antTilt = 0.6
  if (/antenna dips/.test(t)) p.antTilt = 0.4
  if (/antenna lowers all the way/.test(t)) { p.antTilt = 1.0; p.antLift = 0.75 }
  if (/antenna rises/.test(t)) { p.antTilt = -0.12; p.antLift = 1.18 }
  if (/antenna straightens/.test(t)) { p.antTilt = 0; p.antLift = 1.1 }
  if (/completely still|settles/.test(t)) p.bob = 0.25
  if (/stays completely still/.test(t)) p.bob = 0.2
  if (/dims a shade/.test(t)) p.brightness = 0.72
  if (/screen dims;/.test(t)) p.brightness = 0.5
  if (/brightens/.test(t)) p.brightness = 1.3
  return p
}

// ── Building the plan ────────────────────────────────────────────────────────

/** Expression keys for one line and role, as [{lf, expr}]. */
function expressionKeys(line, role, prevExprKey) {
  const speaking = line.speaker === role
  const base = speaking ? speakerExpression(line) : listenerExpression(line)
  const text = (speaking ? line.face : line.reaction) || ''
  const t = text.toLowerCase()
  const span = line.speakingFrames || line.endFrame - line.startFrame

  if (!speaking && /fades mid-line/.test(t)) {
    return [{ lf: 0, key: prevExprKey }, { lf: Math.round(span * 0.45), key: 'LISTENING' }]
  }
  if (/widen a fraction, then soften/.test(t)) {
    return [{ lf: 0, key: 'SURPRISED_SOFT' }, { lf: Math.round(span * 0.5), key: 'WARM' }]
  }
  if (/crescent|crinkle/.test(t)) return [{ lf: 0, key: 'CRESCENT' }]
  if (/half-lidded/.test(t)) return [{ lf: 0, key: 'HALF_LIDDED' }]
  if (/brows twitch/.test(t)) {
    return [{ lf: 0, key: 'LISTENING' }, { lf: Math.round(span * 0.55), key: 'TWITCH' }, { lf: Math.round(span * 0.55) + 8, key: 'THOUGHTFUL' }]
  }
  if (/smile goes flat/.test(t)) {
    return [{ lf: 0, key: 'WRY' }, { lf: cueFrame(line, text, 0.8), key: 'BITTER' }]
  }
  if (/smile that holds a beat too long, then drops/.test(t)) {
    return [{ lf: 0, key: 'FORCED_SMILE' }, { lf: Math.round(span * 0.85), key: 'SAD' }]
  }
  return [{ lf: 0, key: base }]
}

// Extra presets used only by direction-specific keys above
const EXTRA = {
  SURPRISED_SOFT: { ...EXPRESSIONS.LISTENING, eyeWide: 0.6, browRaise: 0.5 },
  CRESCENT: { ...EXPRESSIONS.WARM, mouthSmile: 0.9, eyeSquint: 0.35 },
  HALF_LIDDED: { ...EXPRESSIONS.WRY, eyeSquint: 0.75, mouthSmile: 0.35 },
  TWITCH: { ...EXPRESSIONS.LISTENING, browRaise: 0.8, browFurrow: 0.3 },
  FORCED_SMILE: { ...EXPRESSIONS.WRY, mouthSmile: 0.6, browRaise: 0.55, eyeSquint: 0 },
}
const exprOf = (key) => ({ ...EXPRESSIONS.NEUTRAL, ...(EXPRESSIONS[key] || EXTRA[key] || EXPRESSIONS.NEUTRAL) })

/** One-shot events for one line and role, as [{type, lf, ...}]. */
function eventsFor(line, role) {
  const speaking = line.speaker === role
  const text = (speaking ? [line.face, line.body].join(' | ') : line.reaction) || ''
  const t = text.toLowerCase()
  const span = line.speakingFrames || line.endFrame - line.startFrame
  const ev = []

  if (/slow blink|blinks once, slowly|one slow blink/.test(t)) ev.push({ type: 'blink', lf: cueFrame(line, text, 0.45), dur: 16 })
  else if (/blink hard/.test(t)) ev.push({ type: 'blink', lf: cueFrame(line, text, 0.8) + 4, dur: 12, hold: 4 })
  else if (/blink/.test(t)) ev.push({ type: 'blink', lf: cueFrame(line, text, 0.4), dur: 8 })

  if (/chin trembles/.test(t)) ev.push({ type: 'tremble', lf: cueFrame(line, text, 0.8), dur: 24 })
  if (/dips forward once|a nod/.test(t)) ev.push({ type: 'nod', lf: Math.round(span * 0.35), dur: 22 })
  if (/breath through the nose|exhale/.test(t)) ev.push({ type: 'breath', lf: Math.round(span * 0.25), dur: 26 })
  if (/half-laugh/.test(t)) ev.push({ type: 'laugh', lf: Math.round(span * 0.15), dur: 22, amount: 0.5 })
  if (/human laughs/.test(t)) ev.push({ type: 'laugh', lf: Math.round(span * 0.05), dur: Math.round(span * 0.9), amount: 1 })
  if (/shrug/.test(t)) ev.push({ type: 'shrug', lf: Math.round(span * 0.55), dur: 20 })
  if (/swallow/.test(t)) ev.push({ type: 'swallow', lf: (line.speakingFrames || 0) + 4, dur: 14 })
  if (/antenna bobs once on each beat/.test(t)) {
    wordWindows(line).forEach((w) => {
      if (/[.?!]$/.test(w.word)) ev.push({ type: 'antennaBob', lf: w.start, dur: 14 })
    })
  }
  if (/jaw shifts sideways/.test(t)) ev.push({ type: 'jaw', lf: Math.round(span * 0.35), dur: Math.round(span * 0.6) })
  if (/sharply/.test(t)) ev.push({ type: 'jab', lf: Math.round(span * 0.3), dur: 14 })
  if (/one (screen-)?eye (narrows|squints)/.test(t)) {
    ev.push({ type: 'asym', lf: cueFrame(line, text, 0.5), dur: Math.max(span - cueFrame(line, text, 0.5), 20) })
  }
  return ev
}

/**
 * Performance plan for one character.
 * @param {object[]} timeline  buildTimeline output
 * @param {'human'|'ai'} role
 * @returns {{at: (frame:number) => object}}
 */
export function buildPerformance(timeline, role) {
  const exprTrack = new Track({ ...EXPRESSIONS.NEUTRAL })
  const gazeTrack = new Track({ x: 1, y: 0 })
  const poseTrack = new Track(role === 'human' ? { ...HUMAN_BASE, ...HUMAN_POSES.POCKETS } : { ...BYTE_BASE })
  const events = []
  const lines = []

  let prevExprKey = 'NEUTRAL'
  for (const line of timeline) {
    const speaking = line.speaker === role
    const start = line.startFrame

    // Expression: 12-frame blend at each key
    for (const { lf, key } of expressionKeys(line, role, prevExprKey)) {
      exprTrack.add(start + lf, exprOf(key), 12)
      prevExprKey = key
    }

    // Gaze: quick 5-frame eye moves
    const gazeKeys = speaking ? speakerGazeKeys(line) : listenerGazeKeys(line)
    for (const { lf, key } of gazeKeys) gazeTrack.add(start + lf, GAZE_VEC[key], 5)

    // Pose: the speaker's body direction, the listener's reaction; else keep the last pose
    const direction = speaking ? line.body : line.reaction
    if (role === 'human') {
      const name = humanPoseFor(direction)
      if (name === 'HAND_FACE') {
        const span = line.speakingFrames || line.endFrame - start
        poseTrack.add(start + Math.round(span * 0.3), { ...HUMAN_BASE, ...HUMAN_POSES.HAND_FACE }, 14)
        poseTrack.add(line.endFrame - 6, { ...HUMAN_BASE, ...HUMAN_POSES.REST }, 18)
      } else if (name === 'TICK') {
        poseTrack.add(start, { ...HUMAN_BASE, ...HUMAN_POSES.TICK }, 12)
        poseTrack.add(start + Math.round(line.speakingFrames * 0.85), { ...HUMAN_BASE, ...HUMAN_POSES.REST }, 16)
      } else if (name) {
        poseTrack.add(start, { ...HUMAN_BASE, ...HUMAN_POSES[name] }, name === 'HANDS_OUT' ? 8 : 14)
      }
    } else {
      // Byte returns to neutral each line unless directed
      poseTrack.add(start, { ...BYTE_BASE, ...bytePoseFor(direction) }, 16)
    }

    for (const e of eventsFor(line, role)) events.push({ ...e, frame: start + e.lf })
    lines.push(line)
  }

  // Idle blinks every 1.8–4.6s, offset per character
  const seed = role === 'human' ? 3 : 11
  const total = timeline.length ? timeline[timeline.length - 1].endFrame : 0
  let f = 20 + Math.round(hash(seed) * 40)
  for (let k = 0; f < total; k++) {
    events.push({ type: 'blink', frame: f, dur: 7, idle: true })
    f += 55 + Math.round(hash(seed * 31 + k) * 85)
  }

  const scripted = events.filter((e) => e.type === 'blink' && !e.idle)
  // Drop idle blinks that would crowd a scripted one
  const blinks = events.filter(
    (e) => e.type === 'blink' && (!e.idle || !scripted.some((s) => Math.abs(s.frame - e.frame) < 30)),
  )
  const others = events.filter((e) => e.type !== 'blink')

  return {
    role,
    at(frame) {
      const line = lineAt(lines, frame)
      const lf = line ? frame - line.startFrame : 0
      const speaking = !!line && line.speaker === role && lf < line.speakingFrames

      return {
        frame,
        line,
        lf,
        speaking,
        expr: exprTrack.at(frame),
        gaze: gazeTrack.at(frame),
        pose: poseTrack.at(frame),
        mouthOpen: speaking ? mouthOpenAt(line, lf) : 0,
        talkEnergy: speaking ? talkEnvelope(line, lf) * talkAmplitude(line) : 0,
        blink: blinkAt(blinks, frame),
        events: activeEvents(others, frame),
      }
    },
  }
}

function lineAt(lines, frame) {
  let found = null
  for (const line of lines) {
    if (frame >= line.startFrame) found = line
    else break
  }
  return found
}

/** 0→1→0 over the speaking window's edges, so talking eases in and out. */
function talkEnvelope(line, lf) {
  return clamp01(lf / 4) * clamp01((line.speakingFrames - lf) / 4)
}

/**
 * Mouth opening while speaking. Each word opens and closes once per estimated
 * syllable, and the mouth closes briefly between words. Amplitude follows the
 * line's intensity.
 */
export function mouthOpenAt(line, lf) {
  const windows = wordWindows(line)
  const w = windows.find((win) => lf >= win.start && lf < win.end)
  if (!w) return 0
  const letters = w.word.replace(/[^a-z]/gi, '').length
  const syllables = Math.max(1, Math.round(letters / 3.2))
  const p = (lf - w.start) / Math.max(w.end - w.start, 1)
  const phase = (p * syllables) % 1
  const shape = Math.pow(Math.sin(Math.PI * phase), 0.8)
  let amp = talkAmplitude(line)
  if (risesToHigh(line)) amp = lerp(0.78, 1, lf / Math.max(line.speakingFrames, 1))
  // Small per-word variation so repeated words don't look stamped
  const vary = 0.8 + 0.2 * hash(line.startFrame + w.start)
  return clamp01(shape * amp * vary * talkEnvelope(line, lf))
}

/** Eyelid closure from blink events: fast close, short hold, slower open. */
function blinkAt(blinks, frame) {
  let v = 0
  for (const b of blinks) {
    const d = frame - b.frame
    if (d < 0 || d > b.dur + (b.hold || 0)) continue
    const close = Math.max(2, Math.round(b.dur * 0.3))
    const hold = b.hold || (b.dur > 10 ? 3 : 1)
    let s
    if (d < close) s = d / close
    else if (d < close + hold) s = 1
    else s = 1 - (d - close - hold) / Math.max(b.dur - close, 1)
    v = Math.max(v, clamp01(s))
  }
  return v
}

/** Events in progress at `frame`, each with its 0..1 progress `p`. */
function activeEvents(events, frame) {
  const out = []
  for (const e of events) {
    const d = frame - e.frame
    if (d >= 0 && d < e.dur) out.push({ ...e, p: d / e.dur })
  }
  return out
}
