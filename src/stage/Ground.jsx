import React from "react";

const ROCKS = [
  { p: [-6, 0.04, -1], r: 0.12, c: "#8B7355" },
  { p: [-4.2, 0.05, 1.5], r: 0.15, c: "#7A6548" },
  { p: [-2.5, 0.03, -0.8], r: 0.09, c: "#968060" },
  { p: [-1, 0.04, 2.2], r: 0.11, c: "#8B7355" },
  { p: [0.8, 0.05, -1.5], r: 0.14, c: "#7A6548" },
  { p: [2.2, 0.04, 0.6], r: 0.1, c: "#968060" },
  { p: [4, 0.05, 1.8], r: 0.16, c: "#8B7355" },
  { p: [5.5, 0.03, -0.5], r: 0.08, c: "#7A6548" },
  { p: [-5.5, 0.04, 3], r: 0.13, c: "#968060" },
  { p: [-3, 0.05, 3.5], r: 0.11, c: "#8B7355" },
  { p: [1.5, 0.04, 3.2], r: 0.1, c: "#7A6548" },
  { p: [3.8, 0.05, 2.8], r: 0.14, c: "#968060" },
  { p: [-7, 0.04, 0.5], r: 0.12, c: "#8B7355" },
  { p: [6.5, 0.03, 1.2], r: 0.09, c: "#7A6548" },
  { p: [-0.5, 0.04, -2.5], r: 0.11, c: "#968060" },
  { p: [4.8, 0.05, -2], r: 0.15, c: "#8B7355" },
  { p: [-4.8, 0.04, -2.8], r: 0.1, c: "#7A6548" },
  { p: [2.8, 0.04, 4], r: 0.12, c: "#968060" },
  { p: [-2, 0.05, 4.2], r: 0.13, c: "#8B7355" },
  { p: [0.2, 0.04, 4.5], r: 0.08, c: "#7A6548" },
  { p: [7, 0.05, 2.5], r: 0.14, c: "#968060" },
  { p: [-6.5, 0.04, 2], r: 0.11, c: "#8B7355" },
  { p: [5, 0.04, 4], r: 0.1, c: "#7A6548" },
  { p: [-3.5, 0.05, 0.2], r: 0.12, c: "#968060" },
  { p: [1, 0.04, -3], r: 0.09, c: "#8B7355" },
];

const GRASS = [
  [-5, 0, 1], [-3.5, 0, 2.5], [-2, 0, 0.5], [-0.5, 0, 3],
  [1.2, 0, 1.5], [2.8, 0, 0.2], [4.5, 0, 2], [6, 0, 1],
  [-4, 0, -1], [-1.5, 0, -2], [0.5, 0, -1.5], [3, 0, -2.5],
  [5, 0, -1], [-6, 0, 3.5], [2, 0, 3.8],
];

function GrassClump({ position }) {
  const blades = [
    [0, 0.12, 0, -0.1],
    [0.04, 0.13, 0.02, 0.15],
    [-0.03, 0.11, -0.02, -0.2],
    [0.02, 0.125, -0.03, 0.08],
  ];
  return (
    <group position={position}>
      {blades.map(([x, h, z, lean], i) => (
        <mesh key={i} position={[x, h, z]} rotation={[0, 0, lean]}>
          <boxGeometry args={[0.03, 0.25, 0.03]} />
          <meshStandardMaterial color="#5C7A3E" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export default function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial color="#C4A882" roughness={0.9} metalness={0} />
      </mesh>

      {ROCKS.map((rock, i) => (
        <mesh
          key={i}
          position={rock.p}
          scale={[1, 0.5, 1]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[rock.r, 8, 6]} />
          <meshStandardMaterial color={rock.c} roughness={0.95} />
        </mesh>
      ))}

      {GRASS.map((p, i) => (
        <GrassClump key={i} position={p} />
      ))}
    </group>
  );
}
