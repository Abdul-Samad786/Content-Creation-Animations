import React from "react";

/**
 * Low-poly voxel AI agent — digital/robotic, floating (no legs).
 * Each part is its own group/mesh for independent animation later.
 */
export const AIAgent = ({ position = [0, 0, 0], ...props }) => {
  const chassis = "#2a3a4a";
  const chassisLight = "#3d5266";
  const accent = "#00e5c0";
  const accentDim = "#00a88c";
  const panel = "#1a2430";
  const glow = "#39ff14";
  const metal = "#6b7c8d";

  return (
    <group position={position} {...props}>
      {/* Body — main chassis */}
      <group name="body" position={[0, 1.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.9, 0.45]} />
          <meshStandardMaterial color={chassis} metalness={0.6} roughness={0.35} />
        </mesh>

        {/* Chest detail strip */}
        <mesh position={[0, 0.1, 0.23]}>
          <boxGeometry args={[0.4, 0.08, 0.02]} />
          <meshStandardMaterial
            color={accent}
            emissive={accentDim}
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* Face panel */}
        <group name="facepanel" position={[0, 0.25, 0.24]}>
          <mesh>
            <boxGeometry args={[0.5, 0.35, 0.04]} />
            <meshStandardMaterial color={panel} metalness={0.4} roughness={0.5} />
          </mesh>

          {/* Left eye — glowing flat square */}
          <mesh name="leftEye" position={[-0.12, 0.04, 0.03]}>
            <boxGeometry args={[0.12, 0.12, 0.02]} />
            <meshStandardMaterial
              color={glow}
              emissive={glow}
              emissiveIntensity={1.5}
            />
          </mesh>

          {/* Right eye — glowing flat square */}
          <mesh name="rightEye" position={[0.12, 0.04, 0.03]}>
            <boxGeometry args={[0.12, 0.12, 0.02]} />
            <meshStandardMaterial
              color={glow}
              emissive={glow}
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>

        {/* Antenna — tall thin box + cube tip */}
        <group name="antenna" position={[0, 0.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 0.35, 0.06]} />
            <meshStandardMaterial color={metal} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial
              color={accent}
              emissive={accentDim}
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>

        {/* Left side module */}
        <group name="leftModule" position={[-0.42, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.4, 0.3]} />
            <meshStandardMaterial color={chassisLight} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-0.1, 0.05, 0]}>
            <boxGeometry args={[0.06, 0.15, 0.15]} />
            <meshStandardMaterial
              color={accent}
              emissive={accentDim}
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>

        {/* Right side module */}
        <group name="rightModule" position={[0.42, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.4, 0.3]} />
            <meshStandardMaterial color={chassisLight} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0.1, 0.05, 0]}>
            <boxGeometry args={[0.06, 0.15, 0.15]} />
            <meshStandardMaterial
              color={accent}
              emissive={accentDim}
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>

        {/* Bottom thruster */}
        <group name="bottomThruster" position={[0, -0.52, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.35, 0.18, 0.3]} />
            <meshStandardMaterial color={metal} metalness={0.7} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[0.22, 0.08, 0.2]} />
            <meshStandardMaterial
              color="#ff6b35"
              emissive="#ff4500"
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};
