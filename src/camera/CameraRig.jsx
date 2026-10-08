import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import { CAMERA_PRESETS } from "./presets";

const TRANSITION_FRAMES = 24;

export default function CameraRig({
  preset = "TWO_SHOT",
  lineStartFrame = 0,
}) {
  const { camera } = useThree();
  const prevPreset = useRef(preset);
  const prevPos = useRef(null);
  const prevTarget = useRef(null);
  const frame = useCurrentFrame();

  const current = CAMERA_PRESETS[preset] || CAMERA_PRESETS.TWO_SHOT;

  // On preset change, remember where we came from
  useEffect(() => {
    if (preset !== prevPreset.current) {
      const prev = CAMERA_PRESETS[prevPreset.current] || CAMERA_PRESETS.TWO_SHOT;
      prevPos.current = prev.position;
      prevTarget.current = prev.target;
      prevPreset.current = preset;
      camera.fov = current.fov;
      camera.updateProjectionMatrix();
    } else if (prevPos.current === null) {
      camera.fov = current.fov;
      camera.updateProjectionMatrix();
    }
  }, [preset, camera, current.fov]);

  useFrame(() => {
    const framesIntoLine = frame - lineStartFrame;
    const progress = Math.min(Math.max(framesIntoLine, 0) / TRANSITION_FRAMES, 1);
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const from = {
      position: prevPos.current || current.position,
      target: prevTarget.current || current.target,
    };

    const px =
      from.position[0] + (current.position[0] - from.position[0]) * eased;
    const py =
      from.position[1] + (current.position[1] - from.position[1]) * eased;
    const pz =
      from.position[2] + (current.position[2] - from.position[2]) * eased;

    const tx = from.target[0] + (current.target[0] - from.target[0]) * eased;
    const ty = from.target[1] + (current.target[1] - from.target[1]) * eased;
    const tz = from.target[2] + (current.target[2] - from.target[2]) * eased;

    // Slow push forward over the line — deterministic
    const pushAmount = Math.min(framesIntoLine / 300, 1) * 0.25;

    // Drift from frame/fps so every render is identical
    const fps = 30;
    const seconds = frame / fps;
    const drift = 0.008;

    camera.position.set(
      px + Math.sin(seconds * 0.3) * drift,
      py + Math.sin(seconds * 0.2) * drift * 0.5,
      pz - pushAmount,
    );
    camera.lookAt(
      tx + Math.sin(seconds * 0.25) * drift * 0.3,
      ty,
      tz,
    );
  });

  return null;
}
