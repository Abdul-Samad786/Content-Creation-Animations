import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { toonRamp } from "../toon";
import { clamp } from "../math";
import { useFaceTexture } from "./useFaceTexture";
import { lookAngles } from "./look";

// Byte: a soft, round, floating robot. Its whole body is a squishy rounded
// cube with a glowing screen face, little headphone ears, a bouncy antenna,
// and two floating mitten hands. It hovers on a soft glow.

export const ROBOT = {
  hover: 1.12,
  face: () => [0, 1.14, 0.0],
  top: () => [0, 1.6, 0.0],
};

const Toon = ({ color, ...rest }) => <meshToonMaterial color={color} gradientMap={toonRamp()} {...rest} />;

/** Idle hover height, separate so the antenna can lag behind it. */
function hoverY(frame, idle) {
  return Math.sin(frame * 0.1) * 0.035 * idle + Math.sin(frame * 0.037) * 0.012;
}

function Hand({ pos, color, frame, phase, idle }) {
  const bob = Math.sin(frame * 0.1 + phase) * 0.025 * idle;
  return (
    <group position={[pos[0], pos[1] + bob, pos[2]]}>
      <mesh scale={[1, 0.9, 0.85]} castShadow>
        <sphereGeometry args={[0.072, 18, 14]} />
        <Toon color={color} />
      </mesh>
      <mesh position={[0, 0.05, 0.03]} scale={[0.5, 0.6, 0.5]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <Toon color={color} />
      </mesh>
    </group>
  );
}

export default function Robot({ state, mark, look, ctx, otherX = 0 }) {
  const { pose, g, face } = state;
  const t = state.frame;
  const idle = 1 - g.freeze;

  const bodyGeo = useMemo(() => new RoundedBoxGeometry(0.62, 0.52, 0.46, 6, 0.19), []);
  const bezelGeo = useMemo(() => new RoundedBoxGeometry(0.52, 0.41, 0.03, 4, 0.1), []);

  const selfFace = [mark.position[0], ROBOT.hover + pose.y, mark.position[2]];
  const la = lookAngles(state.look, { face: selfFace }, ctx);
  const texture = useFaceTexture({ ...face, lookX: la.eyeX, lookY: la.eyeY }, "screen", { glow: look.glow, screen: look.screen, accent: look.accent, blush: look.blush }, 512, 400);

  const y = ROBOT.hover + pose.y + hoverY(t, idle) + g.y;
  // Antenna lags the body's vertical motion (spring-like secondary motion)
  const vy = hoverY(t, idle) - hoverY(t - 3, idle);
  const antennaTilt = clamp(-vy * 9 + pose.droop * 0.9 - g.y * 1.4, -0.6, 1.2);
  const antennaSide = Math.sin(t * 0.07) * 0.08 * idle - g.rz * 1.5 - g.x * 4;

  const towardX = (otherX - mark.position[0]) * 0.32 * g.toward;
  const squash = g.squash + Math.sin(t * 0.1 + 0.6) * 0.012 * idle;
  const sx = 1 - squash * 0.6;
  const bodyYaw = la.headYaw * 0.7 + g.ry + g.headYaw;
  const bodyPitch = pose.rx + g.rx + la.headPitch * 0.4 + g.headPitch;
  const bodyRoll = pose.rz + g.rz + Math.sin(t * 0.05) * 0.03 * idle + g.headRoll;

  // Screen off: the lights go out. Byte 2.0: a cooler, corporate accent.
  const off = face.screen === "off";
  const accent = face.screen === "v2" ? "#9DB8F2" : look.accent;
  const glowPulse = (0.75 + 0.25 * Math.sin(t * 0.15)) * (off ? 0.12 : 1);

  return (
    <group position={mark.position} visible={state.visible}>
      <group position={[g.x + towardX, y, g.z + g.toward * 0.12]} scale={g.scale}>
        <group rotation={[bodyPitch, bodyYaw, bodyRoll]} scale={[sx, 1 + squash, sx]}>
          {/* Body */}
          <mesh geometry={bodyGeo} castShadow>
            <Toon color={look.body} />
          </mesh>
          {/* Lighter belly band */}
          <mesh position={[0, -0.2, 0.0]} scale={[1, 0.35, 1]}>
            <sphereGeometry args={[0.27, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <Toon color={look.bodyShade} />
          </mesh>
          {/* Screen bezel + face */}
          <mesh geometry={bezelGeo} position={[0, 0.02, 0.222]}>
            <Toon color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.02, 0.24]}>
            <planeGeometry args={[0.48, 0.375]} />
            <meshBasicMaterial map={texture} transparent toneMapped={false} />
          </mesh>
          {/* Headphone ears */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.32, 0.02, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.1, 0.1, 0.06, 24]} />
                <Toon color={look.bodyShade} />
              </mesh>
              <mesh position={[s * 0.032, 0, 0]} rotation={[0, s * Math.PI / 2, 0]}>
                <circleGeometry args={[0.055, 20]} />
                <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.6 + 0.4 * glowPulse} />
              </mesh>
            </group>
          ))}
          {/* Antenna */}
          <group position={[0, 0.25, 0]} rotation={[antennaTilt, 0, antennaSide]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.012, 0.016, 0.16, 8]} />
              <Toon color="#FFFFFF" />
            </mesh>
            <mesh position={[0, 0.18, 0]}>
              <sphereGeometry args={[0.05, 18, 14]} />
              <meshToonMaterial color={accent} gradientMap={toonRamp()} emissive={accent} emissiveIntensity={0.5 * glowPulse} />
            </mesh>
            <mesh position={[0, 0.18, 0]}>
              <sphereGeometry args={[0.085, 14, 10]} />
              <meshBasicMaterial color={accent} transparent opacity={0.18 * glowPulse} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
          {/* Hover jet */}
          <mesh position={[0, -0.29, 0]}>
            <cylinderGeometry args={[0.1, 0.13, 0.06, 20]} />
            <Toon color="#FFFFFF" />
          </mesh>
          <mesh position={[0, -0.36, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.11, 0.18 + 0.03 * glowPulse, 20, 1, true]} />
            <meshBasicMaterial color={look.glow} transparent opacity={0.35 * glowPulse} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
        {/* Hands float beside the body (not rotated with it, so they stay readable) */}
        <Hand pos={pose.lHand} color={look.bodyShade} frame={t} phase={0} idle={idle} />
        <Hand pos={pose.rHand} color={look.bodyShade} frame={t} phase={1.7} idle={idle} />
      </group>
      <pointLight position={[0, y - 0.1, 0.35]} color={look.glow} intensity={off ? 0.03 : 0.35} distance={1.2} decay={2} />
    </group>
  );
}
