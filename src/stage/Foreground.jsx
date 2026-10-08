import React from "react";

const CLUMPS = [
  [-2.5, -0.1, 3.6],
  [-1.8, -0.1, 3.8],
  [-3.0, -0.1, 3.5],
  [2.5, -0.1, 3.6],
  [1.8, -0.1, 3.8],
  [3.0, -0.1, 3.5],
];

const FLOWERS = [
  { p: [-2.1, 0.35, 3.55], c: "#FFD700", s: 0.1 },
  { p: [-2.8, 0.4, 3.7], c: "#FF6B6B", s: 0.09 },
  { p: [2.1, 0.38, 3.55], c: "#FFFFFF", s: 0.11 },
  { p: [2.7, 0.42, 3.65], c: "#FFD700", s: 0.08 },
  { p: [-1.5, 0.36, 3.9], c: "#FF6B6B", s: 0.12 },
  { p: [1.5, 0.37, 3.9], c: "#FFFFFF", s: 0.1 },
];

const BLADE_DEFS = [
  [0, 0.35, 0, 0.7, -0.12],
  [0.05, 0.32, 0.02, 0.65, 0.1],
  [-0.05, 0.38, -0.02, 0.75, -0.18],
  [0.08, 0.28, -0.03, 0.55, 0.2],
  [-0.07, 0.4, 0.03, 0.8, -0.08],
  [0.02, 0.3, 0.04, 0.6, 0.15],
  [-0.03, 0.34, -0.04, 0.68, -0.22],
];

function TallClump({ position }) {
  return (
    <group position={position}>
      {BLADE_DEFS.map(([x, y, z, h, lean], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0.05, 0, lean]}>
          <boxGeometry args={[0.04, h, 0.04]} />
          <meshStandardMaterial color="#4A6B2E" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Flower({ position, color, scale }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[0.04, 0.4, 0.04]} />
        <meshStandardMaterial color="#3A5A28" />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

export default function Foreground() {
  return (
    <group>
      {CLUMPS.map((p, i) => (
        <TallClump key={i} position={p} />
      ))}
      {FLOWERS.map((f, i) => (
        <Flower key={i} position={f.p} color={f.c} scale={f.s} />
      ))}
    </group>
  );
}
