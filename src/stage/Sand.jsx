import React from "react";

export default function Sand() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3]} receiveShadow>
      <planeGeometry args={[30, 15]} />
      <meshStandardMaterial
        color="#2C2215"
        roughness={0.95}
        metalness={0.0}
      />
    </mesh>
  );
}
