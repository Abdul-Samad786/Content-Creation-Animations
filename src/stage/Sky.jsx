import React from "react";
import * as THREE from "three";

const CLOUDS = [
  {
    pos: [-10, 18, -40],
    boxes: [
      [0, 0, 0, 4, 0.8, 2],
      [2.2, 0.2, 0.3, 3, 0.7, 1.8],
      [-2, 0.1, -0.2, 2.5, 0.6, 1.5],
      [0.5, 0.4, 0.5, 2, 0.5, 1.2],
    ],
  },
  {
    pos: [8, 20, -35],
    boxes: [
      [0, 0, 0, 3.5, 0.7, 1.8],
      [1.8, 0.15, 0.2, 2.8, 0.6, 1.4],
      [-1.5, 0.1, -0.3, 2.2, 0.55, 1.3],
    ],
  },
  {
    pos: [0, 16, -48],
    boxes: [
      [0, 0, 0, 5, 0.9, 2.2],
      [2.5, 0.25, 0.4, 3.2, 0.7, 1.6],
      [-2.8, 0.1, -0.2, 2.8, 0.65, 1.5],
      [0.8, 0.35, -0.4, 2.4, 0.5, 1.3],
    ],
  },
];

export default function Sky() {
  return (
    <group>
      {/* Actual sky blue */}
      <mesh>
        <sphereGeometry args={[80, 32, 32]} />
        <meshBasicMaterial color="#6BA8D9" side={THREE.BackSide} fog={false} />
      </mesh>
      {/* Softer upper atmosphere */}
      <mesh>
        <sphereGeometry args={[75, 32, 32]} />
        <meshBasicMaterial
          color="#A8D0F0"
          side={THREE.BackSide}
          transparent
          opacity={0.35}
          fog={false}
        />
      </mesh>

      {/* Warm golden horizon haze */}
      <mesh position={[0, -2, -30]} scale={[50, 8, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#FFC89A"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          fog={false}
          depthWrite={false}
        />
      </mesh>

      {/* Sun */}
      <mesh position={[12, 18, -25]}>
        <sphereGeometry args={[2.5, 24, 24]} />
        <meshStandardMaterial
          color="#FFF5C0"
          emissive="#FFF5C0"
          emissiveIntensity={1.2}
          fog={false}
        />
      </mesh>
      <pointLight
        position={[12, 18, -25]}
        color="#FFE5A0"
        intensity={3.0}
        distance={120}
      />

      {CLOUDS.map((cloud, i) => (
        <group key={i} position={cloud.pos}>
          {cloud.boxes.map(([x, y, z, w, h, d], j) => (
            <mesh key={j} position={[x, y, z]}>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial
                color="#FFFFFF"
                transparent
                opacity={0.75}
                roughness={1}
                fog={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
