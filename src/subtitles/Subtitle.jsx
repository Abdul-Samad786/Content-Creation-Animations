import React from "react";
import { AbsoluteFill } from "remotion";

export default function Subtitle({ text, speaker }) {
  const isHuman = speaker === "human";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          textAlign: "center",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 28,
          fontWeight: 600,
          color: isHuman ? "#ffffff" : "#D97757",
          textShadow: "0 2px 8px rgba(0,0,0,0.9)",
          lineHeight: 1.4,
          padding: "8px 16px",
          background: "rgba(0,0,0,0.35)",
          borderRadius: 8,
          borderLeft: isHuman ? "3px solid #ffffff" : "3px solid #D97757",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}
