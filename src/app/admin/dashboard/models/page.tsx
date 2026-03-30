'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Layers, RefreshCw, AlertCircle, Search, CheckCircle, XCircle,
  MessageSquare, Eye, Code, Mic, Hash, Cpu, Sparkles, Image,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────
interface ModelEntry {
  provider: string
  model_id: string
  model_name?: string
  display_name: string
  primary_role?: string
  secondary_roles?: string[]
  roles: string[]
  capabilities: string[]
  enabled: boolean
  health: string
  cost_tier?: string
  latency_tier?: string
  context_window?: number
}

// ── Constants ─────────────────────────────────────────────────────
const CARD = 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl'

const PROVIDER_COLORS: Record<string, string> = {
  openai:    'text-green-400 bg-green-500/10 border-green-500/20',
  anthropic: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  google:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
  mistral:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
  groq:      'text-purple-400 bg-purple-500/10 border-purple-500/20',
  cohere:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
  meta:      'text-sky-400 bg-sky-500/10 border-sky-500/20',
  deepseek:  'text-teal-400 bg-teal-500/10 border-teal-500/20',
  together:  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  replicate: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
}

const CAP_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  vision:     { icon: Eye,          color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  tts:        { icon: Mic,          color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  embeddings: { icon: Hash,         color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  code:       { icon: Code,         color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  chat:       { icon: MessageSquare, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  image:      { icon: Image,        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  reasoning:  { icon: Cpu,          color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  multimodal: { icon: Sparkles,     color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' },
}

// ── Page ──────────────────────────────────────────────────────────
export default function ModelsPage() {
  const [models, setModels] = useState<ModelEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [capFilter, setCapFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/models')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setModels(Array.isArray(body) ? body : body.models ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const providers = useMemo(() => [...new Set(models.map(m => m.provider))].sort(), [models])
  const allRoles = useMemo(() => [...new Set(models.flatMap(m => [m.primary_role, ...(m.roles ?? [])].filter(Boolean) as string[]))].sort(), [models])
  const allCaps = useMemo(() => [...new Set(models.flatMap(m => m.capabilities ?? []))].sort(), [models])

  const filteredModels = useMemo(() => {
    let result = models
    if (providerFilter !== 'all') result = result.filter(m => m.provider === providerFilter)
    if (roleFilter !== 'all') result = result.filter(m => m.primary_role === roleFilter || m.roles?.includes(roleFilter))
    if (capFilter !== 'all') result = result.filter(m => m.capabilities?.includes(capFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        (m.display_name ?? m.model_id).toLowerCase().includes(q) ||
        m.model_id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q),
      )
    }
    return result
  }, [models, providerFilter, roleFilter, capFilter, search])

  const enabledCount = models.filter(m => m.enabled).length
  const chatCount = models.filter(m => m.capabilities?.includes('chat') || m.primary_role === 'chat' || m.roles?.includes('chat')).length
  const multimodalCount = models.filter(m =>
    m.capabilities?.includes('multimodal') || m.capabilities?.includes('vision'),
  ).length

  const STATS = [
    { label: 'Total Models', value: models.length, icon: Layers, color: 'text-blue-400' },
    { label: 'Enabled', value: enabledCount, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Chat Models', value: chatCount, icon: MessageSquare, color: 'text-violet-400' },
    { label: 'Multimodal', value: multimodalCount, icon: Eye, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">
            Model Registry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            All registered AI models — providers, capabilities, and status.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${CARD} text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-50`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading / Error */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-24 ${CARD} animate-pulse`} />
          ))}
        </div>
      ) : error ? (
        <div className={`${CARD} border-red-500/20 p-8 text-center`}>
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`${CARD} p-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${CARD}`}>
              <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by model name, ID, or provider..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Provider filter */}
              <span className="text-xs text-slate-500">Provider:</span>
              {['all', ...providers].map(p => {
                const provStyle = p !== 'all' ? PROVIDER_COLORS[p.toLowerCase()] : undefined
                return (
                  <button
                    key={p}
                    onClick={() => setProviderFilter(p)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors capitalize ${
                      providerFilter === p
                        ? provStyle ?? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-white'
                    }`}
                  >
                    {p === 'all' ? 'All' : p}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Role filter */}
              <span className="text-xs text-slate-500">Role:</span>
              <button
                onClick={() => setRoleFilter('all')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                  roleFilter === 'all' ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-white'
                }`}
              >
                All
              </button>
              {allRoles.slice(0, 8).map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors capitalize ${
                    roleFilter === r ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
              {/* Capability filter */}
              <span className="text-xs text-slate-500 ml-2">Cap:</span>
              <button
                onClick={() => setCapFilter('all')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                  capFilter === 'all' ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-white'
                }`}
              >
                All
              </button>
              {allCaps.slice(0, 8).map(c => (
                <button
                  key={c}
                  onClick={() => setCapFilter(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors capitalize ${
                    capFilter === c ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          <p className="text-xs text-slate-500">
            Showing {filteredModels.length} of {models.length} models
          </p>

          {/* Model Grid */}
          {filteredModels.length === 0 ? (
            <div className={`${CARD} p-12 text-center`}>
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No models match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map((model, i) => {
                const provStyle = PROVIDER_COLORS[model.provider.toLowerCase()] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                const role = model.primary_role ?? model.roles?.[0] ?? 'general'
                return (
                  <motion.div
                    key={`${model.provider}:${model.model_id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`${CARD} p-4 hover:bg-white/[0.05] transition-colors group`}
                  >
                    {/* Header: name + enabled */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                          {model.display_name || model.model_id}
                        </h3>
                        <p className="text-[10px] text-slate-600 font-mono truncate mt-0.5">
                          {model.model_id}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 ml-2 inline-flex items-center gap-1 text-[10px] font-medium ${model.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {model.enabled
                          ? <><CheckCircle className="w-3 h-3" /> On</>
                          : <><XCircle className="w-3 h-3" /> Off</>
                        }
                      </span>
                    </div>

                    {/* Provider + Role */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${provStyle}`}>
                        {model.provider}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded-full capitalize">
                        {role}
                      </span>
                    </div>

                    {/* Capabilities */}
                    {model.capabilities && model.capabilities.length > 0 ? (
                      <div className="flex gap-1.5 flex-wrap">
                        {model.capabilities.map(cap => {
                          const cfg = CAP_CONFIG[cap] ?? { icon: Sparkles, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
                          const CapIcon = cfg.icon
                          return (
                            <span
                              key={cap}
                              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.color}`}
                            >
                              <CapIcon className="w-2.5 h-2.5" />
                              {cap}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-600">No capabilities reported</p>
                    )}

                    {/* Context window */}
                    {model.context_window && (
                      <p className="text-[10px] text-slate-500 mt-2">
                        Context: {model.context_window.toLocaleString()} tokens
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      <p className="text-xs text-slate-600">
        Model registry is defined in code. Entries reflect the current build configuration.
      </p>
    </div>
  )
}
