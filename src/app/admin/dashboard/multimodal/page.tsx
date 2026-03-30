'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw, AlertCircle, Layers, Route, Cpu, BarChart3,
  MessageSquare, Image, Mic, Video, Hash,
  CheckCircle, XCircle, Clock, ArrowRight,
} from 'lucide-react'

interface ModalityCapability {
  modality: string
  providers: string[]
  models: string[]
  status: 'active' | 'degraded' | 'offline'
}

interface MultimodalRoute {
  id: string
  source: string
  target: string
  provider: string
  model: string
  latencyMs: number
}

interface MultimodalStats {
  availableModalities: number
  activeRoutes: number
  supportedProviders: number
  requestVolume: number
}

interface MultimodalData {
  capabilities: ModalityCapability[]
  routes: MultimodalRoute[]
  stats: MultimodalStats
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const MODALITY_META: Record<string, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; glow: string }> = {
  text:       { icon: MessageSquare, color: 'text-blue-400',    glow: 'from-blue-500/20' },
  image:      { icon: Image,         color: 'text-violet-400',  glow: 'from-violet-500/20' },
  voice:      { icon: Mic,           color: 'text-emerald-400', glow: 'from-emerald-500/20' },
  video:      { icon: Video,         color: 'text-rose-400',    glow: 'from-rose-500/20' },
  embeddings: { icon: Hash,          color: 'text-amber-400',   glow: 'from-amber-500/20' },
}

const _statusBadge: Record<string, string> = {
  active:   'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  degraded: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  offline:  'bg-red-500/10 border-red-500/20 text-red-400',
}

function latencyColor(ms: number) {
  if (ms < 200) return 'text-emerald-400'
  if (ms < 500) return 'text-amber-400'
  return 'text-red-400'
}

export default function MultimodalPage() {
  const [data, setData] = useState<MultimodalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/multimodal')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-violet-400 text-transparent bg-clip-text">
            Multimodal Services
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cross-modal routing across text, image, voice, video, and embeddings.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/[0.03] rounded-2xl" />)}
          </div>
          <div className="h-48 bg-white/[0.03] rounded-2xl" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <motion.div variants={fadeUp} className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-400 font-medium">{error}</p>
          <p className="text-xs text-slate-600 mt-2">Configure AI providers to enable multimodal services.</p>
        </motion.div>
      )}

      {data && (
        <>
          {/* Stats Row */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Available Modalities',  value: data.stats.availableModalities, icon: Layers,    color: 'text-violet-400' },
              { label: 'Active Routes',          value: data.stats.activeRoutes,        icon: Route,     color: 'text-blue-400' },
              { label: 'Supported Providers',    value: data.stats.supportedProviders,  icon: Cpu,       color: 'text-emerald-400' },
              { label: 'Request Volume',         value: data.stats.requestVolume.toLocaleString(), icon: BarChart3, color: 'text-amber-400' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                  </div>
                  <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                </div>
              )
            })}
          </motion.div>

          {/* Modality Cards */}
          <motion.div variants={fadeUp} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              Modality Capabilities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(['text', 'image', 'voice', 'video', 'embeddings'] as const).map((modKey) => {
                const cap = data.capabilities.find(c => c.modality === modKey)
                const meta = MODALITY_META[modKey] ?? { icon: Layers, color: 'text-slate-400', glow: 'from-slate-500/20' }
                const Icon = meta.icon
                const isActive = cap && cap.status === 'active'
                return (
                  <div
                    key={modKey}
                    className={`rounded-2xl p-4 border flex flex-col gap-3 transition-all ${
                      isActive
                        ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                        : cap?.status === 'degraded'
                        ? 'bg-amber-500/[0.04] border-amber-500/20'
                        : 'bg-white/[0.02] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${meta.glow} to-transparent`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white capitalize">{modKey}</p>
                        <div className={`flex items-center gap-1.5 mt-0.5 text-xs font-medium ${
                          cap ? (cap.status === 'active' ? 'text-emerald-400' : cap.status === 'degraded' ? 'text-amber-400' : 'text-red-400') : 'text-slate-600'
                        }`}>
                          {cap ? (
                            <>
                              {cap.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              <span className="capitalize">{cap.status}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Not configured
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {cap && (
                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="text-slate-500 mb-1">Providers</p>
                          <div className="flex flex-wrap gap-1">
                            {cap.providers.map(p => (
                              <span key={p} className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 font-mono">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">Models</p>
                          <div className="flex flex-wrap gap-1">
                            {cap.models.map(m => (
                              <span key={m} className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 font-mono">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Route Table */}
          <motion.div variants={fadeUp} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Route className="w-4 h-4 text-blue-400" />
              Active Routes
            </h2>
            {data.routes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No routes configured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-white/[0.06]">
                      <th className="text-left pb-3 font-medium">Source</th>
                      <th className="text-left pb-3 font-medium" />
                      <th className="text-left pb-3 font-medium">Target</th>
                      <th className="text-left pb-3 font-medium">Provider</th>
                      <th className="text-left pb-3 font-medium">Model</th>
                      <th className="text-right pb-3 font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.routes.map((route) => {
                      const srcMeta = MODALITY_META[route.source]
                      const tgtMeta = MODALITY_META[route.target]
                      const SrcIcon = srcMeta?.icon ?? Layers
                      const TgtIcon = tgtMeta?.icon ?? Layers
                      return (
                        <tr key={route.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-2">
                            <div className="flex items-center gap-2">
                              <SrcIcon className={`w-3.5 h-3.5 ${srcMeta?.color ?? 'text-slate-400'}`} />
                              <span className="text-white capitalize">{route.source}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                          </td>
                          <td className="py-3 pr-2">
                            <div className="flex items-center gap-2">
                              <TgtIcon className={`w-3.5 h-3.5 ${tgtMeta?.color ?? 'text-slate-400'}`} />
                              <span className="text-white capitalize">{route.target}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-2">
                            <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 font-mono text-xs">
                              {route.provider}
                            </span>
                          </td>
                          <td className="py-3 pr-2 text-slate-300 font-mono text-xs">{route.model}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3 text-slate-600" />
                              <span className={`font-mono text-xs ${latencyColor(route.latencyMs)}`}>
                                {route.latencyMs}ms
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </>
      )}

      <p className="text-xs text-slate-600">
        Multimodal status depends on configured AI providers. Enable more providers to unlock additional modalities.
      </p>
    </motion.div>
  )
}
