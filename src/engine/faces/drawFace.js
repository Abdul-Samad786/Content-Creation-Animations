// Draws a cute 2D face onto a canvas. The canvas becomes a texture on the
// character's head (girl) or screen (robot), so expressions can be anything a
// cartoon face can do: star eyes, hearts, spirals, tears, ω mouths.
//
// drawFace(ctx, size, face, style)
//   face  = { eyes, mouth, brows, blush, talk (0..1), blink (0..1), lookX, lookY (-1..1), t (frame) }
//   style = "anime" (skin face, dark lashes) or "screen" (glowing lines on a dark screen)

const TAU = Math.PI * 2;

// ── Primitive shapes ─────────────────────────────────────────────────────────

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(rx, 0.01), Math.max(ry, 0.01), rot, 0, TAU);
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.05, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.05, y - s * 0.35, x, y + s * 0.35);
  ctx.closePath();
}

function starPath(ctx, x, y, r, points = 5, inner = 0.48, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i * Math.PI) / points;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function sparklePath(ctx, x, y, r) {
  // Four-point twinkle
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
}

function stroke(ctx, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function fill(ctx, color) {
  ctx.fillStyle = color;
  ctx.fill();
}

// ── Palettes ─────────────────────────────────────────────────────────────────

function paletteFor(style, colors = {}) {
  if (style === "screen") {
    const glow = colors.glow || "#6FFFE3";
    return {
      screen: true,
      line: glow,
      fill: glow,
      iris: glow,
      irisLight: "#D8FFF8",
      pupil: glow,
      white: "#E8FFFB",
      mouth: glow,
      mouthInner: glow,
      tongue: colors.accent || "#FF8FB8",
      brow: glow,
      blush: colors.blush || "#FF8FB8",
      heart: colors.accent || "#FF8FB8",
      star: "#FFE27A",
      tear: "#7FD8FF",
      bg: colors.screen || "#1B2440",
    };
  }
  return {
    screen: false,
    line: colors.lash || "#2B1D2E",
    fill: colors.eyes || "#3B2A4A",
    iris: colors.eyes || "#3B2A4A",
    irisLight: colors.irisLight || "#8A6FB0",
    pupil: "#1A1020",
    white: "#FFFFFF",
    mouth: "#7A3040",
    mouthInner: "#8E2E45",
    tongue: "#FF8C9E",
    brow: colors.brow || "#5B3A2E",
    blush: colors.blush || "#FF8FA8",
    heart: "#FF4F8B",
    star: "#FFC83D",
    tear: "#8FD3FF",
    bg: null,
  };
}

// ── Eyes ─────────────────────────────────────────────────────────────────────

function drawOpenEye(ctx, p, x, y, w, h, face, side, opts = {}) {
  const blink = face.blink || 0;
  const hh = h * (1 - blink * 0.92);
  const lx = (face.lookX || 0) * w * 0.18;
  const ly = (face.lookY || 0) * h * 0.12;

  if (blink > 0.85) {
    // Closed: a soft downward curve
    ctx.beginPath();
    ctx.moveTo(x - w * 0.95, y);
    ctx.quadraticCurveTo(x, y + h * 0.28, x + w * 0.95, y);
    stroke(ctx, p.line, w * 0.2);
    return;
  }

  if (p.screen) {
    // Robot: tall glowing pill eyes with a little highlight notch
    ellipse(ctx, x + lx, y + ly, w * 0.78, hh * 0.98);
    fill(ctx, p.fill);
    if (hh > h * 0.35) {
      ellipse(ctx, x + lx - w * 0.25, y + ly - hh * 0.42, w * 0.2, hh * 0.18);
      fill(ctx, "rgba(20,30,55,0.55)");
      if (opts.sparkle) {
        sparklePath(ctx, x + lx + w * 0.3, y + ly + hh * 0.35, w * 0.32);
        fill(ctx, "#FFFFFF");
      }
    }
    return;
  }

  // Anime: big glossy iris, dark upper lash line, two highlights
  ctx.save();
  ellipse(ctx, x, y, w, hh);
  ctx.clip();
  ellipse(ctx, x, y, w, hh);
  fill(ctx, p.white);
  const g = ctx.createLinearGradient(0, y - hh, 0, y + hh);
  g.addColorStop(0, p.iris);
  g.addColorStop(0.55, p.iris);
  g.addColorStop(1, p.irisLight);
  ellipse(ctx, x + lx, y + ly + hh * 0.06, w * 0.9, hh * 0.98);
  ctx.fillStyle = g;
  ctx.fill();
  ellipse(ctx, x + lx, y + ly + hh * 0.08, w * 0.45, hh * 0.5);
  fill(ctx, p.pupil);
  // Highlights
  ellipse(ctx, x + lx - w * 0.32, y + ly - hh * 0.38, w * 0.3, h * 0.24);
  fill(ctx, "#FFFFFF");
  ellipse(ctx, x + lx + w * 0.34, y + ly + hh * 0.38, w * 0.14, h * 0.1);
  fill(ctx, "rgba(255,255,255,0.9)");
  if (opts.sparkle) {
    sparklePath(ctx, x + lx + w * 0.3, y + ly - hh * 0.05, w * 0.34);
    fill(ctx, "#FFFFFF");
    ellipse(ctx, x + lx - w * 0.1, y + ly + hh * 0.5, w * 0.12, h * 0.07);
    fill(ctx, "rgba(255,255,255,0.85)");
  }
  if (opts.teary) {
    // Wet, wobbly lower highlight
    const wob = Math.sin((face.t || 0) * 0.6) * w * 0.05;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.75, y + hh * 0.55 + wob);
    ctx.quadraticCurveTo(x, y + hh * 0.85 - wob, x + w * 0.75, y + hh * 0.55 + wob);
    stroke(ctx, "rgba(220,240,255,0.95)", w * 0.12);
  }
  ctx.restore();

  // Upper lash line with a flick at the outer corner
  const outer = side < 0 ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(x - w * 1.02, y - hh * 0.1);
  ctx.quadraticCurveTo(x, y - hh * 1.32, x + w * 1.02, y - hh * 0.1);
  stroke(ctx, p.line, w * 0.24);
  ctx.beginPath();
  ctx.moveTo(x + outer * w * 0.95, y - hh * 0.28);
  ctx.lineTo(x + outer * w * 1.32, y - hh * 0.62);
  stroke(ctx, p.line, w * 0.16);
}

function drawLidEye(ctx, p, x, y, w, h, face, side, lid, slant = 0) {
  // Half-lidded (deadpan / smug / suspicious / sleepy): iris below a straight lid
  const lidY = y - h + 2 * h * lid;
  const lx = (face.lookX || 0) * w * 0.25;
  ctx.save();
  ctx.beginPath();
  const tilt = slant * side * h * 0.35;
  ctx.moveTo(x - w * 1.2, lidY - tilt);
  ctx.lineTo(x + w * 1.2, lidY + tilt);
  ctx.lineTo(x + w * 1.2, y + h * 1.2);
  ctx.lineTo(x - w * 1.2, y + h * 1.2);
  ctx.closePath();
  ctx.clip();
  if (p.screen) {
    ellipse(ctx, x + lx, y, w * 0.78, h * 0.98);
    fill(ctx, p.fill);
  } else {
    ellipse(ctx, x, y, w, h);
    fill(ctx, p.white);
    ellipse(ctx, x + lx, y + h * 0.08, w * 0.85, h * 0.95);
    fill(ctx, p.iris);
    ellipse(ctx, x + lx, y + h * 0.1, w * 0.42, h * 0.5);
    fill(ctx, p.pupil);
    ellipse(ctx, x + lx - w * 0.3, y + h * 0.05, w * 0.18, h * 0.14);
    fill(ctx, "#FFFFFF");
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - w * 1.08, lidY - tilt);
  ctx.lineTo(x + w * 1.08, lidY + tilt);
  stroke(ctx, p.line, w * (p.screen ? 0.2 : 0.24));
}

function drawEye(ctx, p, kind, x, y, w, h, face, side) {
  const lw = w * (p.screen ? 0.28 : 0.24);
  switch (kind) {
    case "happy": {
      // ^ ^
      ctx.beginPath();
      ctx.moveTo(x - w * 0.95, y + h * 0.25);
      ctx.quadraticCurveTo(x, y - h * 0.95, x + w * 0.95, y + h * 0.25);
      stroke(ctx, p.line, lw);
      return;
    }
    case "closed": {
      ctx.beginPath();
      ctx.moveTo(x - w * 0.95, y - h * 0.05);
      ctx.quadraticCurveTo(x, y + h * 0.6, x + w * 0.95, y - h * 0.05);
      stroke(ctx, p.line, lw);
      return;
    }
    case "squint": {
      // > <
      const d = side < 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x - d * w * 0.8, y - h * 0.55);
      ctx.lineTo(x + d * w * 0.75, y);
      ctx.lineTo(x - d * w * 0.8, y + h * 0.55);
      stroke(ctx, p.line, lw);
      return;
    }
    case "cry": {
      const d = side < 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x - d * w * 0.8, y - h * 0.45);
      ctx.lineTo(x + d * w * 0.7, y);
      ctx.lineTo(x - d * w * 0.8, y + h * 0.45);
      stroke(ctx, p.line, lw);
      // Tear streams that flow down the cheek
      const t = face.t || 0;
      const g = ctx.createLinearGradient(0, y, 0, y + h * 3.2);
      g.addColorStop(0, p.tear);
      g.addColorStop(1, "rgba(143,211,255,0)");
      ctx.beginPath();
      const sway = Math.sin(t * 0.5) * w * 0.08;
      ctx.moveTo(x - w * 0.35, y + h * 0.35);
      ctx.quadraticCurveTo(x - w * 0.45 + sway, y + h * 1.8, x - w * 0.3, y + h * 3.2);
      ctx.lineTo(x + w * 0.3, y + h * 3.2);
      ctx.quadraticCurveTo(x + w * 0.45 - sway, y + h * 1.8, x + w * 0.35, y + h * 0.35);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      return;
    }
    case "shocked": {
      if (p.screen) {
        ellipse(ctx, x, y, w * 0.95, h * 0.95);
        stroke(ctx, p.line, lw * 0.75);
        ellipse(ctx, x, y, w * 0.22, h * 0.2);
        fill(ctx, p.fill);
        return;
      }
      ellipse(ctx, x, y, w * 0.95, h * 1.02);
      fill(ctx, p.white);
      stroke(ctx, p.line, w * 0.12);
      ellipse(ctx, x, y + h * 0.05, w * 0.2, h * 0.2);
      fill(ctx, p.pupil);
      ellipse(ctx, x - w * 0.07, y - h * 0.03, w * 0.06, h * 0.05);
      fill(ctx, "#FFFFFF");
      return;
    }
    case "star": {
      const s = 1 + Math.sin((face.t || 0) * 0.35) * 0.06;
      starPath(ctx, x, y, w * 1.05 * s, 5, 0.5);
      fill(ctx, p.star);
      if (!p.screen) stroke(ctx, "#E59A00", w * 0.08);
      sparklePath(ctx, x - w * 0.25, y - h * 0.2, w * 0.25);
      fill(ctx, "#FFFFFF");
      return;
    }
    case "heart": {
      const s = 1 + Math.sin((face.t || 0) * 0.45) * 0.08;
      heartPath(ctx, x, y + h * 0.15, w * 1.15 * s);
      fill(ctx, p.heart);
      if (!p.screen) stroke(ctx, "#D92D6B", w * 0.07);
      ellipse(ctx, x - w * 0.4, y - h * 0.22, w * 0.17, h * 0.11, -0.5);
      fill(ctx, "#FFFFFF");
      return;
    }
    case "spiral": {
      const t = (face.t || 0) * 0.25 * side;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const a = t + (i / 60) * TAU * 2.6;
        const r = (i / 60) * w * 0.95;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r * (h / w);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      stroke(ctx, p.line, lw * 0.6);
      return;
    }
    case "flat":
      return drawLidEye(ctx, p, x, y, w, h * 0.9, face, side, 0.5, 0);
    case "smug":
      return drawLidEye(ctx, p, x, y, w, h * 0.9, face, side, 0.42, -0.6);
    case "suspicious":
      return drawLidEye(ctx, p, x, y, w, h * 0.9, face, side, 0.38, 0.7);
    case "sleepy":
      return drawLidEye(ctx, p, x, y + h * 0.1, w, h * 0.85, face, side, 0.62, -0.3);
    case "sparkle":
      return drawOpenEye(ctx, p, x, y, w, h, face, side, { sparkle: true });
    case "teary":
      return drawOpenEye(ctx, p, x, y, w, h, face, side, { teary: true });
    case "open":
    default:
      return drawOpenEye(ctx, p, x, y, w, h, face, side);
  }
}

// ── Brows ────────────────────────────────────────────────────────────────────

function drawBrow(ctx, p, kind, x, y, w, side) {
  if (kind === "none") return;
  // side: -1 left eye, +1 right eye. "inner" is toward the face centre.
  let inner = 0;
  let outer = 0;
  let arch = 0.3;
  switch (kind) {
    case "raised": inner = -0.35; outer = -0.25; arch = 0.45; break;
    case "worried": inner = -0.45; outer = 0.25; arch = 0.1; break;
    case "angry": inner = 0.4; outer = -0.25; arch = 0; break;
    case "determined": inner = 0.25; outer = -0.1; arch = 0.1; break;
    case "flat": inner = 0.05; outer = 0.05; arch = 0; break;
    case "tilt": inner = side < 0 ? -0.45 : 0.05; outer = side < 0 ? -0.35 : 0.05; arch = 0.35; break;
    default: break;
  }
  const xi = x - side * w * 0.75;
  const xo = x + side * w * 0.85;
  const yi = y + inner * w;
  const yo = y + outer * w;
  ctx.beginPath();
  ctx.moveTo(xi, yi);
  ctx.quadraticCurveTo((xi + xo) / 2, Math.min(yi, yo) - arch * w, xo, yo);
  stroke(ctx, p.brow, w * (p.screen ? 0.2 : 0.17));
}

// ── Mouth ────────────────────────────────────────────────────────────────────

function openMouth(ctx, p, x, y, w, h, curve = 0.4) {
  // D-shape: flat-ish top, round bottom. curve>0 smiles, <0 frowns.
  ctx.beginPath();
  ctx.moveTo(x - w, y - h * 0.3);
  ctx.quadraticCurveTo(x, y - h * 0.3 - curve * h * 0.6, x + w, y - h * 0.3);
  ctx.quadraticCurveTo(x + w * 0.95, y + h * 1.0, x, y + h * 1.0);
  ctx.quadraticCurveTo(x - w * 0.95, y + h * 1.0, x - w, y - h * 0.3);
  ctx.closePath();
  if (p.screen) {
    fill(ctx, p.mouth);
    return;
  }
  fill(ctx, p.mouthInner);
  ctx.save();
  ctx.clip();
  ellipse(ctx, x, y + h * 1.05, w * 0.65, h * 0.55);
  fill(ctx, p.tongue);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - w, y - h * 0.3);
  ctx.quadraticCurveTo(x, y - h * 0.3 - curve * h * 0.6, x + w, y - h * 0.3);
  ctx.quadraticCurveTo(x + w * 0.95, y + h * 1.0, x, y + h * 1.0);
  ctx.quadraticCurveTo(x - w * 0.95, y + h * 1.0, x - w, y - h * 0.3);
  stroke(ctx, p.mouth, w * 0.12);
}

function drawMouth(ctx, p, kind, x, y, S, face) {
  const talk = face.talk || 0;
  const lw = S * (p.screen ? 0.022 : 0.016);
  const t = face.t || 0;

  // Talking: mouths that are not already wide open become an animated opening
  const alreadyOpen = ["scream", "o", "wail", "open-smile"].includes(kind);
  if (talk > 0.06 && !alreadyOpen) {
    const happy = ["smile", "grin", "cat", "wavy-smile", "smirk"].includes(kind);
    const sad = ["frown"].includes(kind);
    const w = S * (kind === "small-o" ? 0.035 : 0.055);
    const h = S * (0.012 + 0.05 * talk);
    openMouth(ctx, p, x, y, w, h, happy ? 0.6 : sad ? -0.5 : 0.1);
    return;
  }

  switch (kind) {
    case "smile": {
      ctx.beginPath();
      ctx.moveTo(x - S * 0.045, y - S * 0.006);
      ctx.quadraticCurveTo(x, y + S * 0.035, x + S * 0.045, y - S * 0.006);
      stroke(ctx, p.mouth, lw);
      return;
    }
    case "grin":
      return openMouth(ctx, p, x, y, S * 0.055, S * 0.032 + talk * S * 0.03, 0.6);
    case "open-smile":
      return openMouth(ctx, p, x, y, S * 0.07, S * 0.05 + talk * S * 0.025, 0.7);
    case "small-o":
      ellipse(ctx, x, y + S * 0.008, S * 0.018, S * 0.024 + talk * S * 0.012);
      if (p.screen) return fill(ctx, p.mouth);
      fill(ctx, p.mouthInner);
      return stroke(ctx, p.mouth, lw * 0.6);
    case "o":
      ellipse(ctx, x, y + S * 0.015, S * 0.032, S * 0.044 + talk * S * 0.015);
      if (p.screen) return fill(ctx, p.mouth);
      fill(ctx, p.mouthInner);
      return stroke(ctx, p.mouth, lw * 0.6);
    case "scream": {
      const wob = Math.sin(t * 0.9) * S * 0.004;
      return openMouth(ctx, p, x, y + S * 0.005, S * 0.065 + wob, S * 0.06 + talk * S * 0.02, -0.25);
    }
    case "wail": {
      const wob = Math.sin(t * 0.8) * S * 0.005;
      return openMouth(ctx, p, x, y + S * 0.01, S * 0.07 + wob, S * 0.04 + talk * S * 0.025, -0.8);
    }
    case "wavy":
    case "wavy-smile": {
      ctx.beginPath();
      const n = 4;
      const amp = S * 0.009;
      const lift = kind === "wavy-smile" ? S * 0.012 : 0;
      for (let i = 0; i <= n * 8; i++) {
        const u = i / (n * 8);
        const px = x - S * 0.05 + u * S * 0.1;
        const py = y + Math.sin(u * Math.PI * n + t * 0.4) * amp - Math.sin(u * Math.PI) * lift;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      return stroke(ctx, p.mouth, lw);
    }
    case "frown": {
      ctx.beginPath();
      ctx.moveTo(x - S * 0.04, y + S * 0.018);
      ctx.quadraticCurveTo(x, y - S * 0.018, x + S * 0.04, y + S * 0.018);
      return stroke(ctx, p.mouth, lw);
    }
    case "flat": {
      ctx.beginPath();
      ctx.moveTo(x - S * 0.035, y);
      ctx.lineTo(x + S * 0.035, y);
      return stroke(ctx, p.mouth, lw);
    }
    case "cat": {
      // ω
      ctx.beginPath();
      ctx.moveTo(x - S * 0.045, y - S * 0.004);
      ctx.quadraticCurveTo(x - S * 0.0225, y + S * 0.03, x, y);
      ctx.quadraticCurveTo(x + S * 0.0225, y + S * 0.03, x + S * 0.045, y - S * 0.004);
      return stroke(ctx, p.mouth, lw);
    }
    case "smirk": {
      ctx.beginPath();
      ctx.moveTo(x - S * 0.035, y + S * 0.006);
      ctx.quadraticCurveTo(x + S * 0.005, y + S * 0.02, x + S * 0.045, y - S * 0.016);
      return stroke(ctx, p.mouth, lw);
    }
    default:
      return drawMouth(ctx, p, "smile", x, y, S, face);
  }
}

// ── Blush ────────────────────────────────────────────────────────────────────

function drawBlush(ctx, p, x, y, S, amount) {
  if (amount <= 0.02) return;
  const r = S * 0.075;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  const a = Math.min(amount, 1) * (p.screen ? 0.75 : 0.65);
  g.addColorStop(0, hexA(p.blush, a));
  g.addColorStop(1, hexA(p.blush, 0));
  ellipse(ctx, x, y, r * 1.25, r * 0.75);
  ctx.fillStyle = g;
  ctx.fill();
  if (amount > 0.75) {
    // Little anime blush strokes
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * S * 0.022 + S * 0.008, y - S * 0.014);
      ctx.lineTo(x + i * S * 0.022 - S * 0.008, y + S * 0.014);
      stroke(ctx, hexA(p.screen ? p.blush : "#E85A7A", 0.75), S * 0.007);
    }
  }
}

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ── Screen background (robot) ────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawScreen(ctx, p, S) {
  roundRect(ctx, 0, 0, S, S * 0.78, S * 0.2);
  const g = ctx.createLinearGradient(0, 0, 0, S * 0.78);
  g.addColorStop(0, "#26345C");
  g.addColorStop(1, p.bg);
  ctx.fillStyle = g;
  ctx.fill();
  // Soft glass reflection
  ctx.save();
  roundRect(ctx, 0, 0, S, S * 0.78, S * 0.2);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(S * 0.05, S * 0.05);
  ctx.lineTo(S * 0.42, S * 0.05);
  ctx.lineTo(S * 0.2, S * 0.36);
  ctx.lineTo(S * 0.05, S * 0.36);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.restore();
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} S canvas size in px (square)
 */
export function drawFace(ctx, S, face, style = "anime", colors = {}) {
  const p = paletteFor(style, colors);
  ctx.clearRect(0, 0, S, S);

  if (p.screen) {
    drawScreen(ctx, p, S);
    ctx.shadowColor = p.line;
    ctx.shadowBlur = S * 0.035;
    const ey = S * 0.34;
    const ex = S * 0.25;
    const ew = S * 0.085;
    const eh = S * 0.12;
    drawBlush(ctx, p, S * 0.2, S * 0.5, S, face.blush);
    drawBlush(ctx, p, S * 0.8, S * 0.5, S, face.blush);
    drawEye(ctx, p, face.eyes, S / 2 - ex, ey, ew, eh, face, -1);
    drawEye(ctx, p, face.eyes, S / 2 + ex, ey, ew, eh, face, 1);
    if (face.brows !== "neutral") {
      drawBrow(ctx, p, face.brows, S / 2 - ex, ey - eh * 1.45, ew, -1);
      drawBrow(ctx, p, face.brows, S / 2 + ex, ey - eh * 1.45, ew, 1);
    }
    drawMouth(ctx, p, face.mouth, S / 2, S * 0.56, S * 1.15, face);
    ctx.shadowBlur = 0;
    return;
  }

  // Anime face: the canvas maps onto the front of the head sphere
  const ey = S * 0.53;
  const ex = S * 0.175;
  const ew = S * 0.068;
  const eh = S * 0.088;
  drawBlush(ctx, p, S * 0.27, S * 0.66, S, face.blush);
  drawBlush(ctx, p, S * 0.73, S * 0.66, S, face.blush);
  drawEye(ctx, p, face.eyes, S / 2 - ex, ey, ew, eh, face, -1);
  drawEye(ctx, p, face.eyes, S / 2 + ex, ey, ew, eh, face, 1);
  drawBrow(ctx, p, face.brows, S / 2 - ex, ey - eh * 1.75, ew, -1);
  drawBrow(ctx, p, face.brows, S / 2 + ex, ey - eh * 1.75, ew, 1);
  drawMouth(ctx, p, face.mouth, S / 2, S * 0.7, S, face);
}
