'use client'

import { useEffect, useRef } from "react";

interface EcosystemNetworkProps {
  className?: string;
}

const LABELS = ["Chat", "Studio", "Code", "Voice", "Agents", "Search"];
const BLUE = "#3b82f6";
const CYAN = "#22d3ee";
const VIOLET = "#8b5cf6";
const COLORS = [BLUE, CYAN, BLUE, VIOLET, CYAN, BLUE];

interface Signal {
  line: number;
  t: number;
  speed: number;
  outward: boolean;
  color: string;
}

export default function EcosystemNetwork({ className = "" }: EcosystemNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    // Signal dots traveling along connection lines
    const signals: Signal[] = [];
    for (let i = 0; i < 18; i++) {
      signals.push({
        line: i % 6,
        t: Math.random(),
        speed: 0.3 + Math.random() * 0.4,
        outward: i % 3 === 0,
        color: COLORS[i % 6],
      });
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function draw(now: number) {
      const w = canvas!.getBoundingClientRect().width;
      const h = canvas!.getBoundingClientRect().height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.34;
      const t = now * 0.001;

      ctx!.clearRect(0, 0, w, h);

      // Compute satellite positions
      const satellites = LABELS.map((_, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
      });

      // Draw connection lines
      for (const sat of satellites) {
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(sat.x, sat.y);
        ctx!.strokeStyle = "rgba(59, 130, 246, 0.15)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      // Draw signal dots
      if (!reduced) {
        const dt = 0.008;
        for (const sig of signals) {
          sig.t += sig.outward ? sig.speed * dt : -sig.speed * dt;
          if (sig.t > 1) { sig.t = 1; sig.outward = false; }
          if (sig.t < 0) { sig.t = 0; sig.outward = true; sig.line = Math.floor(Math.random() * 6); }

          const sat = satellites[sig.line];
          const sx = cx + (sat.x - cx) * sig.t;
          const sy = cy + (sat.y - cy) * sig.t;

          ctx!.beginPath();
          ctx!.arc(sx, sy, 2.5, 0, Math.PI * 2);
          ctx!.fillStyle = sig.color;
          ctx!.fill();

          // Glow around dot
          const g = ctx!.createRadialGradient(sx, sy, 0, sx, sy, 8);
          g.addColorStop(0, sig.color + "60");
          g.addColorStop(1, sig.color + "00");
          ctx!.beginPath();
          ctx!.arc(sx, sy, 8, 0, Math.PI * 2);
          ctx!.fillStyle = g;
          ctx!.fill();
        }
      }

      // Central node pulse
      const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 2);
      const coreRadius = Math.min(w, h) * 0.055;

      // Outer glow
      const outerGlow = ctx!.createRadialGradient(cx, cy, coreRadius * 0.5, cx, cy, coreRadius * 3 * pulse);
      outerGlow.addColorStop(0, "rgba(59, 130, 246, 0.25)");
      outerGlow.addColorStop(0.5, "rgba(34, 211, 238, 0.08)");
      outerGlow.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius * 3 * pulse, 0, Math.PI * 2);
      ctx!.fillStyle = outerGlow;
      ctx!.fill();

      // Core circle
      const coreGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      coreGrad.addColorStop(0, "#60a5fa");
      coreGrad.addColorStop(1, BLUE);
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius * pulse, 0, Math.PI * 2);
      ctx!.fillStyle = coreGrad;
      ctx!.fill();

      // Satellite nodes + labels
      const nodeR = Math.min(w, h) * 0.025;
      for (let i = 0; i < satellites.length; i++) {
        const sat = satellites[i];
        const col = COLORS[i];

        // Node glow
        const ng = ctx!.createRadialGradient(sat.x, sat.y, 0, sat.x, sat.y, nodeR * 2.5);
        ng.addColorStop(0, col + "40");
        ng.addColorStop(1, col + "00");
        ctx!.beginPath();
        ctx!.arc(sat.x, sat.y, nodeR * 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = ng;
        ctx!.fill();

        // Node circle
        ctx!.beginPath();
        ctx!.arc(sat.x, sat.y, nodeR, 0, Math.PI * 2);
        ctx!.fillStyle = col;
        ctx!.fill();

        // Label
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const labelOffset = nodeR + 14;
        const lx = sat.x + Math.cos(angle) * labelOffset;
        const ly = sat.y + Math.sin(angle) * labelOffset;
        ctx!.font = `${Math.max(11, Math.min(w, h) * 0.032)}px system-ui, sans-serif`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = "rgba(226, 232, 240, 0.85)";
        ctx!.fillText(LABELS[i], lx, ly);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
      aria-label="Ecosystem network: six app types connected to a central intelligence system"
      role="img"
    />
  );
}
