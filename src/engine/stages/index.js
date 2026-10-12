// Stage registry. A series picks one with "stage" in series.json; cast members
// stand on the stage's marks ("mark": "left").
import Bedroom from "./Bedroom";
import Cafe from "./Cafe";

export const STAGES = {
  "bedroom-night": {
    Component: Bedroom,
    marks: {
      // Sitting on the front edge of the bed
      left: { position: [-0.34, 0, 0.0], seat: 0.55 },
      // Hovering beside the bed
      right: { position: [0.4, 0, 0.14], seat: 0 },
      center: { position: [0.05, 0, 0.1], seat: 0.55 },
    },
  },
  // Episodes pick it with "stage": "cafe" in episode.json
  cafe: {
    Component: Cafe,
    marks: {
      // On the booth seat, behind the little table
      left: { position: [-0.34, 0, 0.0], seat: 0.55 },
      // Hovering beside the table
      right: { position: [0.4, 0, 0.14], seat: 0 },
      center: { position: [0.05, 0, 0.1], seat: 0.55 },
    },
  },
};
