// Turns a series + episode script into a frame-accurate plan.
//
// Everything a frame needs is resolved here, once: line timing (from the voice
// clips when they exist, estimated otherwise), every face / pose / gesture /
// look change per character, camera shots, phone events, effects and sound
// effects, all as absolute frame numbers. The per-frame code (state.js) only
// looks things up in this plan, so every frame is a pure function of its number.

import { EXPRESSIONS } from "./faces/expressions";
import { GESTURES } from "./characters/gestures";
import { MODEL_POSES, DEFAULT_POSE } from "./characters/poses";
import { captionWordTimes, estimateWordTimes, splitWords, normalizeWord, stripTags } from "./words";
import { FX_TYPES } from "./overlays/fxTypes";

const DEFAULT_PAUSE = 0.2;
/** Extra screen time after the last line when there is an outro sticker. */
const OUTRO_TAIL = 1.1;
const LOOK_TARGETS = new Set(["camera", "phone", "away", "up", "down"]);

class ScriptError extends Error {}

function fail(where, msg) {
  throw new ScriptError(`[${where}] ${msg}`);
}

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/**
 * @param {object} series         series.json
 * @param {object} episode        episode.json
 * @param {object} audio          audio.json (may be empty)
 * @param {object} sfxLibrary     content/sfx-library.json
 */
export function buildPlan(series, episode, audio, sfxLibrary, where = "episode") {
  const fps = series.format?.fps ?? 30;
  const sec = (s) => Math.round(s * fps);
  const cast = Object.fromEntries(series.cast.map((c) => [c.id, c]));
  const onStage = series.cast.filter((c) => c.model);
  const audioLines = audio?.lines || {};
  const warnings = [];

  // ── Per-character tracks ──
  const chars = {};
  for (const c of onStage) {
    const start = episode.start?.[c.id] || {};
    const poses = MODEL_POSES[c.model];
    if (!poses) fail(where, `cast "${c.id}" uses unknown model "${c.model}"`);
    const pose0 = start.pose || DEFAULT_POSE[c.model];
    if (!poses[pose0]) fail(where, `start.${c.id}.pose "${pose0}" is not a ${c.model} pose (${Object.keys(poses).join(", ")})`);
    chars[c.id] = {
      id: c.id,
      model: c.model,
      face: [{ frame: -1, value: start.face || "neutral" }],
      pose: [{ frame: -1, value: pose0 }],
      look: [{ frame: -1, value: start.look || "camera" }],
      visible: [{ frame: -1, value: start.visible !== false }],
      gestures: [],
      speech: [],
      blushBoost: [],
    };
  }

  const lines = [];
  const camera = [];
  const phone = [];
  const fx = [];
  const sfx = [];
  let frame = 0;

  episode.lines.forEach((raw, i) => {
    const index = i + 1;
    const at = `${where} line ${index}`;
    const isBeat = raw.say == null;
    if (isBeat && raw.beat == null) fail(at, `needs either "say" (a cast id) or "beat" (seconds of silent action)`);
    if (!isBeat && !cast[raw.say]) fail(at, `say: "${raw.say}" is not in the cast (${Object.keys(cast).join(", ")})`);
    if (!isBeat && !raw.text) fail(at, `has "say" but no "text"`);

    // Timing: measured clip, else estimate
    let speakFrames;
    let words = [];
    let clip = null;
    if (isBeat) {
      speakFrames = sec(raw.beat);
    } else {
      const tts = raw.tts || raw.text;
      const a = audioLines[String(index)];
      if (a && a.tts === tts && a.file) {
        clip = a;
        speakFrames = Math.ceil(a.seconds * fps);
        words = captionWordTimes(raw.text, a.words, a.seconds);
      } else {
        if (a && a.tts !== tts) warnings.push(`${at}: voice clip is stale (script changed) — re-run make_voices.py`);
        const est = estimateWordTimes(stripTags(raw.text));
        const secs = est.length ? est[est.length - 1].end + 0.12 : 0.6;
        speakFrames = sec(secs);
        words = est;
      }
    }
    const pauseFrames = sec(raw.pause ?? (isBeat ? 0 : DEFAULT_PAUSE));
    const startFrame = frame;
    const line = {
      index,
      kind: isBeat ? "beat" : "say",
      speaker: raw.say || null,
      text: raw.text || "",
      startFrame,
      speakFrames,
      pauseFrames,
      endFrame: startFrame + speakFrames + pauseFrames,
      clip,
      words: words.map((w) => ({ word: w.word, start: Math.round(w.start * fps), end: Math.max(Math.round(w.end * fps), Math.round(w.start * fps) + 2) })),
      offscreen: !isBeat && !cast[raw.say].model,
    };
    lines.push(line);
    frame = line.endFrame;

    // "at": seconds | "start" | "end" | a word from the line
    const resolveAt = (v, what) => {
      if (v == null || v === "start") return startFrame;
      if (v === "end") return startFrame + speakFrames;
      if (typeof v === "number") return startFrame + sec(v);
      const target = normalizeWord(v);
      const hit = line.words.find((w) => normalizeWord(w.word.split(/\s+/)[0]) === target);
      if (!hit) fail(at, `${what} at "${v}": that word is not in the line's text`);
      return startFrame + hit.start;
    };

    if (!isBeat && chars[raw.say]) {
      chars[raw.say].speech.push({ start: startFrame, end: startFrame + speakFrames, line });
    }

    // Camera
    if (raw.camera) {
      const [shot, target] = String(raw.camera).split(":");
      if (!["two", "wide", "close", "zoom"].includes(shot)) fail(at, `camera "${raw.camera}" — use two, wide, close:<id> or zoom:<id>`);
      if ((shot === "close" || shot === "zoom") && !chars[target]) fail(at, `camera "${raw.camera}" — "${target}" is not an on-stage character`);
      camera.push({ frame: startFrame, shot, target: target || null, line: index });
    }

    // Character directions
    for (const c of onStage) {
      for (const d of asArray(raw[c.id])) {
        const f = resolveAt(d.at, `${c.id}`);
        const tr = chars[c.id];
        if (d.face) {
          if (!EXPRESSIONS[d.face]) fail(at, `${c.id}.face "${d.face}" is unknown. Faces: ${Object.keys(EXPRESSIONS).join(", ")}`);
          tr.face.push({ frame: f, value: d.face });
        }
        if (d.pose) {
          if (!MODEL_POSES[c.model][d.pose]) fail(at, `${c.id}.pose "${d.pose}" is not a ${c.model} pose (${Object.keys(MODEL_POSES[c.model]).join(", ")})`);
          tr.pose.push({ frame: f, value: d.pose });
        }
        if (d.look) {
          if (!LOOK_TARGETS.has(d.look) && !chars[d.look]) fail(at, `${c.id}.look "${d.look}" — use a character id or ${[...LOOK_TARGETS].join(", ")}`);
          tr.look.push({ frame: f, value: d.look });
        }
        if (d.visible != null) tr.visible.push({ frame: f, value: !!d.visible });
        for (const word of asArray(d.do).flatMap((s) => String(s).split("+"))) {
          if (GESTURES[word]) tr.gestures.push({ frame: f, name: word });
          else if (MODEL_POSES[c.model][word]) tr.pose.push({ frame: f, value: word });
          else fail(at, `${c.id}.do "${word}" is neither a gesture (${Object.keys(GESTURES).join(", ")}) nor a ${c.model} pose`);
        }
      }
    }

    // Phone
    for (const p of asArray(raw.phone)) {
      const f = resolveAt(p.at, "phone");
      phone.push({ frame: f, ...p, dur: p.dur != null ? sec(p.dur) : undefined });
    }

    // Effects
    for (const e of asArray(raw.fx)) {
      const item = typeof e === "string" ? { type: e.split(":")[0], on: e.split(":")[1] } : e;
      if (!FX_TYPES[item.type]) fail(at, `fx "${item.type}" is unknown. Effects: ${Object.keys(FX_TYPES).join(", ")}`);
      if (FX_TYPES[item.type].needsCharacter && !chars[item.on]) fail(at, `fx "${item.type}" needs "on": an on-stage character id`);
      const f = resolveAt(item.at, `fx ${item.type}`);
      const dur = sec(item.dur ?? FX_TYPES[item.type].seconds);
      if (item.type === "blush") chars[item.on].blushBoost.push({ frame: f, end: f + dur });
      else fx.push({ frame: f, type: item.type, on: item.on || null, dur, seed: index * 31 + fx.length });
    }

    // Sound effects
    for (const s of asArray(raw.sfx)) {
      const item = typeof s === "string" ? { id: s } : s;
      const def = sfxLibrary.sounds[item.id];
      if (!def) fail(at, `sfx "${item.id}" is not in content/sfx-library.json`);
      sfx.push({ frame: resolveAt(item.at, `sfx ${item.id}`), id: item.id, volume: item.volume ?? def.volume ?? 0.5 });
    }
  });

  const sortByFrame = (a, b) => a.frame - b.frame;
  for (const tr of Object.values(chars)) {
    for (const k of ["face", "pose", "look", "visible", "gestures"]) tr[k].sort(sortByFrame);
  }
  phone.sort(sortByFrame);
  fx.sort(sortByFrame);
  sfx.sort(sortByFrame);
  if (!camera.length || camera[0].frame > 0) camera.unshift({ frame: 0, shot: "two", target: null, line: 1 });

  const contentEnd = frame;
  const tail = episode.outro ? sec(OUTRO_TAIL) : 0;

  return {
    fps,
    width: series.format?.width ?? 1080,
    height: series.format?.height ?? 1920,
    series,
    episode,
    cast,
    chars,
    lines,
    camera,
    phone,
    fx,
    sfx,
    contentEnd,
    totalFrames: Math.max(contentEnd + tail, 1),
    warnings,
    hasAllVoices: lines.every((l) => l.kind === "beat" || l.clip),
  };
}

export { ScriptError, splitWords };
