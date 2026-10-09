import React, { useEffect, useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import dialogue from "../episodes/ep01-degree/dialogue.json";
import { buildComposition } from "../timeline/buildTimeline";
import Stage from "../stage/Stage";
import CameraRig from "../camera/CameraRig";
import {
  AI_POSITION,
  HUMAN_POSITION,
  beatStateAt,
  buildBeatSegments,
  byteYawAt,
  captionClearance,
  cameraPoseAt,
  humanFocusAt,
} from "../camera/rig";
import BeatProps3D from "../beats/BeatProps3D";
import BeatOverlays from "../beats/BeatOverlays";
import LineVisuals from "../beats/LineVisuals";
import { Human } from "../characters/Human";
import { AIAgent } from "../characters/AIAgent";
import Captions from "../subtitles/Captions";

const FPS = 30;
const { timeline, totalFrames } = buildComposition(dialogue, FPS);
const segments = buildBeatSegments(timeline);

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

/** Soft focus on Human (V11). Opacity-based approximation of a depth-of-field blur. */
const FocusDriver = ({ humanRef, focus }) => {
  useLayoutEffect(() => {
    const human = humanRef.current;
    if (!human) return;
    human.group.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        m.transparent = focus < 1;
        m.opacity = focus;
      });
    });
  });
  return null;
};

// Flip to true after the ElevenLabs step has regenerated audio/degree-short/001–026.mp3.
// A constant, not a prop, so Studio's props panel cannot re-enable audio by accident.
const AUDIO_READY = false;

export default function Episode() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const humanRef = useRef(null);
  const agentRef = useRef(null);

  const beat = beatStateAt(frame, timeline, segments, FPS);
  const pose = cameraPoseAt(frame, timeline, segments, FPS);
  const currentLine = beat.line || timeline[0];

  // Byte is not on screen during line 1 (the hook), except while speaking.
  const byteVisible = !(currentLine.lineId === 1 && currentLine.speaker === "human");
  const clearance = captionClearance(pose, { byteVisible });

  useEffect(() => {
    if (!humanRef.current || !agentRef.current) return
    const isSpeaking = currentLine.speaker === 'human'
    const ctx = { humanPos: HUMAN_POSITION, aiPos: AI_POSITION, cameraPos: pose.position }
    humanRef.current.setLine(currentLine, isSpeaking, currentLine.startFrame, ctx)
    agentRef.current.setLine(currentLine, !isSpeaking, currentLine.startFrame, ctx)
  }, [currentLine.lineId])

  // Line 26's hold is the final pause. The last frame cuts to black.
  const cutToBlack = frame >= totalFrames - 1;

  return (
    <AbsoluteFill style={{ background: "#5E8FC4" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 36, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
        shadows
      >
        <color attach="background" args={["#5E8FC4"]} />
        <fog attach="fog" args={["#D4906A", 16, 52]} />
        <Stage />
        <CameraRig pose={pose} />
        <BeatProps3D beat={beat} />

        <Human ref={humanRef} position={HUMAN_POSITION} rotation={[0, 0.2, 0]} />
        <AIAgent
          ref={agentRef}
          position={AI_POSITION}
          rotation={[0, byteYawAt(beat), 0]}
          visible={byteVisible}
        />
        <SitDriver humanRef={humanRef} />
        <FocusDriver humanRef={humanRef} focus={humanFocusAt(beat)} />
        <ExpressionDriver humanRef={humanRef} agentRef={agentRef} frame={frame} />
      </ThreeCanvas>
      {/* Vignette — draws focus toward center */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.42) 100%)',
        pointerEvents: 'none',
      }} />
      <BeatOverlays beat={beat} />
      <LineVisuals line={currentLine} lineLf={frame - currentLine.startFrame} />
      {/* One audio track per line, offset to its exact start frame */}
      {/* Audio is skipped until AUDIO_READY: the clips in public/audio are from the old 23-line script */}
      {AUDIO_READY && timeline.map((entry) => (
        <Sequence
          key={entry.lineId}
          from={entry.startFrame}
          durationInFrames={entry.speakingFrames}
          layout="none"
        >
          <Audio src={staticFile(entry.audio)} />
        </Sequence>
      ))}
      <Captions frame={frame} timeline={timeline} bottomPx={clearance.bottom} />
      {cutToBlack && <AbsoluteFill style={{ background: "#000" }} />}
    </AbsoluteFill>
  );
}

export { totalFrames, timeline };
