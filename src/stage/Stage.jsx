import React from "react";
import Sky from "./Sky";
import Hills from "./Hills";
import Ground from "./Ground";
import Bench from "./Bench";
import Lighting from "./Lighting";

export default function Stage() {
  return (
    <group>
      <Lighting />
      <Sky />
      <Hills />
      <Ground />
      <Bench position={[0, 0, 0.2]} />
    </group>
  );
}
