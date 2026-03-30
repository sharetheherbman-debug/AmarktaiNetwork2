'use client'
import { useEffect, useRef } from 'react'

interface LivingCoreProps {
  className?: string
}

const BLUE = '#3b82f6'
const CYAN = '#22d3ee'
const NODE_COUNT = 14
const CONNECT_DIST = 0.28 // fraction of min(w,h)

interface Node { x: number; y: number; vx: number; vy: number; phase: number }
interface Pulse { edge: number; t: number; speed: number }
interface Ring { t: number; speed: number }

function rgba(hex: string, a: number): string {
  const v = (s: number, e: number) => parseInt(hex.slice(s, e), 16)
  return `rgba(${v(1, 3)},${v(3, 5)},${v(5, 7)},${a})`
}

function initNodes(): Node[] {
  const nodes: Node[] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = (i / NODE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
    const radius = 0.06 + Math.random() * 0.14
    nodes.push({
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius,
      vx: (Math.random() - 0.5) * 0.00003,
      vy: (Math.random() - 0.5) * 0.00003,
      phase: Math.random() * Math.PI * 2,
    })
  }
  return nodes
}

function buildEdges(nodes: Node[]): [number, number][] {
  const edges: [number, number][] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      if (Math.sqrt(dx * dx + dy * dy) < CONNECT_DIST) edges.push([i, j])
    }
  }
  return edges
}

export default function LivingCore({ className = '' }: LivingCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const nodes = initNodes()
    let edges = buildEdges(nodes)
    const pulses: Pulse[] = edges.map((_, i) => ({
      edge: i, t: Math.random(), speed: 0.0003 + Math.random() * 0.0002 }))
    const rings: Ring[] = [{ t: 0, speed: 0.00015 }]
    let animFrame = 0, lastTime = performance.now()

    function draw(now: number) {
      const dt = Math.min(now - lastTime, 50)
      lastTime = now
      const dpr = devicePixelRatio
      const w = canvas!.width / dpr, h = canvas!.height / dpr
      const s = Math.min(w, h), cx = w / 2, cy = h / 2

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      // Central radial glow
      const glowR = s * 0.35
      const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      glow.addColorStop(0, rgba(BLUE, 0.08))
      glow.addColorStop(0.5, rgba(CYAN, 0.03))
      glow.addColorStop(1, rgba(BLUE, 0))
      ctx!.fillStyle = glow
      ctx!.fillRect(0, 0, w, h)

      if (!prefersReduced) {
        for (const n of nodes) {
          const drift = Math.sin(now * 0.0005 + n.phase) * 0.000008
          n.x += (n.vx + drift) * dt; n.y += (n.vy + drift * 0.7) * dt
          n.x += (0.5 - n.x) * 0.00002 * dt; n.y += (0.5 - n.y) * 0.00002 * dt
        }
      }

      // Edges
      const threshold = CONNECT_DIST * s
      for (const [i, j] of edges) {
        const ax = nodes[i].x * w, ay = nodes[i].y * h
        const bx = nodes[j].x * w, by = nodes[j].y * h
        const alpha = Math.max(0, 1 - Math.hypot(ax - bx, ay - by) / threshold) * 0.2
        ctx!.beginPath(); ctx!.moveTo(ax, ay); ctx!.lineTo(bx, by)
        ctx!.strokeStyle = rgba(BLUE, alpha); ctx!.lineWidth = 0.8; ctx!.stroke()
      }

      // Pulses traveling along edges
      if (!prefersReduced) {
        for (const p of pulses) {
          p.t += p.speed * dt
          if (p.t > 1) {
            p.t -= 1
            p.edge = Math.floor(Math.random() * edges.length)
          }
          const [i, j] = edges[p.edge] ?? edges[0]
          const ax = nodes[i].x * w, ay = nodes[i].y * h
          const bx = nodes[j].x * w, by = nodes[j].y * h
          const px = ax + (bx - ax) * p.t, py = ay + (by - ay) * p.t
          const pg = ctx!.createRadialGradient(px, py, 0, px, py, 4)
          pg.addColorStop(0, rgba(CYAN, 0.6))
          pg.addColorStop(1, rgba(CYAN, 0))
          ctx!.beginPath(); ctx!.arc(px, py, 4, 0, Math.PI * 2)
          ctx!.fillStyle = pg; ctx!.fill()
        }
      }

      // Concentric ring pulses
      if (!prefersReduced) {
        for (const ring of rings) {
          ring.t += ring.speed * dt
          if (ring.t > 1) ring.t -= 1
          ctx!.beginPath(); ctx!.arc(cx, cy, ring.t * s * 0.4, 0, Math.PI * 2)
          ctx!.strokeStyle = rgba(CYAN, (1 - ring.t) * 0.1); ctx!.lineWidth = 1; ctx!.stroke()
        }
        if (rings.length < 3 && Math.random() < 0.0003 * dt)
          rings.push({ t: 0, speed: 0.00012 + Math.random() * 0.00008 })
        while (rings.length > 1 && rings[rings.length - 1].t > 0.99) rings.pop()
      }

      // Nodes
      const nodeR = Math.max(2, s * 0.006)
      for (let i = 0; i < nodes.length; i++) {
        const nx = nodes[i].x * w, ny = nodes[i].y * h
        const pulse = prefersReduced ? 0.5 : 0.5 + 0.5 * Math.sin(now * 0.002 + nodes[i].phase)
        const color = i % 3 === 0 ? CYAN : BLUE
        const og = ctx!.createRadialGradient(nx, ny, 0, nx, ny, nodeR * 4)
        og.addColorStop(0, rgba(color, 0.15 * pulse))
        og.addColorStop(1, rgba(color, 0))
        ctx!.beginPath(); ctx!.arc(nx, ny, nodeR * 4, 0, Math.PI * 2)
        ctx!.fillStyle = og; ctx!.fill()
        ctx!.beginPath(); ctx!.arc(nx, ny, nodeR, 0, Math.PI * 2)
        ctx!.fillStyle = rgba(color, 0.5 + 0.3 * pulse); ctx!.fill()
      }

      // Rebuild edges periodically to account for drift
      if (!prefersReduced && Math.random() < 0.001) edges = buildEdges(nodes)
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

    return () => {
      cancelAnimationFrame(animFrame)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
