import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { HumanDeveloper } from "./HumanDeveloper";

/**
 * R3F wrapper for HumanDeveloper.
 * Exposes the class instance via ref so MainScene can drive animation.
 */
export const Human = forwardRef(function Human(
  { position = [0, 0, 0], rotation = [0, 0, 0], ...props },
  ref,
) {
  const human = useMemo(() => new HumanDeveloper(), []);

  useImperativeHandle(ref, () => human, [human]);

  return (
    <primitive
      object={human.group}
      position={position}
      rotation={rotation}
      {...props}
    />
  );
});

export { HumanDeveloper };
