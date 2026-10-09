import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import dialogue from "../episodes/ep01-degree/dialogue.json";
import audioDurations from "../episodes/ep01-degree/audioDurations.json";
import { buildComposition } from "../timeline/buildTimeline";
import Stage from "../stage/Stage";
import CameraRig from "../camera/CameraRig";
import {
  AI_POSITION,
  HUMAN_POSITION,
  beatStateAt,
  buildBeatSegments,
  byteYawAt,
  cameraPoseAt,
} from "../camera/rig";
import BeatProps3D from "../beats/BeatProps3D";
import BeatOverlays, { WarmGrade } from "../beats/BeatOverlays";
import LineVisuals from "../beats/LineVisuals";
import { Human } from "../characters/Human";
import { AIAgent } from "../characters/AIAgent";
import Captions from "../subtitles/Captions";

const FPS = 30;
const { timeline, totalFrames } = buildComposition(dialogue, FPS, audioDurations);
const segments = buildBeatSegments(timeline);

// Golden-hour sky tone behind the 3D scene (also the canvas clear colour)
const SKY = "#E9A574";

/**
 * Drives both characters from the script for this frame: expressions, gaze,
 * blinks, talking mouths, listener reactions, poses, breathing and hover.
 * Each character's plan is built once from the timeline; update(frame) is pure.
 */
const PerformanceDriver = ({ humanRef, agentRef, frame }) => {
  useLayoutEffect(() => {
    for (const ref of [humanRef, agentRef]) {
      const character = ref.current;
      if (!character) continue;
      if (!character.plan) character.setTimeline(timeline);
      character.update(frame, FPS);
    }
  });
  return null;
};

// Plays public/audio/degree/NNN.mp3 (scripts/generate_audio.py). Set false for a silent draft.
// A constant, not a prop, so Studio's props panel cannot override it by accident.
const AUDIO_READY = true;

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

  // Line 26's hold is the final pause. The last frame cuts to black.
  const cutToBlack = frame >= totalFrames - 1;

  return (
    <AbsoluteFill style={{ background: SKY }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 36, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
        shadows
      >
        <color attach="background" args={[SKY]} />
        <fog attach="fog" args={["#E2A57A", 16, 52]} />
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
        <PerformanceDriver humanRef={humanRef} agentRef={agentRef} frame={frame} />
      </ThreeCanvas>
      <WarmGrade />
      <BeatOverlays beat={beat} />
      <LineVisuals line={currentLine} lineLf={frame - currentLine.startFrame} />
      {/* One audio track per line, offset to its exact start frame */}
      {/* Lines with no audio (line 16) are silent: their screen time is the pause alone */}
      {AUDIO_READY && timeline.map((entry) =>
        !entry.audio ? null : (
          <Sequence
            key={entry.lineId}
            from={entry.startFrame}
            durationInFrames={entry.endFrame - entry.startFrame}
            layout="none"
          >
            <Audio src={staticFile(entry.audio)} startFrom={0} />
          </Sequence>
        )
      )}
      <Captions frame={frame} timeline={timeline} />
      {cutToBlack && <AbsoluteFill style={{ background: "#000" }} />}
    </AbsoluteFill>
  );
}

export { totalFrames, timeline };
