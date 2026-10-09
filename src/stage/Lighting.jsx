import React from "react";

export default function Lighting({ mood = 0 }) {
  const sunIntensity = 1.8 - mood * 0.4;

  return (
    <>
      <ambientLight intensity={0.6} color="#FFE4B5" />

      {/* Golden hour sun */}
      <directionalLight
        position={[12, 18, -8]}
        intensity={sunIntensity}
        color="#FFD580"
        castShadow
      />

      {/* Soft warm fill (a cool fill read as blue daylight) */}
      <directionalLight
        position={[-8, 4, 5]}
        intensity={0.4}
        color="#FFD9B8"
      />

      {/* Subtle warm bench lamp */}
      <pointLight
        position={[1.5, 2.5, 1]}
        color="#FFB347"
        intensity={0.8}
        distance={6}
        decay={2}
      />
    </>
  );
}
