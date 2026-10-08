import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Canvas } from "@react-three/fiber";
import dialogue from "../episodes/ep01-degree/dialogue.json";
import { buildTimeline } from "../timeline/buildTimeline";
import Stage from "../stage/Stage";
import CameraRig from "../camera/CameraRig";
import { Human } from "../characters/Human";
import { AIAgent } from "../characters/AIAgent";
import Subtitle from "../subtitles/Subtitle";

const timeline = buildTimeline(dialogue);
const totalFrames = timeline[timeline.length - 1].endFrame;

/** Bend legs so Human reads as seated on the bench. */
const SitDriver = ({ humanRef }) => {
  useLayoutEffect(() => {
    const human = humanRef.current;
    if (!human) return;
    human.leftUpperLeg.rotation.x = -Math.PI / 2;
    human.rightUpperLeg.rotation.x = -Math.PI / 2;
    human.leftLowerLeg.rotation.x = Math.PI / 2.2;
    human.rightLowerLeg.rotation.x = Math.PI / 2.2;
  });
  return null;
};

export default function Episode() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const humanRef = useRef(null);
  const agentRef = useRef(null);

  const currentLine =
    timeline.find(
      (entry) => frame >= entry.startFrame && frame < entry.endFrame,
    ) || timeline[0];

  return (
    <AbsoluteFill style={{ background: "#050A14" }}>
      <Canvas
        style={{ width, height }}
        camera={{ fov: 36, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
        shadows
      >
        <color attach="background" args={["#0a1628"]} />
        <fog attach="fog" args={["#0a1628", 18, 45]} />
        <Stage />
        <CameraRig preset={currentLine.camera} />

        {/* Y≈-0.45 + bent legs = hips on seat at Y=0.45 */}
        <Human
          ref={humanRef}
          position={[-0.55, -0.45, 0.2]}
          rotation={[0, 0.2, 0]}
        />
        <AIAgent
          ref={agentRef}
          position={[0.55, 0.55, 0.2]}
          rotation={[0, -0.2, 0]}
        />
        <SitDriver humanRef={humanRef} />
      </Canvas>
      <Subtitle text={currentLine.text} speaker={currentLine.speaker} />
    </AbsoluteFill>
  );
}

export { totalFrames, timeline };
