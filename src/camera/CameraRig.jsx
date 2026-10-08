import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_PRESETS } from "./presets";

export default function CameraRig({ preset = "TWO_SHOT", transitionFrames = 18 }) {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3());
  const currentTarget = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const clock = useRef(0);

  useEffect(() => {
    const p = CAMERA_PRESETS[preset] || CAMERA_PRESETS.TWO_SHOT;
    targetPos.current.set(...p.position);
    targetLook.current.set(...p.target);
    camera.fov = p.fov;
    camera.updateProjectionMatrix();
    // On first load, snap immediately
    if (clock.current === 0) {
      currentPos.current.copy(targetPos.current);
      currentTarget.current.copy(targetLook.current);
    }
  }, [preset, camera]);

  useFrame((state) => {
    clock.current++;
    const t = state.clock.getElapsedTime();

    // Smooth lerp toward target
    currentPos.current.lerp(targetPos.current, 0.08);
    currentTarget.current.lerp(targetLook.current, 0.08);

    // Constant tiny drift — makes it feel alive
    const drift = 0.012;
    camera.position.set(
      currentPos.current.x + Math.sin(t * 0.3) * drift,
      currentPos.current.y + Math.sin(t * 0.2) * drift * 0.5,
      currentPos.current.z,
    );
    camera.lookAt(
      currentTarget.current.x + Math.sin(t * 0.25) * drift * 0.3,
      currentTarget.current.y,
      currentTarget.current.z,
    );
  });

  return null;
}
