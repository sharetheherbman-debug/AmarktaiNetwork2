'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Database, RefreshCw, AlertCircle, Search, ChevronLeft, ChevronRight,
  FileText, Brain, Lightbulb, BookOpen, User, Clock, Download, Trash2,
  ExternalLink, BarChart3,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────
interface MemoryEntry {
  id: number | string
  appSlug: string
  memoryType: string
  key: string
  content: string
  importance: number
  createdAt: string
  expiresAt?: string | null
}

interface MemoryStats {
  total: number
  byType: Record<string, number>
  activeUsers: number
}

interface MemoryResponse {
  entries: MemoryEntry[]
  stats: MemoryStats
  types: string[]
}

// ── Constants ─────────────────────────────────────────────────────
const CARD = 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  event:   { label: 'Event',   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    icon: FileText },
  summary: { label: 'Summary', color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20', icon: Brain },
  context: { label: 'Context', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',   icon: Lightbulb },
  learned: { label: 'Learned', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: BookOpen },
  profile: { label: 'Profile', color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20',     icon: User },
}

function importanceBar(score: number) {
  const pct = Math.round(score * 100)
  const color = score >= 0.8 ? 'bg-emerald-400' : score >= 0.5 ? 'bg-blue-400' : score >= 0.25 ? 'bg-amber-400' : 'bg-slate-500'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500">{pct}%</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function MemoryPage() {
  const [data, setData] = useState<MemoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const perPage = 15

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/memory')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load memory data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const entries = useMemo(() => data?.entries ?? [], [data])
  const stats = useMemo(() => data?.stats ?? { total: 0, byType: {}, activeUsers: 0 }, [data])
  const types = useMemo(() => data?.types ?? Object.keys(TYPE_CONFIG), [data])

  const filteredEntries = useMemo(() => {
    let result = entries
    if (typeFilter !== 'all') result = result.filter(e => e.memoryType === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.content.toLowerCase().includes(q) ||
        e.key.toLowerCase().includes(q) ||
        e.appSlug.toLowerCase().includes(q),
      )
    }
    return result
  }, [entries, typeFilter, search])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / perPage))
  const paginatedEntries = filteredEntries.slice((page - 1) * perPage, page * perPage)

  const byType = stats.byType ?? {}
  const maxTypeCount = Math.max(1, ...Object.values(byType))

  const STAT_CARDS = [
    { label: 'Total Memories', value: stats.total, icon: Database, color: 'text-emerald-400' },
    { label: 'Memory Types', value: types.length, icon: BarChart3, color: 'text-violet-400' },
    { label: 'Active Users', value: stats.activeUsers, icon: User, color: 'text-blue-400' },
    { label: 'This Page', value: filteredEntries.length, icon: FileText, color: 'text-amber-400' },
  ]

  const handleExport = () => {
    if (!entries.length) return
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `amarktai-memory-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 text-transparent bg-clip-text">
            Memory Store
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse, search, and manage stored memory entries across all types.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={!entries.length}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${CARD} text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-50`}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <a
            href="/api/admin/memory/manage"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${CARD} text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Manage
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <button
            onClick={load}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${CARD} text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-50`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
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
            {STAT_CARDS.map((stat, i) => (
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
                <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
              </motion.div>
            ))}
          </div>

          {/* Type breakdown by-type badges + bar chart */}
          {Object.keys(byType).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`${CARD} p-5`}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold text-white">Memory Type Distribution</h2>
              </div>
              <div className="space-y-3">
                {types.map(type => {
                  const count = byType[type] ?? 0
                  const cfg = TYPE_CONFIG[type] ?? { label: type, color: 'text-slate-400', bg: 'bg-slate-500/10', icon: FileText }
                  const pct = maxTypeCount > 0 ? (count / maxTypeCount) * 100 : 0
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-20 flex items-center gap-1.5">
                        <cfg.icon className={`w-3 h-3 ${cfg.color} flex-shrink-0`} />
                        <span className={`text-xs font-medium capitalize ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                          className={`h-full rounded-full ${cfg.bg.split(' ')[0].replace('/10', '/30')}`}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-12 text-right font-mono">{count}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl ${CARD}`}>
              <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search memories by content, key, or app..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {['all', ...types].map(t => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    typeFilter === t
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  {t === 'all' ? 'All Types' : (TYPE_CONFIG[t]?.label ?? t)}
                </button>
              ))}
            </div>
          </div>

          {/* Memory Browser */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${CARD} overflow-hidden`}
          >
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                {search && ` matching "${search}"`}
              </span>
              <span className="text-xs text-slate-600 font-mono">Page {page} / {totalPages}</span>
            </div>

            {paginatedEntries.length === 0 ? (
              <div className="p-12 text-center">
                <Database className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-1">No memories found</p>
                <p className="text-xs text-slate-600">
                  {search ? 'Try a different search query.' : 'The brain will store entries as it processes requests.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {paginatedEntries.map((entry, i) => {
                  const cfg = TYPE_CONFIG[entry.memoryType] ?? TYPE_CONFIG.event
                  const Icon = cfg.icon
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="px-5 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-lg border ${cfg.bg}`}>
                          <Icon className={`w-3 h-3 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-medium uppercase tracking-wide ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            {entry.appSlug && (
                              <span className="text-[10px] text-slate-600 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                {entry.appSlug}
                              </span>
                            )}
                            {entry.key && (
                              <span className="text-[10px] text-slate-600 font-mono truncate max-w-[200px]">
                                {entry.key}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">{entry.content}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1 text-[10px] text-slate-600">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                            </div>
                            {importanceBar(entry.importance)}
                            {entry.expiresAt && (
                              <span className="text-[10px] text-slate-600">
                                Expires {formatDistanceToNow(new Date(entry.expiresAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl ${CARD} text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 transition-colors`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = page <= 3 ? i + 1 : page + i - 2
                    if (p < 1 || p > totalPages) return null
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs transition-colors ${
                          p === page
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl ${CARD} text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 transition-colors`}
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      <p className="text-xs text-slate-600">
        Memory entries are persisted in the database. Use the Manage link to export or clear entries via
        the <code className="text-slate-400">/api/admin/memory/manage</code> endpoint.
      </p>
    </div>
  )
}
