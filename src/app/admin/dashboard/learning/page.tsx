'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Brain, RefreshCw, Trophy, Zap, TrendingUp, Target,
  AlertCircle, Clock, ArrowUpRight, ArrowDownRight,
  Sparkles, Star,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────
interface ModelScore {
  model: string
  provider: string
  taskType: string
  wins: number
  losses: number
  totalScores: number
  avgScore: number
}

interface BestModel {
  taskType: string
  model: string
  provider: string
  winRate: number
  totalUsed: number
}

interface Optimization {
  id: string
  target: string
  action: string
  result: string
  timestamp: string
}

interface LearningData {
  scores: ModelScore[]
  bestModels: BestModel[]
  optimizations: Optimization[]
}

// ── Provider color map ────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  openai: 'text-green-400 bg-green-500/10 border-green-500/20',
  anthropic: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  google: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  mistral: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  groq: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  cohere: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
}

const CARD = 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl'

function winRateColor(rate: number) {
  if (rate >= 0.75) return 'text-emerald-400'
  if (rate >= 0.5) return 'text-blue-400'
  if (rate >= 0.25) return 'text-amber-400'
  return 'text-red-400'
}

function winRateBar(rate: number) {
  const pct = Math.round(rate * 100)
  const color = rate >= 0.75 ? 'bg-emerald-400' : rate >= 0.5 ? 'bg-blue-400' : rate >= 0.25 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${winRateColor(rate)}`}>{pct}%</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function LearningPage() {
  const [data, setData] = useState<LearningData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taskFilter, setTaskFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/learning')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const scores = useMemo(() => data?.scores ?? [], [data])
  const bestModels = useMemo(() => data?.bestModels ?? [], [data])
  const optimizations = useMemo(() => data?.optimizations ?? [], [data])

  const taskTypes = useMemo(() => [...new Set(scores.map(s => s.taskType))], [scores])
  const filteredScores = useMemo(
    () => taskFilter === 'all' ? scores : scores.filter(s => s.taskType === taskFilter),
    [scores, taskFilter],
  )

  const totalScores = scores.reduce((s, m) => s + m.totalScores, 0)
  const totalWins = scores.reduce((s, m) => s + m.wins, 0)
  const totalLosses = scores.reduce((s, m) => s + m.losses, 0)
  const globalWinRate = totalWins + totalLosses > 0 ? totalWins / (totalWins + totalLosses) : 0

  const STATS = [
    { label: 'Total Model Scores', value: totalScores.toLocaleString(), icon: Brain, color: 'text-violet-400' },
    { label: 'Best Model Usage', value: String(bestModels.length), icon: Trophy, color: 'text-amber-400' },
    { label: 'Optimization Events', value: String(optimizations.length), icon: Zap, color: 'text-cyan-400' },
    { label: 'Win Rate', value: `${Math.round(globalWinRate * 100)}%`, icon: Target, color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-300 text-transparent bg-clip-text">
            Learning &amp; Optimization
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Model performance scores, optimization events, and learning insights.
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

          {/* Task type filters */}
          {taskTypes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Task type:</span>
              {['all', ...taskTypes].map(t => (
                <button
                  key={t}
                  onClick={() => setTaskFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    taskFilter === t
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  {t === 'all' ? 'All Tasks' : t}
                </button>
              ))}
            </div>
          )}

          {/* Model Performance Ranking Table */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`${CARD} overflow-hidden`}
          >
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Model Performance Ranking</h2>
              <span className="ml-auto text-xs text-slate-500">{filteredScores.length} models</span>
            </div>
            {filteredScores.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No scoring data available yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-xs text-slate-500">
                      <th className="px-5 py-3 font-medium">#</th>
                      <th className="px-5 py-3 font-medium">Model</th>
                      <th className="px-5 py-3 font-medium">Provider</th>
                      <th className="px-5 py-3 font-medium">Task Type</th>
                      <th className="px-5 py-3 font-medium">Win / Loss</th>
                      <th className="px-5 py-3 font-medium">Win Rate</th>
                      <th className="px-5 py-3 font-medium text-right">Total Scores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredScores
                      .sort((a, b) => {
                        const rateA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0
                        const rateB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0
                        return rateB - rateA || b.totalScores - a.totalScores
                      })
                      .map((row, i) => {
                        const rate = row.wins + row.losses > 0 ? row.wins / (row.wins + row.losses) : 0
                        const provStyle = PROVIDER_COLORS[row.provider.toLowerCase()] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                        return (
                          <motion.tr
                            key={`${row.provider}-${row.model}-${row.taskType}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-5 py-3 text-xs text-slate-500 font-mono">{i + 1}</td>
                            <td className="px-5 py-3">
                              <span className="text-sm text-white font-medium">{row.model}</span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${provStyle}`}>
                                {row.provider}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                                {row.taskType}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-emerald-400 flex items-center gap-0.5">
                                  <ArrowUpRight className="w-3 h-3" />{row.wins}
                                </span>
                                <span className="text-slate-600">/</span>
                                <span className="text-red-400 flex items-center gap-0.5">
                                  <ArrowDownRight className="w-3 h-3" />{row.losses}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3">{winRateBar(rate)}</td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-sm text-white font-mono">{row.totalScores.toLocaleString()}</span>
                            </td>
                          </motion.tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Two column: Optimization Feed + Learning Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent Optimization Feed */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`${CARD} overflow-hidden`}
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Recent Optimizations</h2>
              </div>
              {optimizations.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No optimization events recorded yet.</div>
              ) : (
                <div className="divide-y divide-white/[0.04] max-h-[380px] overflow-y-auto">
                  {optimizations.slice(0, 20).map((opt, i) => (
                    <motion.div
                      key={opt.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-5 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <span className="text-xs text-white font-medium truncate">{opt.target}</span>
                        <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">
                          {opt.action}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 ml-5">{opt.result}</p>
                      <div className="flex items-center gap-1 mt-1 ml-5 text-[10px] text-slate-600">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(opt.timestamp), { addSuffix: true })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Learning Insights */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`${CARD} overflow-hidden`}
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Top Models per Task</h2>
              </div>
              {bestModels.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No task-level insights available yet.</div>
              ) : (
                <div className="divide-y divide-white/[0.04] max-h-[380px] overflow-y-auto">
                  {bestModels.map((bm, i) => {
                    const provStyle = PROVIDER_COLORS[bm.provider.toLowerCase()] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                    return (
                      <motion.div
                        key={bm.taskType}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded capitalize">
                            {bm.taskType}
                          </span>
                          <span className="text-[10px] text-slate-500">{bm.totalUsed} uses</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="text-sm text-white font-medium">{bm.model}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${provStyle}`}>
                            {bm.provider}
                          </span>
                        </div>
                        <div className="mt-2">{winRateBar(bm.winRate)}</div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}

      <p className="text-xs text-slate-600">
        Learning data is collected from model comparisons and routing decisions. Optimization events
        reflect automatic tuning performed by the brain engine.
      </p>
    </div>
  )
}
