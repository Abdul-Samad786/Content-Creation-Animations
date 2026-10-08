import React from "react";

const oak = { color: "#C8A06A", roughness: 0.8, metalness: 0 };
const leg = { color: "#A67C52", roughness: 0.85, metalness: 0 };

export default function Bench({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.08, 0.5]} />
        <meshStandardMaterial {...oak} />
      </mesh>

      <mesh
        position={[0, 0.78, -0.22]}
        rotation={[(8 * Math.PI) / 180, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[2.4, 0.5, 0.06]} />
        <meshStandardMaterial {...oak} />
      </mesh>

      <mesh position={[-1.0, 0.22, 0.18]} castShadow>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial {...leg} />
      </mesh>
      <mesh position={[-1.0, 0.22, -0.18]} castShadow>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial {...leg} />
      </mesh>
      <mesh position={[1.0, 0.22, 0.18]} castShadow>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial {...leg} />
      </mesh>
      <mesh position={[1.0, 0.22, -0.18]} castShadow>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial {...leg} />
      </mesh>

      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[2.0, 0.06, 0.06]} />
        <meshStandardMaterial {...leg} />
      </mesh>

      {/* Laptop beside Human */}
      <group position={[-0.2, 0.5, 0.15]} rotation={[-0.5, 0.15, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.02, 0.25]} />
          <meshStandardMaterial color="#2A2A2A" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.015, 0]}>
          <boxGeometry args={[0.3, 0.01, 0.22]} />
          <meshStandardMaterial color="#1A3A5A" roughness={0.4} />
        </mesh>
      </group>

      {/* Notebook */}
      <group position={[-0.05, 0.47, 0.35]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.015, 0.26]} />
          <meshStandardMaterial color="#F5F0E8" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.009, -0.04]}>
          <boxGeometry args={[0.16, 0.002, 0.01]} />
          <meshStandardMaterial color="#CCCCCC" />
        </mesh>
        <mesh position={[0, 0.009, 0]}>
          <boxGeometry args={[0.16, 0.002, 0.01]} />
          <meshStandardMaterial color="#CCCCCC" />
        </mesh>
        <mesh position={[0, 0.009, 0.04]}>
          <boxGeometry args={[0.16, 0.002, 0.01]} />
          <meshStandardMaterial color="#CCCCCC" />
        </mesh>
      </group>
    </group>
  );
}
