import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { toonRamp } from "../toon";
import { hash } from "../math";

// A cosy café at golden hour: cream walls, a big street window, pendant lamps,
// a pastry counter and a booth seat. Mia sits on the booth at the same height
// as the bedroom bed (seat 0.55), Byte hovers beside the little round table.
// The other side of the table is the camera — whoever sits there is never seen.

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

function useCanvasTexture(draw, w = 256, h = 256) {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [draw, w, h]);
}

const drawStreet = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#FFB38A");
  g.addColorStop(0.55, "#FFD3A8");
  g.addColorStop(1, "#F7A8B8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Low sun
  ctx.fillStyle = "rgba(255,244,214,0.9)";
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.55, 26, 0, Math.PI * 2);
  ctx.fill();
  // Buildings across the street
  for (let i = 0; i < 9; i++) {
    const bw = 22 + hash(i * 3.3) * 26;
    const bh = 70 + hash(i * 5.1) * 90;
    const x = i * 30 - 6;
    ctx.fillStyle = i % 2 ? "#C9849E" : "#B57491";
    ctx.fillRect(x, h - bh, bw, bh);
    ctx.fillStyle = "#FFE7A8";
    for (let k = 0; k < 6; k++) if (hash(i * 7 + k) > 0.45) ctx.fillRect(x + 5 + (k % 2) * 9, h - bh + 10 + Math.floor(k / 2) * 18, 5, 7);
  }
  // String lights across the street
  for (let i = 0; i < 16; i++) {
    const x = (i / 15) * w;
    const y = 40 + Math.sin((i / 15) * Math.PI) * 22;
    ctx.fillStyle = ["#FFF2B0", "#FFC2D9", "#C8F5EA"][i % 3];
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawMenu = (ctx, w, h) => {
  ctx.fillStyle = "#3A3A40";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText("MENU", w / 2, 58);
  ctx.font = "26px sans-serif";
  ["latte  4", "matcha  5", "cocoa  4", "muffin  3"].forEach((t, i) => ctx.fillText(t, w / 2, 112 + i * 40));
  ctx.strokeStyle = "#FFB3CF";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, w - 20, h - 20);
};

function StreetWindow({ frame }) {
  const street = useCanvasTexture(drawStreet);
  return (
    <group position={[0.05, 1.85, -1.55]}>
      <RBox args={[1.9, 1.3, 0.08]} radius={0.04} color="#7A4B32" position={[0, 0, -0.02]} />
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[1.76, 1.16]} />
        <meshBasicMaterial map={street} toneMapped={false} />
      </mesh>
      {/* Window lettering bar and mullion */}
      <RBox args={[0.04, 1.18, 0.05]} radius={0.015} color="#7A4B32" position={[0, 0, 0.04]} />
      <RBox args={[2.06, 0.08, 0.22]} radius={0.03} color="#8E5A3C" position={[0, -0.68, 0.08]} castShadow />
      {/* Awning scallops inside the top of the window */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.8 + i * 0.2, 0.58, 0.06]}>
          <circleGeometry args={[0.1, 16, 0, Math.PI]} />
          <Toon color={i % 2 ? "#FFFFFF" : "#FF9EC4"} />
        </mesh>
      ))}
      <pointLight position={[0, 0, 0.7]} color="#FFC79A" intensity={1.0 + Math.sin(frame * 0.02) * 0.03} distance={3.2} decay={2} />
    </group>
  );
}

function PendantLamps({ frame }) {
  return (
    <group>
      {[-0.95, 0.05, 1.05].map((x, i) => {
        const sway = Math.sin(frame * 0.03 + i) * 0.015;
        return (
          <group key={x} position={[x, 2.95, -0.9]} rotation={[0, 0, sway]}>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.4, 6]} />
              <meshBasicMaterial color="#3B2A24" />
            </mesh>
            <mesh position={[0, -0.45, 0]}>
              <coneGeometry args={[0.16, 0.16, 24, 1, true]} />
              <meshToonMaterial color="#2F6B5E" gradientMap={toonRamp()} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <sphereGeometry args={[0.055, 14, 10]} />
              <meshBasicMaterial color="#FFE6A8" toneMapped={false} />
            </mesh>
            <pointLight position={[0, -0.6, 0]} color="#FFC77A" intensity={0.7} distance={2.6} decay={1.8} />
          </group>
        );
      })}
    </group>
  );
}

function Counter() {
  const muffins = ["#C98A5A", "#E8A2B8", "#B07A4F", "#F2C46D", "#C98A5A", "#E8A2B8"];
  return (
    <group position={[1.35, 0, -1.15]}>
      <RBox args={[1.1, 0.95, 0.5]} radius={0.05} color="#B97C55" position={[0, 0.48, 0]} castShadow />
      <RBox args={[1.16, 0.06, 0.56]} radius={0.02} color="#F6EDE3" position={[0, 0.98, 0]} />
      {/* Pastry case */}
      <mesh position={[-0.15, 1.17, 0.02]}>
        <boxGeometry args={[0.62, 0.32, 0.36]} />
        <meshBasicMaterial color="#DDF4FF" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {muffins.map((c, i) => (
        <group key={i} position={[-0.38 + (i % 3) * 0.23, 1.06 + Math.floor(i / 3) * 0.13, -0.05 + Math.floor(i / 3) * 0.08]}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.035, 0.05, 12]} />
            <Toon color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.052, 12, 10]} />
            <Toon color={c} />
          </mesh>
        </group>
      ))}
      {/* Espresso machine */}
      <RBox args={[0.3, 0.32, 0.26]} radius={0.04} color="#E6E6EE" position={[0.38, 1.17, 0]} castShadow />
      <RBox args={[0.22, 0.08, 0.04]} radius={0.02} color="#FF8FB8" position={[0.38, 1.24, 0.14]} />
    </group>
  );
}

function MenuBoard() {
  const menu = useCanvasTexture(drawMenu, 256, 300);
  return (
    <group position={[-1.2, 2.05, -1.56]}>
      <RBox args={[0.62, 0.72, 0.04]} radius={0.02} color="#8E5A3C" position={[0, 0, -0.01]} />
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[0.54, 0.64]} />
        <meshBasicMaterial map={menu} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Booth() {
  return (
    <group position={[-0.5, 0, -0.32]}>
      {/* Seat and back cushions, tufted pink */}
      <RBox args={[1.5, 0.42, 0.62]} radius={0.06} color="#8E5A3C" position={[0, 0.21, 0]} castShadow />
      <RBox args={[1.46, 0.12, 0.6]} radius={0.06} color="#FF9EC4" position={[0, 0.48, 0.02]} />
      <RBox args={[1.5, 0.75, 0.16]} radius={0.06} color="#8E5A3C" position={[0, 0.85, -0.28]} castShadow />
      {[-0.5, 0, 0.5].map((x) => (
        <RBox key={x} args={[0.46, 0.55, 0.1]} radius={0.08} color="#FFB3D1" position={[x, 0.86, -0.17]} />
      ))}
    </group>
  );
}

function Table() {
  return (
    <group position={[0.06, 0, 0.55]}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.04, 40]} />
        <Toon color="#FFF7EE" />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.7, 12]} />
        <Toon color="#3B2A24" />
      </mesh>
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.03, 24]} />
        <Toon color="#3B2A24" />
      </mesh>
      {/* Two cups and a muffin on a plate */}
      {[
        [-0.15, "#FFFFFF", "#FFB3D1"],
        [0.17, "#FFFFFF", "#9FD8C9"],
      ].map(([x, cup, band]) => (
        <group key={x} position={[x, 0.79, 0.05]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.1, 16]} />
            <Toon color={cup} />
          </mesh>
          <mesh position={[0, 0.0, 0]}>
            <cylinderGeometry args={[0.051, 0.051, 0.025, 16]} />
            <Toon color={band} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.0, 0.745, 0.18]}>
        <cylinderGeometry args={[0.09, 0.08, 0.012, 20]} />
        <Toon color="#FFFFFF" />
      </mesh>
      <mesh position={[0.0, 0.79, 0.18]} castShadow>
        <sphereGeometry args={[0.05, 12, 10]} />
        <Toon color="#C98A5A" />
      </mesh>
    </group>
  );
}

function Plants() {
  return (
    <group>
      {[
        [-1.55, -1.25],
        [0.65, -1.4],
      ].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.11, 0.32, 16]} />
            <Toon color="#F2C4A0" />
          </mesh>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} position={[Math.sin(k * 1.3) * 0.1, 0.42 + (k % 3) * 0.1, Math.cos(k * 1.3) * 0.06]} castShadow>
              <sphereGeometry args={[0.1, 12, 10]} />
              <Toon color={k % 2 ? "#6CC28E" : "#82D6A3"} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Warm steam and dust in the sunbeam. */
function Motes({ frame }) {
  return (
    <group>
      {Array.from({ length: 18 }, (_, i) => {
        const x = -1.3 + hash(i * 2.3) * 2.6;
        const baseY = 0.6 + hash(i * 4.1) * 2.0;
        const z = -1.2 + hash(i * 6.7) * 1.2;
        const y = baseY + ((frame * (0.002 + hash(i) * 0.002)) % 0.6) - 0.3;
        const op = 0.2 + 0.3 * Math.abs(Math.sin(frame * 0.04 + i));
        return (
          <mesh key={i} position={[x + Math.sin(frame * 0.02 + i) * 0.05, y, z]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshBasicMaterial color="#FFF1C9" transparent opacity={op} toneMapped={false} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Cafe({ frame }) {
  return (
    <group>
      <color attach="background" args={["#4A2E2A"]} />
      <hemisphereLight args={["#FFF0DE", "#B98A6E", 0.6]} />
      <ambientLight intensity={0.14} color="#FFF4E6" />
      <directionalLight
        position={[2.5, 4.5, 4]}
        intensity={0.95}
        color="#FFE6CC"
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
      {/* Back wall, wood wainscot, floor */}
      <mesh position={[0, 1.6, -1.6]} receiveShadow>
        <planeGeometry args={[9, 4.4]} />
        <Toon color="#F7E3C8" />
      </mesh>
      <mesh position={[0, 0.5, -1.59]} receiveShadow>
        <planeGeometry args={[9, 1.0]} />
        <Toon color="#C98F64" />
      </mesh>
      <mesh position={[0, 1.01, -1.585]}>
        <planeGeometry args={[9, 0.035]} />
        <Toon color="#FFFFFF" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3]} receiveShadow>
        <planeGeometry args={[12, 10]} />
        <Toon color="#D9A77C" />
      </mesh>
      <StreetWindow frame={frame} />
      <PendantLamps frame={frame} />
      <MenuBoard />
      <Counter />
      <Plants />
      <Booth />
      <Table />
      <Motes frame={frame} />
    </group>
  );
}
