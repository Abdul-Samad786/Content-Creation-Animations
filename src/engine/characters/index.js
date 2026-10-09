// Character model registry. A cast member's "model" in series.json picks one.
// `face(seat)` and `top(seat)` give the face centre / head top relative to the
// character's mark, used by the camera and by effects.
import Girl, { GIRL } from "./Girl";
import Robot, { ROBOT } from "./Robot";

export const MODELS = {
  girl: { Component: Girl, face: GIRL.face, top: GIRL.top },
  robot: { Component: Robot, face: ROBOT.face, top: ROBOT.top },
};
