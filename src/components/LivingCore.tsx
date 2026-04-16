'use client'
import { useEffect, useRef } from 'react'

interface LivingCoreProps { className?: string }

const C = { blue: '#3b82f6', cyan: '#22d3ee', violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b' }

function rgba(hex: string, a: number): string {
  const v = (s: number, e: number) => parseInt(hex.slice(s, e), 16)
  return `rgba(${v(1,3)},${v(3,5)},${v(5,7)},${a})`
}

/* ── Node & edge types ────────────────────────────────────────── */
interface Node {
  x: number; y: number; ox: number; oy: number
  vx: number; vy: number; phase: number
  color: string; size: number; layer: number
}

interface Pulse {
  fromIdx: number; toIdx: number; t: number
  speed: number; color: string; size: number
}

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}

/* ── Build network with 4 concentric rings ────────────────────── */
function buildNetwork(): Node[] {
  const nodes: Node[] = []

  // Core node — large, cyan, center
  const cx = 0.5, cy = 0.5
  nodes.push({ x: cx, y: cy, ox: cx, oy: cy, vx: 0, vy: 0, phase: 0, color: C.cyan, size: 2.4, layer: 0 })

  // Inner ring — 6 capability nodes
  const innerColors = [C.blue, C.cyan, C.violet, C.blue, C.cyan, C.violet]
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    const r = 0.14
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    nodes.push({
      x, y, ox: x, oy: y,
      vx: (Math.random() - 0.5) * 0.00001,
      vy: (Math.random() - 0.5) * 0.00001,
      phase: Math.random() * Math.PI * 2,
      color: innerColors[i], size: 1.4, layer: 1,
    })
  }

  // Middle ring — 10 process nodes
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.5
    const r = 0.26 + (Math.random() - 0.5) * 0.02
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    const colors = [C.blue, C.violet, C.cyan, C.rose, C.blue, C.violet, C.cyan, C.amber, C.blue, C.violet]
    nodes.push({
      x, y, ox: x, oy: y,
      vx: (Math.random() - 0.5) * 0.000008,
      vy: (Math.random() - 0.5) * 0.000008,
      phase: Math.random() * Math.PI * 2,
      color: colors[i], size: 1.0, layer: 2,
    })
  }

  // Outer ring — 14 endpoint nodes
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 1.0
    const r = 0.37 + (Math.random() - 0.5) * 0.03
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    nodes.push({
      x, y, ox: x, oy: y,
      vx: (Math.random() - 0.5) * 0.000006,
      vy: (Math.random() - 0.5) * 0.000006,
      phase: Math.random() * Math.PI * 2,
      color: i % 5 === 0 ? C.violet : i % 3 === 0 ? C.cyan : C.blue,
      size: 0.7, layer: 3,
    })
  }

  // Distant halo — 8 ambient nodes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3
    const r = 0.44 + (Math.random() - 0.5) * 0.02
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    nodes.push({
      x, y, ox: x, oy: y,
      vx: (Math.random() - 0.5) * 0.000004,
      vy: (Math.random() - 0.5) * 0.000004,
      phase: Math.random() * Math.PI * 2,
      color: C.blue, size: 0.4, layer: 4,
    })
  }

  return nodes
}

function buildEdges(nodes: Node[]): [number, number][] {
  const edges: [number, number][] = []
  // Core → inner ring (all 6)
  for (let i = 1; i <= 6; i++) edges.push([0, i])
  // Inner ring circular
  for (let i = 1; i <= 6; i++) edges.push([i, i === 6 ? 1 : i + 1])
  // Inner → middle (proximity-based)
  for (let i = 1; i <= 6; i++) {
    for (let j = 7; j <= 16; j++) {
      if (Math.hypot(nodes[i].ox - nodes[j].ox, nodes[i].oy - nodes[j].oy) < 0.18)
        edges.push([i, j])
    }
  }
  // Middle → outer
  for (let i = 7; i <= 16; i++) {
    for (let j = 17; j <= 30; j++) {
      if (j < nodes.length && Math.hypot(nodes[i].ox - nodes[j].ox, nodes[i].oy - nodes[j].oy) < 0.16)
        edges.push([i, j])
    }
  }
  // Outer → halo (sparse)
  for (let i = 17; i <= 30 && i < nodes.length; i++) {
    for (let j = 31; j < nodes.length; j++) {
      if (Math.hypot(nodes[i].ox - nodes[j].ox, nodes[i].oy - nodes[j].oy) < 0.14)
        edges.push([i, j])
    }
  }
  // Middle ring partial circular
  for (let i = 7; i <= 16; i++) {
    const next = i === 16 ? 7 : i + 1
    if (Math.random() < 0.6) edges.push([i, next])
  }
  return edges
}

/* ── Component ────────────────────────────────────────────────── */
export default function LivingCore({ className = '' }: LivingCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const nodes = buildNetwork()
    const edges = buildEdges(nodes)

    // Build pulses — 2 per edge for density, staggered start
    const pulses: Pulse[] = []
    for (let i = 0; i < edges.length; i++) {
      const [a, b] = edges[i]
      const fromLayer = nodes[a].layer
      pulses.push({
        fromIdx: a, toIdx: b,
        t: (i / edges.length),
        speed: 0.00016 + Math.random() * 0.00014,
        color: Math.random() < 0.35 ? C.cyan : Math.random() < 0.5 ? C.violet : C.blue,
        size: fromLayer === 0 ? 1.6 : fromLayer === 1 ? 1.3 : 1.0,
      })
      // Second staggered pulse on core connections
      if (fromLayer <= 1) {
        pulses.push({
          fromIdx: b, toIdx: a,
          t: Math.random(),
          speed: 0.00012 + Math.random() * 0.0001,
          color: Math.random() < 0.3 ? C.amber : C.cyan,
          size: 1.1,
        })
      }
    }

    // Ambient particles near center
    const particles: Particle[] = []
    function spawnParticle() {
      if (particles.length > 30) return
      const angle = Math.random() * Math.PI * 2
      const dist = 0.02 + Math.random() * 0.08
      particles.push({
        x: 0.5 + Math.cos(angle) * dist,
        y: 0.5 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.00002,
        vy: (Math.random() - 0.5) * 0.00002,
        life: 0, maxLife: 2000 + Math.random() * 3000,
        color: Math.random() < 0.5 ? C.cyan : C.violet,
        size: 0.5 + Math.random() * 1.0,
      })
    }

    let animFrame = 0
    let lastTime = performance.now()
    let spawnTimer = 0

    function draw(now: number) {
      const dt = Math.min(now - lastTime, 50)
      lastTime = now
      const dpr = devicePixelRatio
      const w = canvas!.width / dpr
      const h = canvas!.height / dpr
      const s = Math.min(w, h)
      const cx = w / 2, cy = h / 2

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      // ── Deep background radial glow (multiple layers) ──
      const bg1 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, s * 0.55)
      bg1.addColorStop(0, rgba(C.blue, 0.08))
      bg1.addColorStop(0.3, rgba(C.violet, 0.04))
      bg1.addColorStop(0.6, rgba(C.cyan, 0.02))
      bg1.addColorStop(1, rgba(C.blue, 0))
      ctx!.fillStyle = bg1
      ctx!.fillRect(0, 0, w, h)

      // Second glow layer — offset for depth
      const bg2 = ctx!.createRadialGradient(cx * 0.95, cy * 1.05, 0, cx, cy, s * 0.4)
      bg2.addColorStop(0, rgba(C.violet, 0.04))
      bg2.addColorStop(1, rgba(C.violet, 0))
      ctx!.fillStyle = bg2
      ctx!.fillRect(0, 0, w, h)

      // ── Drift nodes ──
      if (!prefersReduced) {
        for (const n of nodes) {
          if (n.layer === 0) continue
          const drift = Math.sin(now * 0.0003 + n.phase) * 0.000005
          const orbit = Math.cos(now * 0.00015 + n.phase * 2) * 0.000003
          n.x += (n.vx + drift) * dt
          n.y += (n.vy + orbit) * dt
          // Elastic home pull
          const dx = n.ox - n.x, dy = n.oy - n.y
          const pullStrength = 0.00004 * n.layer
          n.x += dx * pullStrength * dt
          n.y += dy * pullStrength * dt
        }
      }

      // ── Draw edges with gradient alpha based on depth ──
      for (const [i, j] of edges) {
        const ax = nodes[i].x * w, ay = nodes[i].y * h
        const bx = nodes[j].x * w, by = nodes[j].y * h
        const dist = Math.hypot(ax - bx, ay - by)
        const maxDist = 0.35 * s
        const depthAlpha = Math.max(0.04, (1 - (nodes[i].layer + nodes[j].layer) / 8))
        const alpha = Math.max(0, 1 - dist / maxDist) * 0.2 * depthAlpha
        const edgeColor = nodes[i].layer <= 1 ? C.cyan : C.blue
        ctx!.beginPath()
        ctx!.moveTo(ax, ay)
        ctx!.lineTo(bx, by)
        ctx!.strokeStyle = rgba(edgeColor, alpha)
        ctx!.lineWidth = nodes[i].layer === 0 ? 1.2 : 0.6
        ctx!.stroke()
      }

      // ── Draw pulses — signals traveling along edges ──
      if (!prefersReduced) {
        for (const p of pulses) {
          p.t += p.speed * dt
          if (p.t > 1) p.t -= 1
          const fn = nodes[p.fromIdx], tn = nodes[p.toIdx]
          const px = (fn.x + (tn.x - fn.x) * p.t) * w
          const py = (fn.y + (tn.y - fn.y) * p.t) * h
          const pr = Math.max(1.5, s * 0.003) * p.size

          // Bright core of pulse
          const pg = ctx!.createRadialGradient(px, py, 0, px, py, pr * 3)
          pg.addColorStop(0, rgba(p.color, 0.85))
          pg.addColorStop(0.3, rgba(p.color, 0.35))
          pg.addColorStop(1, rgba(p.color, 0))
          ctx!.beginPath()
          ctx!.arc(px, py, pr * 3, 0, Math.PI * 2)
          ctx!.fillStyle = pg
          ctx!.fill()

          // Tight bright dot
          ctx!.beginPath()
          ctx!.arc(px, py, pr * 0.6, 0, Math.PI * 2)
          ctx!.fillStyle = rgba(p.color, 0.9)
          ctx!.fill()
        }
      }

      // ── Draw ambient particles ──
      if (!prefersReduced) {
        spawnTimer += dt
        if (spawnTimer > 200) { spawnParticle(); spawnTimer = 0 }
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          p.life += dt
          if (p.life > p.maxLife) { particles.splice(i, 1); continue }
          p.x += p.vx * dt
          p.y += p.vy * dt
          const lifeRatio = p.life / p.maxLife
          const alpha = lifeRatio < 0.2 ? lifeRatio * 5 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1
          const pr = s * 0.002 * p.size
          const pg = ctx!.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, pr * 2)
          pg.addColorStop(0, rgba(p.color, 0.5 * alpha))
          pg.addColorStop(1, rgba(p.color, 0))
          ctx!.beginPath()
          ctx!.arc(p.x * w, p.y * h, pr * 2, 0, Math.PI * 2)
          ctx!.fillStyle = pg
          ctx!.fill()
        }
      }

      // ── Draw nodes with layered glow ──
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const nx = n.x * w, ny = n.y * h
        const pulse = prefersReduced ? 0.5 : 0.5 + 0.5 * Math.sin(now * 0.002 + n.phase)
        const baseR = Math.max(1.5, s * 0.005) * n.size

        // Deep glow (large, faint)
        if (n.layer <= 2) {
          const dg = ctx!.createRadialGradient(nx, ny, 0, nx, ny, baseR * 8)
          dg.addColorStop(0, rgba(n.color, 0.06 * pulse))
          dg.addColorStop(1, rgba(n.color, 0))
          ctx!.beginPath()
          ctx!.arc(nx, ny, baseR * 8, 0, Math.PI * 2)
          ctx!.fillStyle = dg
          ctx!.fill()
        }

        // Mid glow
        const mg = ctx!.createRadialGradient(nx, ny, 0, nx, ny, baseR * 4)
        mg.addColorStop(0, rgba(n.color, 0.15 * pulse))
        mg.addColorStop(1, rgba(n.color, 0))
        ctx!.beginPath()
        ctx!.arc(nx, ny, baseR * 4, 0, Math.PI * 2)
        ctx!.fillStyle = mg
        ctx!.fill()

        // Core dot — bright
        ctx!.beginPath()
        ctx!.arc(nx, ny, baseR, 0, Math.PI * 2)
        ctx!.fillStyle = rgba(n.color, 0.6 + 0.35 * pulse)
        ctx!.fill()

        // White-hot center for core node
        if (n.layer === 0) {
          ctx!.beginPath()
          ctx!.arc(nx, ny, baseR * 0.4, 0, Math.PI * 2)
          ctx!.fillStyle = rgba('#ffffff', 0.3 + 0.2 * pulse)
          ctx!.fill()
        }
      }

      // ── Central breathing rings (double) ──
      if (!prefersReduced) {
        const t = now * 0.001
        for (let ring = 0; ring < 3; ring++) {
          const ringPulse = 0.5 + 0.5 * Math.sin(t * 0.8 + ring * 1.2)
          const ringR = s * (0.035 + ring * 0.02) * (1 + ringPulse * 0.25)
          ctx!.beginPath()
          ctx!.arc(cx, cy, ringR, 0, Math.PI * 2)
          ctx!.strokeStyle = rgba(ring === 1 ? C.violet : C.cyan, 0.1 * ringPulse)
          ctx!.lineWidth = 0.8
          ctx!.stroke()
        }
      }

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)

    function syncSize() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect()
      const dpr = devicePixelRatio
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(canvas)

    return () => { cancelAnimationFrame(animFrame); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
      aria-label="Living neural intelligence core — multi-ring network with active signal flow"
      role="img"
    />
  )
}
