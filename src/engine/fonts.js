/* global document, FontFace, console */
import { continueRender, delayRender, staticFile } from "remotion";

// Fredoka (SIL Open Font License, public/fonts/OFL-Fredoka.txt): round, soft,
// friendly — the whole look of the captions, phone and stickers.
export const FONT = "Fredoka, 'Noto Color Emoji', system-ui, sans-serif";

let started = false;

/** Loads the font once; rendering waits for it so text measures correctly. */
export function ensureFonts() {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading Fredoka font");
  const face = new FontFace("Fredoka", `url(${staticFile("fonts/Fredoka.ttf")}) format("truetype")`, { weight: "300 700" });
  face
    .load()
    .then((f) => {
      document.fonts.add(f);
      continueRender(handle);
    })
    .catch((err) => {
      console.error("Fredoka failed to load", err);
      continueRender(handle);
    });
}
