import React from "react";

const Tree = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.35, 0]}>
      <cylinderGeometry args={[0.08, 0.1, 0.7, 5]} />
      <meshStandardMaterial color="#1a1208" roughness={0.9} />
    </mesh>
    <mesh position={[0, 1.2, 0]}>
      <coneGeometry args={[0.6, 1.8, 6]} />
      <meshStandardMaterial
        color="#1a3a28"
        emissive="#0d2818"
        emissiveIntensity={0.25}
        roughness={0.85}
      />
    </mesh>
  </group>
);

const HILLS = [
  { pos: [-8, -1, -20], scale: [16, 0.35, 10], color: "#1a3d28" },
  { pos: [6, 0, -22], scale: [14, 0.35, 9], color: "#1e4230" },
  { pos: [0, 0.5, -25], scale: [18, 0.35, 11], color: "#224535" },
];

const TREES = [
  [-14, 1.2, -18], [-10, 1.4, -19], [-6, 1.1, -17.5], [-3, 1.3, -18.5],
  [2, 1.5, -20], [5, 1.6, -19], [9, 1.3, -20.5], [12, 1.2, -18],
  [-8, 1.8, -22], [-2, 2.0, -23], [3, 2.1, -24], [7, 1.9, -22.5],
  [-12, 1.5, -21], [0, 2.2, -25], [10, 1.7, -23],
];

export default function Hills() {
  return (
    <group>
      {HILLS.map((h, i) => (
        <mesh key={i} position={h.pos} scale={h.scale}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color={h.color} roughness={0.95} />
        </mesh>
      ))}
      {TREES.map((p, i) => (
        <Tree key={i} position={p} scale={0.85 + (i % 3) * 0.15} />
      ))}
    </group>
  );
}
