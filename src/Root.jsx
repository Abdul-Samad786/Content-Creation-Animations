import React from "react";
import { Composition } from "remotion";
import { MainScene } from "./compositions/MainScene";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MainScene"
        component={MainScene}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
