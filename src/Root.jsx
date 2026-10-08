import React from "react";
import { Composition } from "remotion";
import { MainScene } from "./compositions/MainScene";
import Episode, { totalFrames } from "./compositions/Episode";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MainScene"
        component={MainScene}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Episode"
        component={Episode}
        durationInFrames={totalFrames}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
