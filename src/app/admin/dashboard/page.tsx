'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Package, Mail, Users, Activity, AlertCircle,
  Cpu, MemoryStick, HardDrive, Server, BrainCircuit, MessageSquare,
  MonitorDot, ArrowRight, Zap, Brain, Shield, Wifi, WifiOff,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────
interface DashboardData {
  metrics: {
    totalProducts: number
    totalContacts: number
    totalWaitlist: number
    totalIntegrations: number
  }
  recentContacts: Array<{
    id: number
    name: string
    email: string
    createdAt: string
    companyOrProject: string
  }>
  recentEvents: Array<{
    id: number
    eventType: string
    severity: string
    title: string
    timestamp: string
    product: { name: string }
  }>
  productStats: Array<{
    id: number
    name: string
    status: string
    integration: {
      healthStatus: string
      lastHeartbeatAt: string | null
    } | null
  }>
  brainStats: {
    totalRequests: number
    successCount: number
    errorCount: number
    avgLatencyMs: number | null
  } | null
}

interface VpsSnapshot {
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  netInKbps: number
  netOutKbps: number
  timestamp: string
}

interface VpsProduct {
  id: number
  name: string
  slug: string
  status: string
  hostingScope: string
  hostedHere: boolean
  integration: { healthStatus: string; lastHeartbeatAt: string | null; uptime: number | null } | null
  vpsSnapshots: VpsSnapshot[]
}

// ── Helpers ──────────────────────────────────────────────────────
function HealthDot({ status }: { status: string }) {
  if (status === 'healthy') return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
    </span>
  )
  if (status === 'unhealthy') return <span className="inline-flex h-2 w-2 rounded-full bg-red-400" />
  return <span className="inline-flex h-2 w-2 rounded-full bg-slate-500" />
}

function VpsBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(Math.max(value, 0), 100)
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : color
  return (
    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Status Strip Item ─────────────────────────────────────────────
function StatusPill({
  label, value, icon, status,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  status: 'healthy' | 'warning' | 'error' | 'unknown'
}) {
  const colors: Record<string, string> = {
    healthy: 'border-emerald-500/20 bg-emerald-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    error: 'border-red-500/20 bg-red-500/5',
    unknown: 'border-white/8 bg-white/3',
  }
  const textColors: Record<string, string> = {
    healthy: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
    unknown: 'text-slate-500',
  }
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[status]} flex-1 min-w-0`}>
      <div className={textColors[status]}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{label}</p>
        <p className={`text-sm font-semibold truncate ${textColors[status]}`}>{value}</p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [vpsProducts, setVpsProducts] = useState<VpsProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/dashboard').then((r) => r.json()),
      fetch('/api/admin/vps').then((r) => r.json()),
    ]).then(([dash, vps]) => {
      setData(dash)
      setVpsProducts(Array.isArray(vps.products) ? vps.products : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const monitoredApps = vpsProducts.filter((p) => p.vpsSnapshots.length > 0)
  const avgCpu = monitoredApps.length
    ? monitoredApps.reduce((s, p) => s + (p.vpsSnapshots[0]?.cpuPercent ?? 0), 0) / monitoredApps.length
    : null
  const avgRam = monitoredApps.length
    ? monitoredApps.reduce((s, p) => s + (p.vpsSnapshots[0]?.ramPercent ?? 0), 0) / monitoredApps.length
    : null

  // Derive top-level health states
  const healthyApps = data?.productStats.filter(p => p.integration?.healthStatus === 'healthy').length ?? 0
  const totalApps = data?.productStats.length ?? 0
  const appHealthStatus = totalApps === 0 ? 'unknown' : healthyApps === totalApps ? 'healthy' : healthyApps > 0 ? 'warning' : 'error'

  const brainRequests = data?.brainStats?.totalRequests ?? 0
  const brainErrors = data?.brainStats?.errorCount ?? 0
  const brainStatus = brainRequests === 0 ? 'unknown' : brainErrors / brainRequests > 0.05 ? 'warning' : 'healthy'

  const cpuStatus = avgCpu === null ? 'unknown' : avgCpu >= 90 ? 'error' : avgCpu >= 75 ? 'warning' : 'healthy'

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
          <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl">

      {/* ── TIER 1: Primary Status Strip ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white font-heading">Network Overview</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill
            label="Brain"
            value={brainRequests === 0 ? 'No requests yet' : brainErrors === 0 ? 'Healthy' : `${brainErrors} errors`}
            icon={<Brain className="w-4 h-4" />}
            status={brainStatus}
          />
          <StatusPill
            label="App Network"
            value={totalApps === 0 ? 'No apps' : `${healthyApps}/${totalApps} healthy`}
            icon={<Wifi className="w-4 h-4" />}
            status={appHealthStatus}
          />
          <StatusPill
            label="Infrastructure"
            value={avgCpu === null ? 'No data' : `${avgCpu.toFixed(0)}% CPU avg`}
            icon={<Cpu className="w-4 h-4" />}
            status={cpuStatus}
          />
          <StatusPill
            label="AI Providers"
            value="Check providers"
            icon={<BrainCircuit className="w-4 h-4" />}
            status="unknown"
          />
          <StatusPill
            label="Alerts"
            value={`${data?.recentEvents.filter(e => e.severity === 'critical' || e.severity === 'error').length ?? 0} active`}
            icon={<AlertCircle className="w-4 h-4" />}
            status={
              (data?.recentEvents.filter(e => e.severity === 'critical').length ?? 0) > 0
                ? 'error'
                : (data?.recentEvents.filter(e => e.severity === 'error').length ?? 0) > 0
                ? 'warning'
                : 'healthy'
            }
          />
        </div>
      </div>

      {/* ── TIER 2: Key Metrics ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Apps Registered', value: data?.metrics.totalProducts ?? 0, icon: <Package className="w-4 h-4 text-blue-400" />, href: '/admin/dashboard/apps' },
          { label: 'AI Requests', value: data?.brainStats?.totalRequests ?? 0, icon: <BrainCircuit className="w-4 h-4 text-violet-400" />, href: '/admin/dashboard/ai-usage' },
          { label: 'Waitlist', value: data?.metrics.totalWaitlist ?? 0, icon: <Users className="w-4 h-4 text-cyan-400" />, href: '/admin/dashboard/waitlist' },
          { label: 'Contacts', value: data?.metrics.totalContacts ?? 0, icon: <Mail className="w-4 h-4 text-pink-400" />, href: '/admin/dashboard/contacts' },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={m.href} className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group block">
              <div className="p-2 rounded-lg bg-white/5">{m.icon}</div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{m.label}</p>
                <p className="text-xl font-bold text-white font-heading">{m.value.toLocaleString()}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 ml-auto group-hover:text-slate-400 transition-colors" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── TIER 2: App Network + Brain Activity ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* App Network Health */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <MonitorDot className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white font-heading">App Network</h2>
            </div>
            <Link href="/admin/dashboard/apps" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Manage →
            </Link>
          </div>
          <div className="p-5">
            {data?.productStats && data.productStats.length > 0 ? (
              <div className="space-y-2">
                {data.productStats.slice(0, 6).map((product) => (
                  <div key={product.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-2.5">
                      <HealthDot status={product.integration?.healthStatus ?? 'unknown'} />
                      <span className="text-sm text-slate-300">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 capitalize hidden sm:inline">
                        {product.status.replace(/_/g, ' ')}
                      </span>
                      {product.integration?.lastHeartbeatAt && (
                        <span className="text-[10px] text-slate-600 font-mono">
                          {formatDistanceToNow(new Date(product.integration.lastHeartbeatAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <WifiOff className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500 font-medium">No apps registered yet</p>
                <Link href="/admin/dashboard/apps" className="text-xs text-blue-400 mt-2 hover:text-blue-300">
                  Register your first app →
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Brain Activity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white font-heading">Brain Activity</h2>
            </div>
            <Link href="/admin/dashboard/ai-usage" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Full trace →
            </Link>
          </div>
          <div className="p-5">
            {data?.brainStats && data.brainStats.totalRequests > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Requests', value: data.brainStats.totalRequests.toLocaleString(), color: 'text-white' },
                    { label: 'Success', value: data.brainStats.successCount.toLocaleString(), color: 'text-emerald-400' },
                    { label: 'Errors', value: data.brainStats.errorCount.toLocaleString(), color: data.brainStats.errorCount > 0 ? 'text-red-400' : 'text-slate-500' },
                    { label: 'Avg Latency', value: data.brainStats.avgLatencyMs ? `${data.brainStats.avgLatencyMs.toFixed(0)}ms` : '—', color: 'text-cyan-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">{stat.label}</p>
                      <p className={`text-lg font-bold font-heading ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-mono">Success rate</span>
                    <span className="text-white font-mono">
                      {((data.brainStats.successCount / data.brainStats.totalRequests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{ width: `${(data.brainStats.successCount / data.brainStats.totalRequests) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Brain className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500 font-medium">No AI requests yet</p>
                <p className="text-xs text-slate-600 mt-1 max-w-[220px]">
                  Brain activity will appear here once AI providers are configured and requests are made.
                </p>
                <Link href="/admin/dashboard/ai-providers" className="text-xs text-violet-400 mt-2 hover:text-violet-300">
                  Configure AI providers →
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── TIER 2: Infrastructure + Recent Events ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Infrastructure */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white font-heading">Infrastructure</h2>
            </div>
            {monitoredApps.length > 0 && (
              <Link href="/admin/dashboard/vps" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                Full VPS view →
              </Link>
            )}
          </div>
          <div className="p-5">
            {monitoredApps.length > 0 ? (
              <div className="space-y-4">
                {/* Aggregate bars */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'CPU', value: avgCpu ?? 0, color: 'bg-blue-500', icon: <Cpu className="w-3 h-3 text-blue-400" /> },
                    { label: 'RAM', value: avgRam ?? 0, color: 'bg-cyan-500', icon: <MemoryStick className="w-3 h-3 text-cyan-400" /> },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-1 mb-2">
                        {icon}
                        <span className="text-[10px] text-slate-500 font-mono">{label}</span>
                      </div>
                      <p className="text-base font-bold text-white font-heading mb-1.5">{value.toFixed(0)}%</p>
                      <VpsBar value={value} color={color} />
                    </div>
                  ))}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-1 mb-2">
                      <MonitorDot className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-slate-500 font-mono">Apps</span>
                    </div>
                    <p className="text-base font-bold text-white font-heading mb-1.5">{monitoredApps.length}</p>
                    <p className="text-[10px] text-slate-600">monitored</p>
                  </div>
                </div>
                {/* Per-app summary */}
                <div className="space-y-2">
                  {monitoredApps.slice(0, 4).map((app) => {
                    const snap = app.vpsSnapshots[0]
                    if (!snap) return null
                    return (
                      <div key={app.id} className="flex items-center gap-3 py-1.5">
                        <HealthDot status={app.integration?.healthStatus ?? 'unknown'} />
                        <span className="text-xs text-slate-400 flex-1 truncate">{app.name}</span>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                          <span>{snap.cpuPercent.toFixed(0)}% cpu</span>
                          <span>{snap.ramPercent.toFixed(0)}% ram</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <HardDrive className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500 font-medium">No infrastructure data</p>
                <p className="text-xs text-slate-600 mt-1 max-w-[240px]">
                  VPS resource monitoring will appear here once apps are connected and sending heartbeats.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Events */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white font-heading">Recent Events</h2>
            </div>
            <Link href="/admin/dashboard/events" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              All events →
            </Link>
          </div>
          <div className="p-5">
            {data?.recentEvents && data.recentEvents.length > 0 ? (
              <div className="space-y-2.5">
                {data.recentEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      event.severity === 'critical' ? 'bg-red-500' :
                      event.severity === 'error' ? 'bg-red-400' :
                      event.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{event.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{event.product.name} · {event.eventType}</p>
                    </div>
                    <span className="text-[10px] text-slate-600 flex-shrink-0 font-mono">
                      {format(new Date(event.timestamp), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500 font-medium">No events yet</p>
                <p className="text-xs text-slate-600 mt-1">Events appear here when apps send activity to the network.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── TIER 3: Quick Actions + Recent Contacts ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white font-heading">Quick Access</h2>
            </div>
          </div>
          <div className="p-3">
            {[
              { href: '/admin/dashboard/ai-providers', label: 'AI Providers', sub: 'Configure model keys', icon: <BrainCircuit className="w-3.5 h-3.5 text-violet-400" /> },
              { href: '/admin/dashboard/apps', label: 'App Registry', sub: 'Manage connected apps', icon: <MonitorDot className="w-3.5 h-3.5 text-cyan-400" /> },
              { href: '/admin/dashboard/config', label: 'Setup Matrix', sub: 'Full system setup', icon: <Shield className="w-3.5 h-3.5 text-amber-400" /> },
              { href: '/admin/dashboard/alerts', label: 'Alerts', sub: 'View active alerts', icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" /> },
              { href: '/admin/dashboard/brain-chat', label: 'Brain Chat', sub: 'Test the AI layer', icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="p-1.5 rounded-lg bg-white/[0.04]">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white group-hover:text-white/90">{item.label}</p>
                  <p className="text-[10px] text-slate-600">{item.sub}</p>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Contacts */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass rounded-2xl overflow-hidden lg:col-span-2"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-pink-400" />
              <h2 className="text-sm font-semibold text-white font-heading">Recent Contacts</h2>
            </div>
            <Link href="/admin/dashboard/contacts" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              All contacts →
            </Link>
          </div>
          <div className="p-5">
            {data?.recentContacts && data.recentContacts.length > 0 ? (
              <div className="space-y-2.5">
                {data.recentContacts.map((contact) => (
                  <div key={contact.id} className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-sm text-white font-medium">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.email}</p>
                      {contact.companyOrProject && (
                        <p className="text-[10px] text-slate-600 mt-0.5">{contact.companyOrProject}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-600 flex-shrink-0 font-mono">
                      {format(new Date(contact.createdAt), 'MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500 font-medium">No contacts yet</p>
                <p className="text-xs text-slate-600 mt-1">Contact form submissions will appear here.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

    </div>
  )
}
