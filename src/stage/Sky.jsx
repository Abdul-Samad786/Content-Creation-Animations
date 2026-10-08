import React, { useMemo } from "react";
import * as THREE from "three";

const STAR_COUNT = 300;

export default function Sky() {
  const starGeo = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random());
      const r = 55 + Math.random() * 20;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[80, 32, 32]} />
        <meshBasicMaterial color="#0a1628" side={THREE.BackSide} fog={false} />
      </mesh>

      <mesh position={[5, 11, -16]}>
        <sphereGeometry args={[2.4, 24, 24]} />
        <meshStandardMaterial
          color="#fffde0"
          emissive="#fffde0"
          emissiveIntensity={1.4}
          fog={false}
        />
      </mesh>
      <pointLight
        position={[5, 11, -16]}
        color="#e8f0ff"
        intensity={2.5}
        distance={90}
      />

      <points geometry={starGeo}>
        <pointsMaterial
          color="#FFFFFF"
          size={1.5}
          sizeAttenuation={false}
          fog={false}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
