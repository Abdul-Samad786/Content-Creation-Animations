import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { AIAgentModel } from "./AIAgentModel";

/**
 * R3F wrapper for AIAgentModel.
 * Exposes the class instance via ref so MainScene can drive animation.
 */
export const AIAgent = forwardRef(function AIAgent(
  { position = [0, 0, 0], rotation = [0, 0, 0], ...props },
  ref,
) {
  const agent = useMemo(() => new AIAgentModel(), []);

  useImperativeHandle(ref, () => agent, [agent]);

  return (
    <primitive
      object={agent.group}
      position={position}
      rotation={rotation}
      {...props}
    />
  );
});

export { AIAgentModel };
