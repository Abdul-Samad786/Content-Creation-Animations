// Check every episode script against the real engine, without opening Studio.
//
//   node scripts/validate_episodes.mjs                    # every series
//   node scripts/validate_episodes.mjs left-on-seen-s2    # one series
//   npm run validate
//
// For each episode it runs the engine's own buildPlan (src/engine/timeline.js),
// which rejects unknown faces, gestures, poses, cameras, fx, sfx, "at" words,
// popups and bubbles — exactly what Studio and the renderer would reject. It
// also checks the stage exists, reports stale or missing voice clips, and, when
// the series has a canon.json, the season's continuity rules (runtime, line
// count, hook timing, Leo never speaking, the update-popup gag, Byte 2.0, the
// ep 5 recording). Exits 1 on any error.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const content = path.join(root, "src/content");
const cacheDir = path.join(root, "node_modules/.cache/validate-episodes");
fs.mkdirSync(cacheDir, { recursive: true });

// Bundle the engine's pure timeline plus the stage registry (packages stay external)
const entry = path.join(cacheDir, "entry.js");
fs.writeFileSync(
  entry,
  `export { buildPlan } from ${JSON.stringify(path.join(root, "src/engine/timeline.js"))};\n` +
    `export { STAGES } from ${JSON.stringify(path.join(root, "src/engine/stages/index.js"))};\n`,
);
const out = path.join(cacheDir, "engine.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", packages: "external", jsx: "automatic", loader: { ".js": "jsx" }, outfile: out, logLevel: "error" });
const { buildPlan, STAGES } = await import(pathToFileURL(out).href + `?t=${Date.now()}`);

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sfxLibrary = readJson(path.join(content, "sfx-library.json"));
const only = process.argv[2];
const seriesDirs = fs.readdirSync(content).filter((d) => fs.existsSync(path.join(content, d, "series.json")) && (!only || d === only));
if (!seriesDirs.length) {
  console.error(`No series "${only}"`);
  process.exit(1);
}

let errors = 0;
const err = (where, msg) => {
  errors++;
  console.log(`  ✗ ${where}: ${msg}`);
};

for (const sd of seriesDirs) {
  const series = readJson(path.join(content, sd, "series.json"));
  const canonPath = path.join(content, sd, "canon.json");
  const canon = fs.existsSync(canonPath) ? readJson(canonPath) : null;
  const castIds = new Set(series.cast.map((c) => c.id));
  console.log(`\n== ${sd}${canon ? "  (with canon.json)" : ""}`);
  if (canon) for (const id of canon.neverSpeaks || []) if (castIds.has(id)) err(sd, `"${id}" must never be in the cast`);
  if (canon) for (const id of canon.voiceOnly || []) if (series.cast.find((c) => c.id === id)?.model) err(sd, `"${id}" must be voice-only (model: null)`);

  const eps = fs.readdirSync(path.join(content, sd)).filter((d) => fs.existsSync(path.join(content, sd, d, "episode.json"))).sort();
  for (const ed of eps) {
    const where = `${sd}/${ed}`;
    const episode = readJson(path.join(content, sd, ed, "episode.json"));
    const audioPath = path.join(content, sd, ed, "audio.json");
    const audio = fs.existsSync(audioPath) ? readJson(audioPath) : {};
    let plan;
    try {
      plan = buildPlan(series, episode, audio, sfxLibrary, where);
    } catch (e) {
      err(where, e.message);
      continue;
    }
    if (!STAGES[plan.stage]) err(where, `stage "${plan.stage}" is unknown (${Object.keys(STAGES).join(", ")})`);

    const secs = plan.totalFrames / plan.fps;
    const spoken = plan.lines.filter((l) => l.kind === "say");
    const voiced = spoken.filter((l) => l.clip).length;
    const timing = voiced === spoken.length ? "measured" : voiced ? `partly measured (${voiced}/${spoken.length})` : "estimated";
    console.log(`  ${ed}: ${secs.toFixed(1)}s ${timing}, ${spoken.length} spoken + ${plan.lines.length - spoken.length} beats, stage ${plan.stage}`);
    for (const w of plan.warnings) console.log(`    ! ${w}`);
    for (const l of spoken) {
      const a = audio.lines?.[String(l.index)];
      if (a && a.file && !fs.existsSync(path.join(root, "public", a.file))) err(where, `line ${l.index}: audio.json points at missing ${a.file}`);
      if (a && a.seconds != null && a.seconds < 0.3) err(where, `line ${l.index}: clip is ${a.seconds}s — empty or truncated?`);
    }

    if (!canon) continue;
    const n = episode.number;
    const [dMin, dMax] = canon.durationSeconds;
    if (secs < dMin || secs > dMax) err(where, `runtime ${secs.toFixed(1)}s is outside ${dMin}–${dMax}s (${timing})`);
    const [lMin, lMax] = canon.spokenLines;
    if (spoken.length < lMin || spoken.length > lMax) err(where, `${spoken.length} spoken lines, want ${lMin}–${lMax}`);
    const firstWord = spoken[0]?.words[0];
    const hookAt = spoken[0] ? (spoken[0].startFrame + (firstWord ? firstWord.start : 0)) / plan.fps : Infinity;
    if (hookAt > canon.hookWithinSeconds) err(where, `first spoken word at ${hookAt.toFixed(2)}s, hook must land within ${canon.hookWithinSeconds}s`);
    for (const l of episode.lines) if (canon.neverSpeaks?.includes(l.say)) err(where, `"${l.say}" speaks — never allowed`);

    const texts = plan.popup.filter((p) => p.text != null).map((p) => p.text);
    const want = canon.updatePopup?.[String(n)];
    if (want && !texts.includes(want)) err(where, `update popup must read "${want}" (found: ${texts.map((t) => `"${t}"`).join(", ") || "none"})`);
    const allowed = new Set(canon.alsoAllowedPopups?.[String(n)] || []);
    const wrong = Object.entries(canon.updatePopup || {}).filter(([k, v]) => k !== String(n) && v !== want && !allowed.has(v) && texts.includes(v));
    for (const [k, v] of wrong) err(where, `popup "${v}" belongs to ep ${k}`);

    const wantStage = canon.stages?.[String(n)] || series.stage;
    if (plan.stage !== wantStage) err(where, `stage is "${plan.stage}", canon says "${wantStage}"`);

    const file = canon.recordingFile;
    const mentions = plan.popup.some((p) => `${p.text || ""} ${p.detail || ""}`.includes(file));
    if ([canon.recordedIn, canon.erasedIn - 1, canon.erasedIn].includes(n) && !mentions) err(where, `must show "${file}" on Byte's screen`);

    // Byte 2.0: while the screen is "v2", Byte is polite and corporate, never the old tic
    const v2 = plan.chars.byte?.screen || [];
    const isV2 = (f) => {
      let m = "on";
      for (const e of v2) if (e.frame <= f) m = e.value;
      return m === "v2";
    };
    const v2Lines = spoken.filter((l) => l.speaker === "byte" && isV2(l.startFrame));
    if (canon.byte2Episodes?.includes(n) && n === canon.byte2Episodes[0] && !v2Lines.length) err(where, `Byte 2.0 never speaks (no byte line while screen is "v2")`);
    for (const l of v2Lines) {
      if (/^statistically/i.test(l.text)) err(where, `line ${l.index}: Byte 2.0 opens with a statistic — that is old Byte`);
      const raw = episode.lines[l.index - 1];
      if (!/polite/i.test(raw.tts || "")) err(where, `line ${l.index}: Byte 2.0 line needs a flat, over-polite tts tag`);
    }
  }
}

console.log(errors ? `\n${errors} problem(s).` : "\nAll episodes valid.");
process.exit(errors ? 1 : 0);
