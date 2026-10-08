import React, { useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Canvas } from "@react-three/fiber";
import { Human } from "../characters/Human";
import { AIAgent } from "../characters/AIAgent";
import Stage from "../stage/Stage";
import CameraRig from "../camera/CameraRig";
import dialogue from "../dialogue.json";
import {
  aiGlow,
  aiHover,
  armRaise,
  captionOpacity,
  getActiveLine,
  headNod,
} from "../animations";

/**
 * Applies dialogue-driven poses to character class instances.
 * Lives inside Canvas so it runs after primitives mount.
 */
const CharacterDriver = ({ frame, fps, humanRef, agentRef, activeLine }) => {
  useLayoutEffect(() => {
    const human = humanRef.current;
    const agent = agentRef.current;
    if (!human || !agent) return;

    const t = frame / fps;
    const humanSpeaking = activeLine?.speaker === "human";
    const aiSpeaking = activeLine?.speaker === "ai";

    // ── Human (seated on bench) ──
    human.leftUpperLeg.rotation.x = -Math.PI / 2;
    human.rightUpperLeg.rotation.x = -Math.PI / 2;
    human.leftLowerLeg.rotation.x = Math.PI / 2.2;
    human.rightLowerLeg.rotation.x = Math.PI / 2.2;

    human.idleBreathe(t, humanSpeaking ? 0.025 : 0.012, humanSpeaking ? 1.8 : 1.3);

    if (humanSpeaking) {
      human.setHeadRotation(
        headNod(frame, activeLine.startFrame, activeLine.endFrame),
        "x",
      );
      human.setArmRotation(
        armRaise(frame, activeLine.startFrame, activeLine.endFrame),
        "right",
      );
    } else {
      human.setHeadRotation(0, "x");
      human.setArmRotation(0, "right");
    }

    // ── AI Agent ──
    if (aiSpeaking) {
      agent.idleHover(aiHover(frame), 0.09, 3.4);
      const glow = aiGlow(frame, activeLine.startFrame, activeLine.endFrame);
      agent.leftEye.material.emissiveIntensity = glow;
      agent.rightEye.material.emissiveIntensity = glow;
      agent.mouth.material.emissiveIntensity = glow;
    } else {
      agent.idleHover(aiHover(frame), 0.05, 2);
      agent.leftEye.material.emissiveIntensity = 1.2;
      agent.rightEye.material.emissiveIntensity = 1.2;
      agent.mouth.material.emissiveIntensity = 1.2;
    }
  }, [frame, fps, humanRef, agentRef, activeLine]);

  return null;
};

const CaptionOverlay = ({ frame, activeLine }) => {
  if (!activeLine) return null;

  const isHuman = activeLine.speaker === "human";
  const opacity = captionOpacity(frame, activeLine.startFrame, activeLine.endFrame);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 40,
        right: 40,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.65)",
          borderRadius: 12,
          padding: "14px 24px",
          maxWidth: 1100,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 6,
            color: isHuman ? "#9A9A9A" : "#D97757",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {isHuman ? "DEV" : "BYTE"}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.35,
            color: isHuman ? "#EDEDED" : "#FF8C5A",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {activeLine.text}
        </div>
      </div>
    </div>
  );
};

const PRESET_BUTTONS = [
  "TWO_SHOT",
  "HUMAN_CU",
  "AI_CU",
  "OVER_HUMAN",
  "OVER_AI",
  "WIDE_SEA",
];

export const MainScene = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const humanRef = useRef(null);
  const agentRef = useRef(null);
  const [currentPreset, setCurrentPreset] = useState("TWO_SHOT");

  const activeLine = getActiveLine(frame, dialogue);

  return (
    <AbsoluteFill style={{ backgroundColor: "#6BA8D9" }}>
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4,
            zIndex: 9999,
            pointerEvents: "all",
          }}
        >
          {PRESET_BUTTONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPreset(p);
              }}
              style={{
                fontSize: 9,
                padding: "4px 8px",
                background: currentPreset === p ? "#00ff88" : "#111",
                color: currentPreset === p ? "#000" : "#00ff88",
                border: "1px solid #00ff88",
                cursor: "pointer",
                borderRadius: 3,
                pointerEvents: "all",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <Canvas
          style={{ width, height, pointerEvents: "none" }}
          gl={{ antialias: true }}
          shadows
          camera={{ position: [0, 1.4, 4.5], fov: 42, near: 0.1, far: 100 }}
        >
          <color attach="background" args={["#6BA8D9"]} />
          <fog attach="fog" args={["#C5D9EC", 22, 60]} />

          <Stage />
          <CameraRig preset={currentPreset} />

          {/* Y≈-0.45 places hips on the seat (Y=0.45) once legs are bent */}
          <Human ref={humanRef} position={[-0.55, -0.45, 0.2]} rotation={[0, 0.2, 0]} />
          <AIAgent ref={agentRef} position={[0.55, 0.55, 0.2]} rotation={[0, -0.2, 0]} />

          <CharacterDriver
            frame={frame}
            fps={fps}
            humanRef={humanRef}
            agentRef={agentRef}
            activeLine={activeLine}
          />
        </Canvas>

        <CaptionOverlay frame={frame} activeLine={activeLine} />
      </div>
    </AbsoluteFill>
  );
};
