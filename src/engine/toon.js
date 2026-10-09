// Shared cel-shading ramp. Every mesh uses MeshToonMaterial with this map, so
// light falls off in a few soft bands instead of a realistic gradient: the
// flat, friendly look of a cartoon.
import * as THREE from "three";

let ramp = null;

export function toonRamp() {
  if (ramp) return ramp;
  const data = new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 245, 245, 245, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}
