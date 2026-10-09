import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Applies a precomputed camera pose (see cameraPoseAt in ./rig.js).
 * The pose is a pure function of the frame, so this runs the same way on every render.
 */
export default function CameraRig({ pose }) {
  const { camera } = useThree();

  useLayoutEffect(() => {
    camera.position.set(...pose.position);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(...pose.target);
  }, [camera, pose]);

  return null;
}
