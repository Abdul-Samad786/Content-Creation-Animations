import React, { useEffect, useLayoutEffect, useRef } from "react";
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

const ExpressionDriver = ({ humanRef, agentRef, frame }) => {
  useLayoutEffect(() => {
    humanRef.current?.updateExpression(frame)
    agentRef.current?.updateExpression(frame)
  })
  return null
}

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

  useEffect(() => {
    if (!humanRef.current || !agentRef.current) return
    const isSpeaking = currentLine.speaker === 'human'
    humanRef.current.setTone(currentLine.tone, isSpeaking, currentLine.startFrame)
    agentRef.current.setTone(currentLine.tone, !isSpeaking, currentLine.startFrame)
  }, [currentLine.lineId])

  return (
    <AbsoluteFill style={{ background: "#5E8FC4" }}>
      <Canvas
        style={{ width, height }}
        camera={{ fov: 36, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
        shadows
      >
        <color attach="background" args={["#5E8FC4"]} />
        <fog attach="fog" args={["#D4906A", 16, 52]} />
        <Stage mood={currentLine.mood} />
        <CameraRig
          preset={currentLine.camera}
          lineStartFrame={currentLine.startFrame}
        />

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
        <ExpressionDriver humanRef={humanRef} agentRef={agentRef} frame={frame} />
      </Canvas>
      {/* Vignette — draws focus toward center */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.42) 100%)',
        pointerEvents: 'none',
      }} />
      <Subtitle text={currentLine.text} speaker={currentLine.speaker} />
    </AbsoluteFill>
  );
}

export { totalFrames, timeline };
