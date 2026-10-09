import React from "react";
import { Composition } from "remotion";
import Episode, { totalFrames } from "./compositions/Episode";

export const RemotionRoot = () => {
  return (
    <>
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
