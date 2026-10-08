import React from "react";

const wood = {
  color: "#5C3A1E",
  roughness: 0.8,
  metalness: 0.0,
};

export default function Bench({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.08, 0.5]} />
        <meshStandardMaterial {...wood} />
      </mesh>

      {/* Backrest — tilted ~8° on X */}
      <mesh
        position={[0, 0.78, -0.22]}
        rotation={[(8 * Math.PI) / 180, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[2.4, 0.5, 0.06]} />
        <meshStandardMaterial {...wood} />
      </mesh>

      {/* Left legs */}
      <mesh position={[-1.0, 0.22, 0.18]} castShadow>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <mesh position={[-1.0, 0.22, -0.18]} castShadow>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial {...wood} />
      </mesh>

      {/* Right legs */}
      <mesh position={[1.0, 0.22, 0.18]} castShadow>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <mesh position={[1.0, 0.22, -0.18]} castShadow>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial {...wood} />
      </mesh>

      {/* Cross brace */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[2.0, 0.06, 0.06]} />
        <meshStandardMaterial {...wood} />
      </mesh>
    </group>
  );
}
