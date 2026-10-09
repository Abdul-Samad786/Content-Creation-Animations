// Gaze targets: turn a line's `eyes` direction into where the eyes point.
// Values are normalised eye offsets in [-1, 1]: x = right, y = up (world axes).
// Each character scales these by its own eye travel distance.

export const GAZE = {
  AT_OTHER: "AT_OTHER",
  PAST_OTHER: "PAST_OTHER",
  SIDE_AT_OTHER: "SIDE_AT_OTHER",
  DOWN: "DOWN",
  DOWN_SIDE: "DOWN_SIDE",
  CAMERA: "CAMERA",
};

/**
 * Reads the first clause of a line's `eyes` text (before a comma or "then")
 * and returns a GAZE key, or null when it names no direction.
 * The first clause is the held direction; "then back to X" is a return, not the target.
 *
 * @param {string|null|undefined} eyes
 * @returns {string|null}
 */
export function parseEyes(eyes) {
  if (!eyes) return null;
  const all = eyes.toLowerCase();
  const first = all.split(/,| then /)[0];

  if (/\bcamera\b/.test(all)) return GAZE.CAMERA;
  if (/\bpast\b/.test(first)) return GAZE.PAST_OTHER;
  if (/down and to the side/.test(first)) return GAZE.DOWN_SIDE;
  if (/sideways/.test(first)) return GAZE.SIDE_AT_OTHER;
  if (/^(down|drop)\b|\bfloor\b/.test(first)) return GAZE.DOWN;
  if (/\bat\b|straight|locked|back up to/.test(first)) return GAZE.AT_OTHER;
  return null;
}

function direction(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  return { dx, dy, x: dx / len, y: dy / len };
}

/**
 * Eye offset for a gaze key, seen from a character at `self`.
 *
 * @param {string} key      - a GAZE value
 * @param {number[]} self   - character world position [x, y, z]
 * @param {number[]} other  - the other character's world position
 * @param {number[]} camera - camera world position
 * @returns {{x:number, y:number}|null}
 */
export function gazeOffset(key, self, other, camera) {
  switch (key) {
    case GAZE.AT_OTHER: {
      const d = direction(self, other);
      return { x: d.x, y: d.y };
    }
    case GAZE.CAMERA: {
      const d = direction(self, camera);
      return { x: d.x, y: d.y };
    }
    case GAZE.PAST_OTHER: {
      const d = direction(self, other);
      return { x: Math.sign(d.dx) * 0.9, y: 0 };
    }
    case GAZE.SIDE_AT_OTHER: {
      const d = direction(self, other);
      return { x: Math.sign(d.dx) * 0.6, y: d.y * 0.3 };
    }
    case GAZE.DOWN:
      return { x: 0, y: -0.9 };
    case GAZE.DOWN_SIDE:
      return { x: 0.6, y: -0.7 };
    default:
      return null;
  }
}
