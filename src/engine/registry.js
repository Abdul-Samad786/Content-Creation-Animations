// Finds every series and episode under src/content automatically:
//   src/content/<series>/series.json
//   src/content/<series>/<episode>/episode.json   (+ audio.json once voiced)
// Adding a folder with an episode.json is all it takes to get a new composition.

import { buildPlan } from "./timeline";
import sfxLibrary from "../content/sfx-library.json";

/* global require, console */
const seriesCtx = require.context("../content", true, /series\.json$/);
const episodeCtx = require.context("../content", true, /episode\.json$/);
const audioCtx = require.context("../content", true, /audio\.json$/);

const pad2 = (n) => String(n).padStart(2, "0");

function load() {
  const series = {};
  for (const key of seriesCtx.keys()) {
    const dir = key.replace(/^\.\//, "").replace(/\/series\.json$/, "");
    series[dir] = seriesCtx(key);
  }
  const audioKeys = new Set(audioCtx.keys());

  const episodes = [];
  for (const key of episodeCtx.keys().sort()) {
    const path = key.replace(/^\.\//, "").replace(/\/episode\.json$/, "");
    const [seriesDir, epDir] = path.split("/");
    const s = series[seriesDir];
    if (!s || !epDir) throw new Error(`[registry] ${path}: episode folders go in src/content/<series>/<episode>/ next to a series.json`);
    const episode = episodeCtx(key);
    const audioKey = `./${path}/audio.json`;
    const audio = audioKeys.has(audioKey) ? audioCtx(audioKey) : {};
    const plan = buildPlan(s, episode, audio, sfxLibrary, path);
    const num = episode.number != null ? `Ep${pad2(episode.number)}` : epDir;
    episodes.push({
      key: path,
      id: `${s.compositionPrefix || seriesDir}-${num}`.replace(/[^a-zA-Z0-9-]/g, "-"),
      seriesId: s.id,
      seriesTitle: s.title,
      plan,
    });
  }
  return episodes;
}

export const EPISODES = load();

for (const e of EPISODES) for (const w of e.plan.warnings) console.warn(`[${e.id}] ${w}`);
