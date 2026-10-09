/* global document */
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { drawFace } from "../faces/drawFace";

/**
 * A canvas texture redrawn from `face` on every render. Drawing happens in a
 * layout effect, before Remotion captures the frame.
 */
export function useFaceTexture(face, style, colors, width = 512, height = 512) {
  const { canvas, texture } = useMemo(() => {
    if (typeof document === "undefined") return { canvas: null, texture: null };
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { canvas: c, texture: t };
  }, [width, height]);

  useLayoutEffect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawFace(ctx, width, face, style, colors);
    texture.needsUpdate = true;
  });

  return texture;
}
