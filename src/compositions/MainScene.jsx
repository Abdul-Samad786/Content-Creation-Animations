import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Canvas } from "@react-three/fiber";
import { Human } from "../characters/Human/Human";
import { AIAgent } from "../characters/AIAgent/AIAgent";

export const MainScene = () => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#6b6b6b" }}>
      <Canvas
        style={{ width, height }}
        camera={{ position: [0, 1.6, 5.5], fov: 45 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#6b6b6b"]} />
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.2}
          castShadow
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />

        {/* Human on the left */}
        <Human position={[-1.6, -0.2, 0]} />

        {/* AI Agent on the right */}
        <AIAgent position={[1.6, -0.1, 0]} />
      </Canvas>
    </AbsoluteFill>
  );
};
