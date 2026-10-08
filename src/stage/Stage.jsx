import React from "react";
import Sky from "./Sky";
import Hills from "./Hills";
import Ground from "./Ground";
import Bench from "./Bench";
import Lighting from "./Lighting";
import Foreground from "./Foreground";

export default function Stage({ mood = 0 }) {
  return (
    <group>
      <Lighting mood={mood} />
      <Sky />
      <Hills />
      <Ground />
      <Bench position={[0, 0, 0.2]} />
      <Foreground />
    </group>
  );
}
