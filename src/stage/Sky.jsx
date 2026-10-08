import React from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";

const CLOUDS = [
  { pos: [-11, 14, -38], size: 1.3 },
  { pos: [9,  17, -32],  size: 1.0 },
  { pos: [0,  12, -46],  size: 1.6 },
  { pos: [-5, 19, -28],  size: 0.8 },
  { pos: [15, 15, -36],  size: 1.1 },
];

const BLOBS = [
  [0,    0,    0,    1.0],
  [1.35,-0.1,  0.2,  0.82],
  [-1.1,-0.05,-0.1,  0.76],
  [0.6,  0.38, 0.3,  0.65],
  [-0.45,0.28,-0.2,  0.58],
  [1.05, 0.2, -0.3,  0.50],
];

function Cloud({ position, size }) {
  return (
    <group position={position} scale={size}>
      {BLOBS.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r, 8, 6]} />
          <meshStandardMaterial
            color="#FFF5EA"
            transparent
            opacity={0.80}
            roughness={1}
            fog={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

const BIRD_DEFS = [
  { bx: 8,   by: 22, z: -20, speed: 0.35, phase: 0.0 },
  { bx: -6,  by: 24, z: -22, speed: 0.28, phase: 1.5 },
  { bx: 3,   by: 21, z: -19, speed: 0.31, phase: 3.0 },
  { bx: 12,  by: 23, z: -25, speed: 0.24, phase: 4.2 },
];

function Bird({ bx, by, z, speed, phase }) {
  const frame = useCurrentFrame();
  const t = frame / 30;
  // wrap x so bird drifts left and loops
  const x = bx - ((t * speed * 3.5) % 42) + 21;
  const y = by + Math.sin(t * 0.55 + phase) * 0.45;
  const flap = Math.sin(t * 3.8 + phase) * 0.22;
  return (
    <group position={[x, y, z]} scale={0.18}>
      <mesh position={[-0.55, flap * 0.4, 0]} rotation={[0, 0, -0.3 + flap]}>
        <boxGeometry args={[1.1, 0.07, 0.05]} />
        <meshBasicMaterial color="#1A2A4A" fog={false} />
      </mesh>
      <mesh position={[0.55, flap * 0.4, 0]} rotation={[0, 0, 0.3 - flap]}>
        <boxGeometry args={[1.1, 0.07, 0.05]} />
        <meshBasicMaterial color="#1A2A4A" fog={false} />
      </mesh>
    </group>
  );
}

export default function Sky() {
  return (
    <group>
      {/* Base sky — deep blue */}
      <mesh>
        <sphereGeometry args={[80, 32, 16]} />
        <meshBasicMaterial color="#3B6CA6" side={THREE.BackSide} fog={false} />
      </mesh>

      {/* Upper-mid sky — lighter blue layer */}
      <mesh>
        <sphereGeometry args={[76, 32, 12]} />
        <meshBasicMaterial
          color="#6BAAD8"
          side={THREE.BackSide}
          transparent
          opacity={0.55}
          fog={false}
          depthWrite={false}
        />
      </mesh>

      {/* Horizon warm band — open cylinder, gold/peach */}
      <mesh position={[0, -6, 0]}>
        <cylinderGeometry args={[74, 74, 22, 32, 1, true]} />
        <meshBasicMaterial
          color="#F0A050"
          side={THREE.BackSide}
          transparent
          opacity={0.32}
          fog={false}
          depthWrite={false}
        />
      </mesh>

      {/* Second warm band — lighter peach, slightly higher */}
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[72, 72, 14, 32, 1, true]} />
        <meshBasicMaterial
          color="#F8C878"
          side={THREE.BackSide}
          transparent
          opacity={0.15}
          fog={false}
          depthWrite={false}
        />
      </mesh>

      {/* Sun — outer corona */}
      <mesh position={[12, 18, -25.8]}>
        <circleGeometry args={[10, 20]} />
        <meshBasicMaterial
          color="#FFB030"
          transparent
          opacity={0.09}
          fog={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Sun — inner halo */}
      <mesh position={[12, 18, -25.5]}>
        <circleGeometry args={[5.5, 16]} />
        <meshBasicMaterial
          color="#FFE060"
          transparent
          opacity={0.18}
          fog={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Sun core */}
      <mesh position={[12, 18, -25]}>
        <sphereGeometry args={[2.2, 20, 16]} />
        <meshStandardMaterial
          color="#FFF8C0"
          emissive="#FFF8C0"
          emissiveIntensity={1.4}
          fog={false}
        />
      </mesh>
      <pointLight
        position={[12, 18, -25]}
        color="#FFE5A0"
        intensity={3.5}
        distance={130}
      />

      {CLOUDS.map((c, i) => (
        <Cloud key={i} position={c.pos} size={c.size} />
      ))}

      {BIRD_DEFS.map((b, i) => (
        <Bird key={i} {...b} />
      ))}
    </group>
  );
}
