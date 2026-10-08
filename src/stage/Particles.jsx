import React from "react";
import { useCurrentFrame } from "remotion";

// Floating pollen/light motes near the characters — fully deterministic
const DEFS = [
  { x: -1.2, z: 0.8,  period: 3.0, phase: 0.0, drift: -0.25 },
  { x:  0.4, z: 0.6,  period: 3.5, phase: 0.7, drift:  0.20 },
  { x: -0.5, z: 1.1,  period: 2.8, phase: 1.4, drift: -0.15 },
  { x:  1.1, z: 0.9,  period: 3.2, phase: 2.1, drift:  0.30 },
  { x: -1.6, z: 1.3,  period: 2.6, phase: 2.8, drift: -0.35 },
  { x:  0.8, z: 1.5,  period: 3.8, phase: 0.4, drift:  0.10 },
  { x: -0.2, z: 0.4,  period: 2.9, phase: 3.5, drift: -0.20 },
  { x:  1.5, z: 1.2,  period: 3.3, phase: 1.0, drift:  0.25 },
  { x: -1.0, z: 0.3,  period: 3.6, phase: 4.2, drift: -0.10 },
  { x:  0.2, z: 1.4,  period: 2.7, phase: 3.0, drift:  0.15 },
  { x: -1.8, z: 0.7,  period: 3.1, phase: 1.8, drift: -0.30 },
  { x:  1.3, z: 0.5,  period: 2.5, phase: 5.0, drift:  0.22 },
];

function Mote({ x, z, period, phase, drift }) {
  const frame = useCurrentFrame();
  const t = (frame / 30 + phase) % period;
  const progress = t / period;

  const y = 0.4 + progress * 2.4;
  const wobble = Math.sin(frame / 30 * 1.1 + phase) * 0.28 + drift;

  // Fade in at birth, fade out near top
  const opacity =
    progress < 0.12 ? (progress / 0.12) * 0.65
    : progress > 0.80 ? ((1 - progress) / 0.20) * 0.65
    : 0.65;

  return (
    <mesh position={[x + wobble, y, z]}>
      <sphereGeometry args={[0.016, 4, 3]} />
      <meshBasicMaterial color="#FFD870" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

export default function Particles() {
  return (
    <group>
      {DEFS.map((d, i) => (
        <Mote key={i} {...d} />
      ))}
    </group>
  );
}
