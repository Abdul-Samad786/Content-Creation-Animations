import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function Sea() {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const pos = mesh.geometry.attributes.position;
    const t = clock.getElapsedTime();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const wave =
        Math.sin(x * 0.4 + t * 0.6) * 0.05 +
        Math.sin(y * 0.3 + t * 0.4) * 0.03;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, -8]}
    >
      <planeGeometry args={[60, 30, 32, 16]} />
      <meshStandardMaterial
        color="#0E2038"
        metalness={0.7}
        roughness={0.25}
      />
    </mesh>
  );
}
