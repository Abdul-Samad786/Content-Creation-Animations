import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { toonRamp } from "../toon";
import { useFaceTexture } from "./useFaceTexture";
import { lookAngles } from "./look";

// Chibi girl: big round head with a painted anime face, space buns, oversized
// hoodie, short arms with mitten hands, legs dangling off the bed.
// All motion comes from `state` (state.js) — this component only places parts.

export const GIRL = {
  headR: 0.33,
  /** Face centre relative to the mark when sitting upright. */
  face: (seat) => [0, seat + 0.72, 0.0],
  /** Top of the head (effects spawn here). */
  top: (seat) => [0, seat + 1.12, 0.0],
};

const FACE_W = 1.8; // radians of the head sphere the face canvas covers (horizontal)
const FACE_H = 1.55;

const Toon = ({ color, ...rest }) => <meshToonMaterial color={color} gradientMap={toonRamp()} {...rest} />;

function Limb({ r, len, color, y }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <capsuleGeometry args={[r, len, 6, 14]} />
      <Toon color={color} />
    </mesh>
  );
}

function Phone({ glow }) {
  const geo = useMemo(() => new RoundedBoxGeometry(0.11, 0.2, 0.018, 3, 0.012), []);
  return (
    <group>
      <mesh geometry={geo} castShadow>
        <Toon color="#9AD0FF" />
      </mesh>
      {/* Screen faces the girl (toward -z of the hand) */}
      <mesh position={[0, 0, -0.0105]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.092, 0.17]} />
        <meshBasicMaterial color="#EAF4FF" toneMapped={false} />
      </mesh>
      {/* Little sticker on the back */}
      <mesh position={[0, 0.03, 0.0101]}>
        <circleGeometry args={[0.022, 16]} />
        <meshBasicMaterial color="#FF8FB8" />
      </mesh>
      {glow > 0 && <pointLight position={[0, 0, -0.08]} color="#BFE0FF" intensity={0.35 * glow} distance={0.9} decay={2} />}
    </group>
  );
}

function Arm({ side, pose, look, typing, frame, phone }) {
  // side: -1 left, +1 right
  const fwd = side < 0 ? pose.lFwd : pose.rFwd;
  const out = side < 0 ? pose.lOut : pose.rOut;
  let elbow = side < 0 ? pose.lElbow : pose.rElbow;
  if (typing > 0) elbow += typing * 0.07 * Math.sin(frame * 1.7 + (side < 0 ? 0 : Math.PI));
  return (
    <group position={[side * 0.2, 0.36, 0.0]} rotation={[-fwd, 0, side * out]}>
      <Limb r={0.062} len={0.1} color={look.hoodie} y={-0.08} />
      <group position={[0, -0.17, 0]} rotation={[-elbow, 0, 0]}>
        <Limb r={0.064} len={0.06} color={look.hoodie} y={-0.04} />
        {/* Cuff */}
        <mesh position={[0, -0.1, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.058, 0.018, 8, 16]} />
          <Toon color={look.hoodieTrim} />
        </mesh>
        <mesh position={[0, -0.155, 0]} castShadow>
          <sphereGeometry args={[0.068, 16, 12]} />
          <Toon color={look.skin} />
        </mesh>
        {phone && (
          <group position={[0, -0.2, 0.03]} rotation={[Math.PI / 2 - 0.35, 0, 0]}>
            <Phone glow={1} />
          </group>
        )}
      </group>
    </group>
  );
}

function Leg({ side, pose, look, frame, idle }) {
  const swing = Math.sin(frame * 0.11 + (side < 0 ? 0 : Math.PI)) * 0.16 * idle;
  return (
    <group position={[side * 0.1, 0.02, 0.03]} rotation={[-pose.thigh, 0, 0]}>
      <Limb r={0.078} len={0.08} color={look.pants} y={-0.07} />
      <group position={[0, -0.16, 0]} rotation={[-pose.knee + swing, 0, 0]}>
        <Limb r={0.066} len={0.08} color={look.pants} y={-0.06} />
        {/* Sock + shoe */}
        <mesh position={[0, -0.13, 0]}>
          <cylinderGeometry args={[0.062, 0.06, 0.04, 14]} />
          <Toon color="#FFFFFF" />
        </mesh>
        <mesh position={[0, -0.18, 0.035]} scale={[1, 0.7, 1.35]} castShadow>
          <sphereGeometry args={[0.075, 16, 12]} />
          <Toon color={look.shoes} />
        </mesh>
      </group>
    </group>
  );
}

function Hair({ look }) {
  const bangs = [];
  for (let k = -3; k <= 3; k++) {
    const az = k * 0.27;
    const th = 0.95 + Math.abs(k) * 0.07;
    const r = 0.322;
    bangs.push(
      <mesh key={k} position={[r * Math.sin(th) * Math.sin(az), r * Math.cos(th), r * Math.sin(th) * Math.cos(az)]} scale={[1, 0.95, 0.6]} rotation={[0.3, az, 0]}>
        <sphereGeometry args={[0.095, 16, 12]} />
        <Toon color={look.hair} />
      </mesh>,
    );
  }
  return (
    <group>
      {/* Cap over the top and back */}
      <mesh rotation={[-0.32, 0, 0]} castShadow>
        <sphereGeometry args={[0.348, 40, 28, 0, Math.PI * 2, 0, 1.22]} />
        <Toon color={look.hair} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.352, 40, 28, Math.PI, Math.PI, 0, 2.15]} />
        <Toon color={look.hair} side={THREE.DoubleSide} />
      </mesh>
      {bangs}
      {/* Side locks framing the face */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, -0.08, 0.1]} rotation={[0.1, 0, s * 0.12]} castShadow>
          <capsuleGeometry args={[0.065, 0.2, 6, 12]} />
          <Toon color={look.hair} />
        </mesh>
      ))}
      {/* Space buns with scrunchies */}
      {[-1, 1].map((s) => (
        <group key={`b${s}`} position={[s * 0.24, 0.24, -0.06]}>
          <mesh castShadow>
            <sphereGeometry args={[0.125, 20, 16]} />
            <Toon color={look.hair} />
          </mesh>
          <mesh position={[s * -0.06, -0.06, 0.0]} rotation={[0.2, 0, s * 0.9]}>
            <torusGeometry args={[0.07, 0.03, 10, 20]} />
            <Toon color={look.hoodieTrim} />
          </mesh>
        </group>
      ))}
      {/* A single cheeky strand on top */}
      <mesh position={[0.03, 0.36, 0.06]} rotation={[0.4, 0, -0.5]}>
        <torusGeometry args={[0.05, 0.014, 8, 16, Math.PI * 1.2]} />
        <Toon color={look.hair} />
      </mesh>
    </group>
  );
}

export default function Girl({ state, mark, look, ctx }) {
  const seat = mark.seat ?? 0.55;
  const { pose, g, face } = state;
  const idle = 1 - g.freeze;
  const t = state.frame;

  const selfFace = [mark.position[0], mark.position[1] + seat + 0.72, mark.position[2]];
  const la = lookAngles(state.look, { face: selfFace }, ctx);
  const faceForTexture = { ...face, lookX: la.eyeX, lookY: la.eyeY };
  const texture = useFaceTexture(faceForTexture, "anime", { eyes: look.eyes, brow: look.hair, blush: look.blush });

  const faceGeo = useMemo(
    () => new THREE.SphereGeometry(GIRL.headR * 1.006, 48, 36, Math.PI / 2 - FACE_W / 2, FACE_W, Math.PI / 2 - FACE_H / 2 + 0.05, FACE_H),
    [],
  );

  const breathe = Math.sin(t * 0.09) * 0.012 * idle;
  const sway = Math.sin(t * 0.045) * 0.025 * idle;
  const squash = g.squash + breathe;
  const sx = 1 - squash * 0.5;

  // Lying back pivots the whole upper body around the hips
  const torsoRx = pose.lean - pose.lie * 1.25 + g.rx;
  const headPitch = pose.headPitch + la.headPitch + g.headPitch + pose.lie * 0.6;
  const headYaw = la.headYaw + g.headYaw;
  const headRoll = sway * 0.6 + g.headRoll;

  return (
    <group position={mark.position} visible={state.visible}>
      <group position={[g.x + g.toward * 0.2, g.y, g.z]} rotation={[0, g.ry, g.rz]} scale={g.scale}>
        <group position={[0, seat, 0]} scale={[sx, 1 + squash, sx]}>
          <Leg side={-1} pose={pose} look={look} frame={t} idle={idle * (1 - pose.lie)} />
          <Leg side={1} pose={pose} look={look} frame={t} idle={idle * (1 - pose.lie)} />
          <group rotation={[torsoRx, pose.yaw, sway * 0.4]}>
            {/* Hoodie body */}
            <mesh position={[0, 0.2, 0]} scale={[1.08, 1, 0.9]} castShadow>
              <capsuleGeometry args={[0.2, 0.14, 8, 20]} />
              <Toon color={look.hoodie} />
            </mesh>
            {/* Kangaroo pocket */}
            <mesh position={[0, 0.11, 0.165]} scale={[1.6, 0.8, 0.35]}>
              <sphereGeometry args={[0.07, 16, 12]} />
              <Toon color={look.hoodieTrim} />
            </mesh>
            {/* Hood bunched behind the neck */}
            <mesh position={[0, 0.38, -0.12]} scale={[1.5, 0.75, 0.9]} castShadow>
              <sphereGeometry args={[0.1, 16, 12]} />
              <Toon color={look.hoodieTrim} />
            </mesh>
            {/* Drawstrings */}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.05, 0.31, 0.17]}>
                <mesh position={[0, -0.05, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
                  <Toon color="#FFFFFF" />
                </mesh>
                <mesh position={[0, -0.105, 0]}>
                  <sphereGeometry args={[0.016, 8, 8]} />
                  <Toon color="#FFFFFF" />
                </mesh>
              </group>
            ))}
            <Arm side={-1} pose={pose} look={look} typing={g.typing} frame={t} />
            <Arm side={1} pose={pose} look={look} typing={g.typing} frame={t} phone />

            {/* Head */}
            <group position={[0, 0.72, 0]} rotation={[headPitch, headYaw, headRoll]}>
              <mesh scale={[1.03, 0.97, 0.98]} castShadow>
                <sphereGeometry args={[GIRL.headR, 48, 36]} />
                <Toon color={look.skin} />
              </mesh>
              <mesh geometry={faceGeo} scale={[1.03, 0.97, 0.98]}>
                <meshToonMaterial map={texture} transparent gradientMap={toonRamp()} depthWrite={false} />
              </mesh>
              {/* Ears */}
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.33, -0.03, 0.0]} scale={[0.6, 1, 0.8]}>
                  <sphereGeometry args={[0.06, 12, 10]} />
                  <Toon color={look.skin} />
                </mesh>
              ))}
              <Hair look={look} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
