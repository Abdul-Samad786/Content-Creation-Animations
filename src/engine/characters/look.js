// Where a character looks, as head yaw/pitch plus pupil offsets.
import { clamp, lerp } from "../math";

/** World point for a look target. */
function targetPoint(name, self, ctx) {
  const [x, y, z] = self.face;
  switch (name) {
    case "camera":
      return ctx.camera;
    case "phone":
      return [x + 0.05, y - 0.5, z + 0.45];
    case "away":
      return [x - 1.6, y + 0.4, z + 1.2];
    case "up":
      return [x, y + 2, z + 0.8];
    case "down":
      return [x, y - 1.5, z + 0.6];
    default:
      return ctx.anchors[name] || ctx.camera;
  }
}

function anglesTo(name, self, ctx) {
  const p = targetPoint(name, self, ctx);
  const dx = p[0] - self.face[0];
  const dy = p[1] - self.face[1];
  const dz = p[2] - self.face[2];
  const yaw = Math.atan2(dx, Math.max(dz, 0.05));
  const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
  return { yaw, pitch };
}

/**
 * @param look   { from, to, t } from state.js
 * @param self   { face: [x,y,z] } this character's face centre
 * @param ctx    { camera: [x,y,z], anchors }
 * @returns { headYaw, headPitch, eyeX, eyeY }
 */
export function lookAngles(look, self, ctx) {
  const a = anglesTo(look.from, self, ctx);
  const b = anglesTo(look.to, self, ctx);
  const yaw = lerp(a.yaw, b.yaw, look.t);
  const pitch = lerp(a.pitch, b.pitch, look.t);
  const headYaw = clamp(yaw * 0.6, -0.6, 0.6);
  const headPitch = clamp(pitch * 0.55, -0.35, 0.45);
  // Eyes do the rest of the turn
  return {
    headYaw,
    headPitch,
    eyeX: clamp((yaw - headYaw) * 2.2, -1, 1),
    eyeY: clamp((pitch - headPitch) * 2.4, -1, 1),
  };
}
