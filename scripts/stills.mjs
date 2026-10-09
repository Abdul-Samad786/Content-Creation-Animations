// Render preview PNGs of any episode without rendering the whole video.
//
//   node scripts/stills.mjs LeftOnSeen-Ep01                 # one still per line
//   node scripts/stills.mjs LeftOnSeen-Ep01 0 120 300       # specific frames
//   node scripts/stills.mjs all                             # one still per line, every episode
//
// Writes out/stills/<composition>/f<frame>.png and a contact sheet
// out/stills/<composition>/sheet.png.
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";

const [, , which = "all", ...frameArgs] = process.argv;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.js") });
const comps = (await getCompositions(serveUrl)).filter((c) => c.id !== "Episode");
const targets = which === "all" ? comps : comps.filter((c) => c.id === which);
if (!targets.length) {
  console.error(`No composition "${which}". Available: ${comps.map((c) => c.id).join(", ")}`);
  process.exit(1);
}

for (const comp of targets) {
  let frames = frameArgs.map(Number);
  if (!frames.length) {
    // Mid-point of every line's spoken part, plus the very first frame (thumbnail)
    frames = [0, ...comp.props.previewFrames];
  }
  const dir = path.join(root, "out/stills", comp.id);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const frame of frames) {
    const output = path.join(dir, `f${String(frame).padStart(4, "0")}.png`);
    await renderStill({ composition: comp, serveUrl, output, frame, inputProps: comp.props });
    files.push(output);
    console.log(output);
  }
  fs.writeFileSync(path.join(dir, "frames.json"), JSON.stringify(files, null, 2));
}
