import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp01, easeOut, easeOutBack, hash } from "../math";

// Cartoon effects drawn in 2D over the 3D scene, anchored to a character's
// head (projected through the current camera every frame).

const Heart = ({ size, color = "#FF5C93" }) => (
  <svg width={size} height={size} viewBox="0 0 32 30" style={{ overflow: "visible" }}>
    <path d="M16 29 C 6 21, 0 15, 0 8.5 C 0 3.5, 4 0, 8.5 0 C 12 0, 14.5 2, 16 4.5 C 17.5 2, 20 0, 23.5 0 C 28 0, 32 3.5, 32 8.5 C 32 15, 26 21, 16 29 Z" fill={color} stroke="#FFFFFF" strokeWidth="2.5" />
    <ellipse cx="9" cy="8" rx="3.2" ry="2.2" fill="#FFFFFF" opacity="0.8" transform="rotate(-30 9 8)" />
  </svg>
);

const Twinkle = ({ size, color = "#FFE27A" }) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20" style={{ overflow: "visible" }}>
    <path d="M0 -10 Q0 0 10 0 Q0 0 0 10 Q0 0 -10 0 Q0 0 0 -10 Z" fill={color} stroke="#FFFFFF" strokeWidth="1.2" />
  </svg>
);

const Drop = ({ size }) => (
  <svg width={size} height={size * 1.35} viewBox="0 0 20 27" style={{ overflow: "visible" }}>
    <path d="M10 0 C 13 7, 20 12, 20 18 C 20 23, 15.5 27, 10 27 C 4.5 27, 0 23, 0 18 C 0 12, 7 7, 10 0 Z" fill="#9EDBFF" stroke="#FFFFFF" strokeWidth="2" />
    <ellipse cx="6.5" cy="18" rx="2.2" ry="3.4" fill="#FFFFFF" opacity="0.85" />
  </svg>
);

function Hearts({ p, t, dur, seed }) {
  return [0, 1, 2, 3, 4].map((i) => {
    const delay = i * 4;
    const u = clamp01((t - delay) / (dur - delay));
    if (u <= 0 || u >= 1) return null;
    const side = (hash(seed + i) - 0.5) * 2;
    const x = p.x + side * 150 * p.s + Math.sin(u * 6 + i) * 18;
    const y = p.y - 40 * p.s - u * 260 * p.s;
    const sc = easeOutBack(clamp01(u * 5)) * (0.7 + hash(seed + i * 3) * 0.6);
    const op = u > 0.75 ? (1 - u) / 0.25 : 1;
    return (
      <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${sc}) rotate(${side * 18}deg)`, opacity: op }}>
        <Heart size={64 * p.s} color={i % 2 ? "#FF7EB6" : "#FF4F8B"} />
      </div>
    );
  });
}

function Sparkles({ p, t, dur, seed }) {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2 + hash(seed) * 3;
    const r = (150 + hash(seed + i) * 70) * p.s;
    const x = p.x + Math.cos(a) * r;
    const y = p.y + 80 * p.s + Math.sin(a) * r * 0.8;
    const local = t - i * 3;
    if (local < 0 || t > dur) return null;
    const tw = Math.abs(Math.sin(local * 0.22));
    const op = t > dur - 8 ? (dur - t) / 8 : 1;
    return (
      <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${0.4 + tw * 0.8}) rotate(${local * 3}deg)`, opacity: op }}>
        <Twinkle size={46 * p.s} color={i % 3 === 0 ? "#FFFFFF" : "#FFE27A"} />
      </div>
    );
  });
}

function Sweat({ p, t, dur }) {
  const pop = easeOutBack(clamp01(t / 8));
  const slide = easeOut(clamp01(t / dur)) * 40 * p.s;
  const op = t > dur - 8 ? (dur - t) / 8 : 1;
  return (
    <div style={{ position: "absolute", left: p.x + 175 * p.s, top: p.y + 70 * p.s + slide, transform: `translate(-50%,-50%) scale(${pop}) rotate(18deg)`, opacity: op }}>
      <Drop size={70 * p.s} />
    </div>
  );
}

function Rain({ p, t, dur, seed }) {
  const appear = easeOutBack(clamp01(t / 10));
  const op = t > dur - 10 ? (dur - t) / 10 : 1;
  const w = 260 * p.s;
  const bob = Math.sin(t * 0.15) * 6;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y - 90 * p.s + bob, transform: `translate(-50%,-50%) scale(${appear})`, opacity: op }}>
      <svg width={w} height={w * 0.95} viewBox="0 0 100 95" style={{ overflow: "visible" }}>
        {Array.from({ length: 9 }, (_, i) => {
          const x = 18 + (i % 9) * 8 + hash(seed + i) * 4;
          const fall = ((t * 3.2 + hash(seed + i * 2) * 40) % 50) + 34;
          return <line key={i} x1={x} y1={fall} x2={x - 2} y2={fall + 9} stroke="#8FC8FF" strokeWidth="2.6" strokeLinecap="round" opacity={0.9} />;
        })}
        <g fill="#9AA3B8" stroke="#FFFFFF" strokeWidth="2">
          <ellipse cx="50" cy="26" rx="40" ry="16" />
          <circle cx="34" cy="20" r="15" />
          <circle cx="56" cy="14" r="18" />
          <circle cx="72" cy="24" r="12" />
        </g>
        <g fill="#9AA3B8">
          <ellipse cx="50" cy="27" rx="38" ry="14" />
        </g>
      </svg>
    </div>
  );
}

function Shock({ p, t, dur }) {
  const pop = easeOutBack(clamp01(t / 5), 3);
  const op = t > dur - 6 ? (dur - t) / 6 : 1;
  const lines = [-55, -25, 5].map((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad - Math.PI / 2) * 1, y: Math.sin(rad - Math.PI / 2) * 1, deg, i };
  });
  return (
    <div style={{ position: "absolute", left: p.x - 150 * p.s, top: p.y + 10 * p.s, transform: `translate(-50%,-50%) scale(${pop})`, opacity: op }}>
      <svg width={140 * p.s} height={140 * p.s} viewBox="-50 -50 100 100" style={{ overflow: "visible" }}>
        {lines.map((l) => (
          <line key={l.i} x1={l.x * 14} y1={l.y * 14} x2={l.x * 42} y2={l.y * 42} stroke="#2B1D3A" strokeWidth="7" strokeLinecap="round" transform={`rotate(${-35})`} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 300 * p.s, top: -30 * p.s, fontFamily: "Fredoka", fontWeight: 700, fontSize: 90 * p.s, color: "#FF5C5C", WebkitTextStroke: `${6 * p.s}px #FFFFFF`, paintOrder: "stroke fill", transform: "rotate(12deg)" }}>!</div>
    </div>
  );
}

function Question({ p, t, dur }) {
  const op = t > dur - 8 ? (dur - t) / 8 : 1;
  return [0, 1].map((i) => {
    const pop = easeOutBack(clamp01((t - i * 6) / 8), 2.5);
    if (pop <= 0) return null;
    const x = p.x + (i ? 170 : 120) * p.s;
    const y = p.y - (i ? 30 : 90) * p.s + Math.sin(t * 0.2 + i * 2) * 10;
    return (
      <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${pop}) rotate(${i ? 16 : -8}deg)`, opacity: op, fontFamily: "Fredoka", fontWeight: 700, fontSize: (i ? 70 : 100) * p.s, color: "#8C7BFF", WebkitTextStroke: `${7 * p.s}px #FFFFFF`, paintOrder: "stroke fill" }}>
        ?
      </div>
    );
  });
}

const CONFETTI_COLORS = ["#FF7EB6", "#FFE27A", "#7FD8FF", "#B8F2A6", "#C9B8FF", "#FFFFFF"];

function Confetti({ t, dur, seed, width, height }) {
  return Array.from({ length: 70 }, (_, i) => {
    const h1 = hash(seed + i * 1.3);
    const h2 = hash(seed + i * 2.7);
    const h3 = hash(seed + i * 4.1);
    const x0 = h1 * width;
    const delay = h2 * 8;
    const lt = t - delay;
    if (lt < 0) return null;
    const burst = easeOut(clamp01(lt / 12));
    const y = -40 + burst * (h3 * 500) + Math.max(0, lt - 10) * (7 + h2 * 6);
    if (y > height + 40) return null;
    const x = x0 + Math.sin(lt * 0.12 + i) * 30;
    const op = t > dur - 10 ? (dur - t) / 10 : 1;
    const shape = i % 3;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: shape === 2 ? 22 : 18,
          height: shape === 0 ? 30 : 18,
          borderRadius: shape === 1 ? "50%" : 5,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          transform: `rotate(${lt * (6 + h1 * 8)}deg) scaleX(${Math.cos(lt * 0.2 + i)})`,
          opacity: op,
        }}
      />
    );
  });
}

/**
 * @param anchorFor (id) => {x, y, s} | null   screen position of a character's head top
 */
export default function Fx({ plan, frame, anchorFor }) {
  const items = plan.fx.filter((e) => e.type !== "blackout" && frame >= e.frame && frame < e.frame + e.dur);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {items.map((e, k) => {
        const t = frame - e.frame;
        const props = { t, dur: e.dur, seed: e.seed };
        if (e.type === "confetti") return <Confetti key={k} {...props} width={plan.width} height={plan.height} />;
        const p = anchorFor(e.on);
        if (!p) return null;
        switch (e.type) {
          case "hearts": return <Hearts key={k} p={p} {...props} />;
          case "sparkles": return <Sparkles key={k} p={p} {...props} />;
          case "sweat": return <Sweat key={k} p={p} {...props} />;
          case "rain": return <Rain key={k} p={p} {...props} />;
          case "shock": return <Shock key={k} p={p} {...props} />;
          case "question": return <Question key={k} p={p} {...props} />;
          default: return null;
        }
      })}
    </AbsoluteFill>
  );
}

/** "blackout" effects: a full-screen cut to black, layered above the phone and captions. */
export function Blackout({ plan, frame }) {
  const e = plan.fx.find((x) => x.type === "blackout" && frame >= x.frame && frame < x.frame + x.dur);
  if (!e) return null;
  const t = frame - e.frame;
  return <AbsoluteFill style={{ background: "#000000", opacity: clamp01(t / 3), pointerEvents: "none" }} />;
}
