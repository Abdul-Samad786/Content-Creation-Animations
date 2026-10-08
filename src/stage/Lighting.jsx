import React from "react";

export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.75} color="#2a4a6c" />
      <hemisphereLight args={["#6a90b8", "#1a3020", 0.45]} />

      {/* Moonlight */}
      <directionalLight
        position={[5, 12, -5]}
        intensity={1.3}
        color="#e8f2ff"
        castShadow
      />

      {/* Warm left-side fill */}
      <pointLight
        position={[-3.5, 2.5, 2.5]}
        intensity={1.8}
        color="#FF8C42"
        distance={14}
        decay={1.2}
      />

      {/* Byte's teal bounce */}
      <pointLight
        position={[2.5, 1.8, 1.5]}
        intensity={1.1}
        color="#00FFB2"
        distance={10}
        decay={1.2}
      />

      {/* Warm lamp pool over the bench */}
      <pointLight
        position={[0, 3.2, 1.2]}
        color="#ffcc77"
        intensity={3.5}
        distance={12}
        decay={1.5}
      />
      <pointLight
        position={[1.5, 2.4, 0.8]}
        color="#ffb347"
        intensity={2.2}
        distance={8}
        decay={1.5}
      />
    </>
  );
}
