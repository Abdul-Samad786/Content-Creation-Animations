// Stage registry. A series picks one with "stage" in series.json; cast members
// stand on the stage's marks ("mark": "left").
import Bedroom from "./Bedroom";

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
};
