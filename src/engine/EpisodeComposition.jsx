import React, { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EPISODES } from "./registry";
import { STAGES } from "./stages";
import { MODELS } from "./characters";
import { characterState } from "./state";
import { cameraPoseAt, projectPx } from "./camera";
import { phoneStateAt } from "./overlays/phoneState";
import Phone from "./overlays/Phone";
import Captions from "./overlays/Captions";
import Fx, { Blackout } from "./overlays/Fx";
import ScreenPopup from "./overlays/ScreenPopup";
import FloatingChat from "./overlays/FloatingChat";
import { Badge, Hook, Outro } from "./overlays/Stickers";
import Soundtrack from "./audio/Soundtrack";
import { ensureFonts } from "./fonts";

ensureFonts();

function CameraRig({ pose }) {
  const { camera, gl } = useThree();
  useLayoutEffect(() => {
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    camera.position.set(...pose.position);
    camera.fov = pose.fov;
    camera.near = 0.05;
    camera.far = 60;
    camera.updateProjectionMatrix();
    camera.lookAt(...pose.target);
  }, [camera, gl, pose]);
  return null;
}

/** Face centre and head top in world space for every on-stage character. */
function anchorsFor(plan, stage) {
  const faces = {};
  const tops = {};
  for (const c of plan.series.cast.filter((x) => x.model)) {
    const mark = stage.marks[c.mark];
    const model = MODELS[c.model];
    const f = model.face(mark.seat);
    const t = model.top(mark.seat);
    faces[c.id] = f.map((v, i) => v + mark.position[i]);
    tops[c.id] = t.map((v, i) => v + mark.position[i]);
  }
  return { faces, tops };
}

/**
 * One episode, rendered entirely from its script. Registered once per
 * episode.json by Root.jsx; `episodeKey` picks which.
 */
export default function EpisodeComposition({ episodeKey }) {
  const frame = useCurrentFrame();
  const ep = EPISODES.find((e) => e.key === episodeKey);
  const { plan } = ep;
  const stage = STAGES[plan.stage];
  if (!stage) throw new Error(`[${ep.id}] stage "${plan.stage}" is unknown. Stages: ${Object.keys(STAGES).join(", ")}`);
  const { faces, tops } = anchorsFor(plan, stage);

  const phone = phoneStateAt(plan, frame);
  const pose = cameraPoseAt(plan, frame, faces, phone.amount);
  const ctx = { camera: pose.position, anchors: faces };

  const onStage = plan.series.cast.filter((c) => c.model);
  const states = Object.fromEntries(onStage.map((c) => [c.id, characterState(plan, c.id, frame)]));

  const anchorFor = (id) => {
    if (!tops[id] || !states[id]?.visible) return null;
    const p = projectPx(tops[id], pose, plan.width, plan.height);
    return p ? { x: p.x, y: p.y, s: Math.min(2, Math.max(0.5, p.scale * 0.85)) } : null;
  };

  // The robot's screen centre, for the popup that sits on it
  const robot = onStage.find((c) => c.model === "robot");
  const screenAnchor = robot && states[robot.id].visible ? projectPx(faces[robot.id], pose, plan.width, plan.height) : null;

  const Stage = stage.Component;

  return (
    <AbsoluteFill style={{ background: "#2A2350" }}>
      <ThreeCanvas width={plan.width} height={plan.height} camera={{ fov: pose.fov, near: 0.05, far: 60 }} gl={{ antialias: true }} shadows>
        <CameraRig pose={pose} />
        <Stage frame={frame} fps={plan.fps} />
        {onStage.map((c) => {
          const { Component } = MODELS[c.model];
          const other = onStage.find((o) => o.id !== c.id);
          return (
            <Component
              key={c.id}
              state={states[c.id]}
              mark={stage.marks[c.mark]}
              look={c.look || {}}
              ctx={ctx}
              otherX={other ? stage.marks[other.mark].position[0] : 0}
            />
          );
        })}
      </ThreeCanvas>
      {/* Soft vignette for a cosy, focused frame */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(30,15,60,0.35) 100%)", pointerEvents: "none" }} />
      <Fx plan={plan} frame={frame} anchorFor={anchorFor} />
      <ScreenPopup plan={plan} frame={frame} anchor={screenAnchor} />
      <FloatingChat plan={plan} frame={frame} />
      <Phone s={phone} frame={frame} />
      <Blackout plan={plan} frame={frame} />
      <Captions plan={plan} frame={frame} />
      <Hook plan={plan} frame={frame} />
      <Badge plan={plan} frame={frame} />
      <Outro plan={plan} frame={frame} />
      <Soundtrack plan={plan} />
    </AbsoluteFill>
  );
}
