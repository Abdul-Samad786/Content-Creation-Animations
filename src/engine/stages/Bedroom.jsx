import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { toonRamp } from "../toon";
import { hash } from "../math";

// A cozy bedroom at night: lilac walls, a starry window, fairy lights, a
// fluffy bed, a little lamp and a wall clock. Everything sits inside the
// narrow vertical frame (x within about ±1.5, y 0–2.8).

const Toon = ({ color, emissive, emissiveIntensity = 0 }) => (
  <meshToonMaterial color={color} gradientMap={toonRamp()} emissive={emissive || "#000000"} emissiveIntensity={emissiveIntensity} />
);

function RBox({ args, radius = 0.05, color, position, rotation, castShadow, receiveShadow = true, emissive, emissiveIntensity }) {
  const [w, h, d] = args;
  const geo = useMemo(() => new RoundedBoxGeometry(w, h, d, 4, radius), [w, h, d, radius]);
  return (
    <mesh geometry={geo} position={position} rotation={rotation} castShadow={castShadow} receiveShadow={receiveShadow}>
      <Toon color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

function useSkyTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#2A2D6E");
    g.addColorStop(0.6, "#5B4A9E");
    g.addColorStop(1, "#C77DB5");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    // Stars
    for (let i = 0; i < 40; i++) {
      const x = hash(i * 3.1) * 256;
      const y = hash(i * 7.7) * 170;
      const r = 0.6 + hash(i * 1.9) * 1.6;
      ctx.fillStyle = `rgba(255,255,240,${0.5 + hash(i * 5.3) * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Distant city hills
    ctx.fillStyle = "#3B2F6B";
    ctx.beginPath();
    ctx.moveTo(0, 256);
    for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, 214 + Math.sin(x * 0.05) * 10 + hash(x) * 8);
    ctx.lineTo(256, 256);
    ctx.fill();
    // Tiny lit windows
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = "#FFD98A";
      ctx.fillRect(hash(i * 9.1) * 250, 228 + hash(i * 4.4) * 20, 3, 4);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function Window({ frame }) {
  const sky = useSkyTexture();
  const moonGlow = 0.85 + Math.sin(frame * 0.05) * 0.05;
  return (
    <group position={[0.05, 1.9, -1.55]}>
      {/* Frame */}
      <RBox args={[1.32, 1.12, 0.08]} radius={0.04} color="#FFF4F8" position={[0, 0, -0.02]} />
      {/* Sky */}
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[1.18, 0.98]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      {/* Moon (crescent: a bright disc with a sky-coloured bite) */}
      <mesh position={[0.3, 0.24, 0.03]}>
        <circleGeometry args={[0.11, 32]} />
        <meshBasicMaterial color="#FFF3C4" toneMapped={false} transparent opacity={moonGlow} />
      </mesh>
      <mesh position={[0.355, 0.28, 0.031]}>
        <circleGeometry args={[0.095, 32]} />
        <meshBasicMaterial color="#33357A" toneMapped={false} />
      </mesh>
      {/* Mullions */}
      <RBox args={[0.035, 1.0, 0.05]} radius={0.015} color="#FFF4F8" position={[0, 0, 0.04]} />
      <RBox args={[1.2, 0.035, 0.05]} radius={0.015} color="#FFF4F8" position={[0, 0, 0.04]} />
      {/* Sill */}
      <RBox args={[1.48, 0.07, 0.2]} radius={0.03} color="#FFFFFF" position={[0, -0.6, 0.07]} castShadow />
      {/* Curtains, gently swaying */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.74, 0.02, 0.1]} rotation={[0, 0, Math.sin(frame * 0.03 + s) * 0.012]}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[s * k * -0.07, -0.06, k * 0.01]} castShadow>
              <capsuleGeometry args={[0.05, 1.1, 6, 12]} />
              <Toon color={k % 2 ? "#FFB8D2" : "#FFC9DD"} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Curtain rod */}
      <mesh position={[0, 0.62, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 1.8, 10]} />
        <Toon color="#E8C07A" />
      </mesh>
      {/* Moonlight spill */}
      <pointLight position={[0, 0, 0.6]} color="#9FA8FF" intensity={1.1} distance={3} decay={2} />
    </group>
  );
}

function FairyLights({ frame }) {
  const bulbs = [];
  const n = 17;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = -1.9 + u * 3.8;
    const y = 2.68 - Math.sin(u * Math.PI) * 0.2 - Math.sin(u * Math.PI * 3) * 0.05;
    const tw = 0.7 + 0.3 * Math.sin(frame * 0.09 + i * 1.7);
    const colors = ["#FFE08A", "#FFB3D1", "#B8F2E6", "#FFE08A", "#D7C2FF"];
    bulbs.push(
      <mesh key={i} position={[x, y, -1.5]}>
        <sphereGeometry args={[0.035, 12, 10]} />
        <meshBasicMaterial color={colors[i % colors.length]} toneMapped={false} transparent opacity={0.6 + 0.4 * tw} />
      </mesh>,
    );
    // Soft halo
    bulbs.push(
      <mesh key={`h${i}`} position={[x, y, -1.51]}>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color={colors[i % colors.length]} transparent opacity={0.18 * tw} toneMapped={false} depthWrite={false} />
      </mesh>,
    );
  }
  return <group>{bulbs}</group>;
}

function WallClock({ frame, fps }) {
  // Ticks once a second; the second hand jumps (and wobbles) like a real clock
  const s = Math.floor(frame / fps);
  const within = (frame % fps) / fps;
  const wob = within < 0.15 ? Math.sin(within * 40) * 0.05 * (1 - within / 0.15) : 0;
  const secAngle = -(s / 60) * Math.PI * 2 - wob;
  return (
    <group position={[-1.12, 2.08, -1.54]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 32]} />
        <Toon color="#FF9EC4" />
      </mesh>
      <mesh position={[0, 0, 0.027]}>
        <circleGeometry args={[0.165, 32]} />
        <Toon color="#FFFDF7" />
      </mesh>
      <mesh position={[0, 0, 0.03]} rotation={[0, 0, -0.9]}>
        <planeGeometry args={[0.018, 0.2]} />
        <meshBasicMaterial color="#5B3A55" />
      </mesh>
      <group position={[0, 0, 0.034]} rotation={[0, 0, secAngle]}>
        <mesh position={[0, 0.06, 0]}>
          <planeGeometry args={[0.008, 0.14]} />
          <meshBasicMaterial color="#FF5C8A" />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.036]}>
        <circleGeometry args={[0.014, 12]} />
        <meshBasicMaterial color="#5B3A55" />
      </mesh>
    </group>
  );
}

function Bed() {
  return (
    <group position={[-0.55, 0, -0.55]}>
      {/* Base and legs */}
      <RBox args={[2.5, 0.26, 1.42]} radius={0.06} color="#F3D3B0" position={[0, 0.2, 0]} castShadow />
      {/* Mattress */}
      <RBox args={[2.42, 0.18, 1.36]} radius={0.08} color="#FFFFFF" position={[0, 0.4, 0]} />
      {/* Blanket (pastel, with a fold) */}
      <RBox args={[1.5, 0.08, 1.4]} radius={0.04} color="#C9B8FF" position={[0.48, 0.51, 0]} />
      <RBox args={[0.22, 0.1, 1.42]} radius={0.05} color="#E3D9FF" position={[-0.2, 0.53, 0]} />
      {/* Headboard (left end), heart cut-out look */}
      <RBox args={[0.12, 0.95, 1.46]} radius={0.06} color="#F3D3B0" position={[-1.26, 0.6, 0]} castShadow />
      {/* Pillows */}
      <RBox args={[0.42, 0.18, 0.62]} radius={0.09} color="#FFF0F6" position={[-0.98, 0.58, -0.32]} castShadow />
      <RBox args={[0.42, 0.18, 0.62]} radius={0.09} color="#FFE1EE" position={[-0.98, 0.58, 0.32]} castShadow />
      {/* Plush bunny on the bed */}
      <group position={[0.95, 0.55, -0.42]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <sphereGeometry args={[0.12, 20, 16]} />
          <Toon color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.27, 0.02]} castShadow>
          <sphereGeometry args={[0.1, 20, 16]} />
          <Toon color="#FFFFFF" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.045, 0.42, 0]} rotation={[0, 0, s * -0.2]} castShadow>
            <capsuleGeometry args={[0.03, 0.12, 4, 8]} />
            <Toon color="#FFE4EE" />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`e${s}`} position={[s * 0.035, 0.29, 0.095]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#3B2A4A" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Nightstand({ frame }) {
  const flicker = 1 + Math.sin(frame * 0.21) * 0.02;
  return (
    <group position={[1.32, 0, -0.7]}>
      <RBox args={[0.5, 0.55, 0.45]} radius={0.06} color="#FFE2C6" position={[0, 0.28, 0]} castShadow />
      <RBox args={[0.38, 0.12, 0.02]} radius={0.02} color="#F7C9A6" position={[0, 0.34, 0.23]} />
      {/* Lamp */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.03, 0.06, 0.16, 12]} />
        <Toon color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.1, 0.17, 0.2, 20, 1, true]} />
        <meshToonMaterial color="#FFE7A8" gradientMap={toonRamp()} emissive="#FFC867" emissiveIntensity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 0.82, 0.1]} color="#FFC27A" intensity={1.3 * flicker} distance={4.5} decay={1.6} />
      {/* Little plant */}
      <mesh position={[-0.15, 0.62, 0.08]}>
        <cylinderGeometry args={[0.05, 0.04, 0.09, 12]} />
        <Toon color="#FF9EC4" />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[-0.15 + (k - 1) * 0.03, 0.71 + (k % 2) * 0.02, 0.08]} rotation={[0, 0, (k - 1) * 0.5]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <Toon color="#7ED6A0" />
        </mesh>
      ))}
    </group>
  );
}

function WallDecor() {
  return (
    <group>
      {/* Heart poster */}
      <RBox args={[0.42, 0.52, 0.02]} radius={0.01} color="#FFFFFF" position={[1.12, 1.95, -1.57]} />
      <mesh position={[1.12, 1.97, -1.555]} rotation={[0, 0, Math.PI]}>
        <circleGeometry args={[0.14, 3]} />
        <Toon color="#FF8FB8" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[1.12 + s * 0.065, 2.03, -1.555]}>
          <circleGeometry args={[0.075, 20]} />
          <Toon color="#FF8FB8" />
        </mesh>
      ))}
      {/* Floating shelf with books and a star */}
      <RBox args={[0.7, 0.04, 0.18]} radius={0.015} color="#F3D3B0" position={[-1.2, 1.55, -1.48]} castShadow />
      {["#8EC5FF", "#FFB3D1", "#C9B8FF", "#FFE08A"].map((c, i) => (
        <RBox key={c} args={[0.06, 0.2 - (i % 2) * 0.03, 0.14]} radius={0.01} color={c} position={[-1.45 + i * 0.075, 1.67 - (i % 2) * 0.015, -1.48]} castShadow />
      ))}
      <mesh position={[-0.98, 1.66, -1.46]}>
        <sphereGeometry args={[0.08, 16, 12]} />
        <Toon color="#FFE08A" />
      </mesh>
    </group>
  );
}

/** Floating dust motes catching the lamp light. */
function Motes({ frame }) {
  const motes = [];
  for (let i = 0; i < 22; i++) {
    const x = -1.4 + hash(i * 2.3) * 2.8;
    const baseY = 0.4 + hash(i * 4.1) * 2.2;
    const z = -1.2 + hash(i * 6.7) * 1.4;
    const y = baseY + ((frame * (0.002 + hash(i) * 0.002)) % 0.6) - 0.3;
    const op = 0.25 + 0.35 * Math.abs(Math.sin(frame * 0.04 + i));
    motes.push(
      <mesh key={i} position={[x + Math.sin(frame * 0.02 + i) * 0.05, y, z]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshBasicMaterial color="#FFF1C9" transparent opacity={op} toneMapped={false} depthWrite={false} />
      </mesh>,
    );
  }
  return <group>{motes}</group>;
}

export default function Bedroom({ frame, fps }) {
  return (
    <group>
      <color attach="background" args={["#2A2350"]} />
      <hemisphereLight args={["#FFE9F3", "#8C7BD1", 0.55]} />
      <ambientLight intensity={0.12} color="#FFF2F7" />
      <directionalLight
        position={[-2.5, 4.5, 4]}
        intensity={0.95}
        color="#FFF1E6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-0.5}
        shadow-bias={-0.0015}
        shadow-radius={6}
      />
      {/* Back wall + floor */}
      <mesh position={[0, 1.6, -1.6]} receiveShadow>
        <planeGeometry args={[9, 4.4]} />
        <Toon color="#D3C3F5" />
      </mesh>
      {/* Wainscot strip */}
      <mesh position={[0, 0.45, -1.59]} receiveShadow>
        <planeGeometry args={[9, 0.9]} />
        <Toon color="#F6D6E6" />
      </mesh>
      <mesh position={[0, 0.91, -1.585]}>
        <planeGeometry args={[9, 0.035]} />
        <Toon color="#FFFFFF" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3]} receiveShadow>
        <planeGeometry args={[12, 10]} />
        <Toon color="#E9C49F" />
      </mesh>
      {/* Round rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.004, 0.75]} receiveShadow>
        <circleGeometry args={[0.95, 48]} />
        <Toon color="#FFD2E4" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.006, 0.75]} receiveShadow>
        <ringGeometry args={[0.72, 0.8, 48]} />
        <Toon color="#FFFFFF" />
      </mesh>
      <Window frame={frame} />
      <FairyLights frame={frame} />
      <WallClock frame={frame} fps={fps} />
      <WallDecor />
      <Bed />
      <Nightstand frame={frame} />
      <Motes frame={frame} />
    </group>
  );
}
