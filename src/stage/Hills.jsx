import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";

const HILLS = [
  { pos: [-8, -1, -20], scale: [16, 0.4, 10], color: "#4A7A3A" },
  { pos: [7, -0.5, -24], scale: [14, 0.4, 9], color: "#3D6B2E" },
  { pos: [0, 0, -28], scale: [20, 0.4, 12], color: "#527A40" },
];

// Distant layer — desaturated, lighter for atmospheric perspective
const FAR_HILLS = [
  { pos: [-14, -3, -44], scale: [22, 0.25, 8], color: "#8AA48A" },
  { pos: [5,   -2, -48], scale: [20, 0.22, 7], color: "#8CAE8C" },
  { pos: [18,  -3, -42], scale: [18, 0.2,  7], color: "#90A890" },
];

const FAR_CONES = [
  [-16, -2.5, -42, 0.45], [-11, -2.2, -45, 0.55], [-4,  -2.0, -46, 0.50],
  [2,   -1.8, -48, 0.60], [8,   -2.1, -43, 0.48], [14,  -2.3, -41, 0.52],
  [20,  -2.5, -40, 0.44],
];

// Y sits on hill crests (tops ≈ -0.6 / -0.1 / 0.4) — trunks planted into surface
const CONES = [
  [-12, -0.55, -18, 0.9], [-8, -0.45, -19, 1.0], [-4, -0.5, -17.5, 0.85],
  [3, -0.05, -21, 1.1], [9, -0.1, -19, 0.95], [12, -0.15, -20, 0.9],
  [-6, 0.15, -23, 1.05], [1, 0.25, -25, 1.15],
];

const ROUNDS = [
  [-14, -0.5, -19, 0.8], [-10, -0.4, -20.5, 1.1], [-2, -0.45, -18, 1.0],
  [0, 0.1, -22, 1.3], [5, -0.05, -20, 0.9], [8, 0.0, -22, 1.1],
  [11, -0.1, -21, 0.8], [-5, 0.2, -24, 1.2], [2, 0.3, -26, 1.0],
  [6, 0.15, -24, 1.3], [-11, -0.2, -22, 0.9], [10, 0.05, -23.5, 1.1],
];

function ConeTree({ position, scale = 1, phase = 0 }) {
  const ref = useRef();
  const frame = useCurrentFrame();

  useFrame(() => {
    if (!ref.current) return;
    const t = frame / 30;
    ref.current.rotation.z = Math.sin(t * 0.8 + phase) * 0.04;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.6, 5]} />
        <meshStandardMaterial color="#8B5E3C" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <coneGeometry args={[0.6, 1.8, 6]} />
        <meshStandardMaterial color="#3A5E28" roughness={0.85} />
      </mesh>
    </group>
  );
}

function RoundTree({ position, scale = 1, phase = 0 }) {
  const ref = useRef();
  const frame = useCurrentFrame();

  useFrame(() => {
    if (!ref.current) return;
    const t = frame / 30;
    ref.current.rotation.z = Math.sin(t * 0.7 + phase) * 0.035;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.6, 5]} />
        <meshStandardMaterial color="#8B5E3C" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.95, 0]} scale={[1, 0.85, 1]} castShadow>
        <sphereGeometry args={[0.9, 12, 10]} />
        <meshStandardMaterial
          color="#6B9E42"
          emissive="#2A4A18"
          emissiveIntensity={0.1}
          roughness={0.85}
        />
      </mesh>
    </group>
  );
}

export default function Hills() {
  return (
    <group>
      {/* Far layer — static, desaturated */}
      {FAR_HILLS.map((h, i) => (
        <mesh key={`fh${i}`} position={h.pos} scale={h.scale}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={h.color} roughness={0.95} fog />
        </mesh>
      ))}
      {FAR_CONES.map(([x, y, z, s], i) => (
        <group key={`ft${i}`} position={[x, y, z]} scale={s}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.5, 5]} />
            <meshStandardMaterial color="#9A8070" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <coneGeometry args={[0.45, 1.4, 5]} />
            <meshStandardMaterial color="#7A9878" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Mid layer */}
      {HILLS.map((h, i) => (
        <mesh key={i} position={h.pos} scale={h.scale} receiveShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color={h.color} roughness={0.95} />
        </mesh>
      ))}
      {CONES.map(([x, y, z, s], i) => (
        <ConeTree key={`c${i}`} position={[x, y, z]} scale={s} phase={i * 0.7} />
      ))}
      {ROUNDS.map(([x, y, z, s], i) => (
        <RoundTree key={`r${i}`} position={[x, y, z]} scale={s} phase={i * 0.9} />
      ))}
    </group>
  );
}
