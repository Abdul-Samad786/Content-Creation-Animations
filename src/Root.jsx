import React from "react";
import { Composition } from "remotion";
import { MainScene } from "./compositions/MainScene";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MainScene"
        component={MainScene}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
