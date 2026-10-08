export const CAMERA_PRESETS = {
  TWO_SHOT: {
    position: [0, 2.0, 7.0],
    target: [0, 1.5, 0],
    fov: 36,
  },
  HUMAN_CU: {
    // Aim at seated face (~Y 1.85), not chest
    position: [-0.55, 2.15, 4.6],
    target: [-0.55, 1.85, 0],
    fov: 28,
  },
  AI_CU: {
    position: [0.55, 1.95, 4.6],
    target: [0.55, 1.55, 0],
    fov: 28,
  },
  OVER_HUMAN: {
    position: [-1.3, 2.3, 4.5],
    target: [0.55, 1.55, 0],
    fov: 34,
  },
  OVER_AI: {
    position: [1.3, 2.3, 4.5],
    target: [-0.55, 1.85, 0],
    fov: 34,
  },
  WIDE_SEA: {
    position: [0, 3.5, 10.5],
    target: [0, 1.3, 0],
    fov: 44,
  },
  PROJECTION: {
    position: [0, 2.3, 7.5],
    target: [0, 1.5, -3.0],
    fov: 42,
  },
};
