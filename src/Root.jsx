import React from "react";
import { Composition, Folder } from "remotion";
import Episode, { totalFrames } from "./compositions/Episode";
import EpisodeComposition from "./engine/EpisodeComposition";
import { EPISODES } from "./engine/registry";

const bySeries = EPISODES.reduce((acc, e) => {
  (acc[e.seriesId] ||= []).push(e);
  return acc;
}, {});

export const RemotionRoot = () => {
  return (
    <>
      {/* Every src/content/<series>/<episode>/episode.json becomes a composition */}
      {Object.entries(bySeries).map(([seriesId, eps]) => (
        <Folder key={seriesId} name={seriesId}>
          {eps.map((e) => (
            <Composition
              key={e.id}
              id={e.id}
              component={EpisodeComposition}
              defaultProps={{ episodeKey: e.key, previewFrames: e.plan.lines.map((l) => l.startFrame + Math.floor(l.speakFrames * 0.6)) }}
              durationInFrames={e.plan.totalFrames}
              fps={e.plan.fps}
              width={e.plan.width}
              height={e.plan.height}
            />
          ))}
        </Folder>
      ))}

      {/* The original hand-built degree episode (its own engine under src/compositions) */}
      <Folder name="legacy">
        <Composition id="Episode" component={Episode} durationInFrames={totalFrames} fps={30} width={1080} height={1920} />
      </Folder>
    </>
  );
};
