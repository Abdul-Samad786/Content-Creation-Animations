import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { speechActive } from "../state";
import assets from "../../content/_generated/assets.json";

// Voice clips, sound effects and background music. Only files the generator
// scripts recorded in content/_generated/assets.json (sfx, music) or in the
// episode's audio.json (voices) are referenced, so a render never points at a
// missing file — missing audio is simply silent.

const SFX_FRAMES = 75;

export default function Soundtrack({ plan }) {
  const available = new Set(assets.sfx || []);
  const music = assets.music?.[plan.series.id];
  const m = plan.series.music || {};

  return (
    <>
      {plan.lines.map((l) =>
        l.clip ? (
          <Sequence key={`v${l.index}`} from={l.startFrame} durationInFrames={Math.max(1, l.speakFrames + 6)} layout="none">
            <Audio src={staticFile(l.clip.file)} />
          </Sequence>
        ) : null,
      )}
      {plan.sfx.map((s, i) =>
        available.has(s.id) ? (
          <Sequence key={`s${i}`} from={s.frame} durationInFrames={SFX_FRAMES} layout="none">
            <Audio src={staticFile(`sfx/${s.id}.mp3`)} volume={s.volume} />
          </Sequence>
        ) : null,
      )}
      {music && (
        <Audio
          src={staticFile(music)}
          loop
          volume={(f) => {
            // Duck under dialogue; fade in/out at the edges
            const base = speechActive(plan, f) ? m.duckedVolume ?? 0.05 : m.volume ?? 0.13;
            const edge = Math.min(1, f / 15, (plan.totalFrames - f) / 20);
            return base * Math.max(0, edge);
          }}
        />
      )}
    </>
  );
}
