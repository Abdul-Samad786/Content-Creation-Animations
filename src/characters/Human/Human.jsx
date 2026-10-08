import React from "react";

/**
 * Stylized human built from box primitives.
 * Each body part is its own group/mesh for independent animation later.
 */
export const Human = ({ position = [0, 0, 0], ...props }) => {
  const skin = "#e8b896";
  const skinDark = "#d4a07a";
  const shirt = "#4a7c9b";
  const pants = "#3d4a5c";
  const shoes = "#2a2a2a";
  const hair = "#3b2f2f";
  const eyeWhite = "#f5f5f5";
  const pupil = "#1a1a1a";
  const brow = "#2c2222";

  return (
    <group position={position} {...props}>
      {/* Hips — root of lower body */}
      <group name="hips" position={[0, 1.0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.28, 0.32]} />
          <meshStandardMaterial color={pants} />
        </mesh>

        {/* Torso */}
        <group name="torso" position={[0, 0.45, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.7, 0.35]} />
            <meshStandardMaterial color={shirt} />
          </mesh>

          {/* Neck */}
          <group name="neck" position={[0, 0.42, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.16, 0.16, 0.16]} />
              <meshStandardMaterial color={skin} />
            </mesh>

            {/* Head */}
            <group name="head" position={[0, 0.28, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.42, 0.45, 0.4]} />
                <meshStandardMaterial color={skin} />
              </mesh>

              {/* Hair top */}
              <mesh position={[0, 0.24, -0.02]} castShadow>
                <boxGeometry args={[0.44, 0.12, 0.42]} />
                <meshStandardMaterial color={hair} />
              </mesh>

              {/* Left eye */}
              <group name="leftEye" position={[-0.1, 0.05, 0.21]}>
                <mesh>
                  <boxGeometry args={[0.1, 0.06, 0.02]} />
                  <meshStandardMaterial color={eyeWhite} />
                </mesh>
                <mesh position={[0, 0, 0.01]}>
                  <boxGeometry args={[0.045, 0.045, 0.015]} />
                  <meshStandardMaterial color={pupil} />
                </mesh>
              </group>

              {/* Right eye */}
              <group name="rightEye" position={[0.1, 0.05, 0.21]}>
                <mesh>
                  <boxGeometry args={[0.1, 0.06, 0.02]} />
                  <meshStandardMaterial color={eyeWhite} />
                </mesh>
                <mesh position={[0, 0, 0.01]}>
                  <boxGeometry args={[0.045, 0.045, 0.015]} />
                  <meshStandardMaterial color={pupil} />
                </mesh>
              </group>

              {/* Left eyebrow */}
              <mesh name="leftEyebrow" position={[-0.1, 0.14, 0.21]}>
                <boxGeometry args={[0.12, 0.03, 0.02]} />
                <meshStandardMaterial color={brow} />
              </mesh>

              {/* Right eyebrow */}
              <mesh name="rightEyebrow" position={[0.1, 0.14, 0.21]}>
                <boxGeometry args={[0.12, 0.03, 0.02]} />
                <meshStandardMaterial color={brow} />
              </mesh>
            </group>
          </group>

          {/* Left arm */}
          <group name="leftUpperArm" position={[-0.42, 0.22, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.4, 0.18]} />
              <meshStandardMaterial color={shirt} />
            </mesh>
            <group name="leftForearm" position={[0, -0.38, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.15, 0.36, 0.15]} />
                <meshStandardMaterial color={skin} />
              </mesh>
              <group name="leftHand" position={[0, -0.26, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.14, 0.14, 0.1]} />
                  <meshStandardMaterial color={skinDark} />
                </mesh>
              </group>
            </group>
          </group>

          {/* Right arm */}
          <group name="rightUpperArm" position={[0.42, 0.22, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.4, 0.18]} />
              <meshStandardMaterial color={shirt} />
            </mesh>
            <group name="rightForearm" position={[0, -0.38, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.15, 0.36, 0.15]} />
                <meshStandardMaterial color={skin} />
              </mesh>
              <group name="rightHand" position={[0, -0.26, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.14, 0.14, 0.1]} />
                  <meshStandardMaterial color={skinDark} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* Left leg */}
        <group name="leftUpperLeg" position={[-0.16, -0.28, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.4, 0.24]} />
            <meshStandardMaterial color={pants} />
          </mesh>
          <group name="leftLowerLeg" position={[0, -0.4, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.4, 0.2]} />
              <meshStandardMaterial color={pants} />
            </mesh>
            <group name="leftFoot" position={[0, -0.26, 0.06]}>
              <mesh castShadow>
                <boxGeometry args={[0.18, 0.1, 0.32]} />
                <meshStandardMaterial color={shoes} />
              </mesh>
            </group>
          </group>
        </group>

        {/* Right leg */}
        <group name="rightUpperLeg" position={[0.16, -0.28, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.4, 0.24]} />
            <meshStandardMaterial color={pants} />
          </mesh>
          <group name="rightLowerLeg" position={[0, -0.4, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.4, 0.2]} />
              <meshStandardMaterial color={pants} />
            </mesh>
            <group name="rightFoot" position={[0, -0.26, 0.06]}>
              <mesh castShadow>
                <boxGeometry args={[0.18, 0.1, 0.32]} />
                <meshStandardMaterial color={shoes} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
