'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Brain, Plus, Bot, Globe, Shield, Zap, BookOpen, RefreshCw,
  CheckCircle, AlertCircle, Clock, ChevronRight,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────── */
interface AppAgent {
  id: string
  appSlug: string
  appName: string
  appUrl: string
  appType: string
  active: boolean
  tone: string
  budgetMode: string
  religiousMode: string
  learningEnabled: boolean
  crawlStatus: string
  lastCrawlAt: string | null
  detectedNiche: string
}

/* ── Config ────────────────────────────────────────────────── */
const glass = 'bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl'

const STATUS_MAP: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  active: { color: 'text-emerald-400', icon: CheckCircle, label: 'Active' },
  inactive: { color: 'text-slate-500', icon: Clock, label: 'Inactive' },
}

const CRAWL_STATUS: Record<string, { color: string; label: string }> = {
  none: { color: 'text-slate-500', label: 'Not crawled' },
  pending: { color: 'text-amber-400', label: 'Pending' },
  crawling: { color: 'text-blue-400', label: 'Crawling...' },
  completed: { color: 'text-emerald-400', label: 'Crawled' },
  failed: { color: 'text-red-400', label: 'Failed' },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

/* ── Component ─────────────────────────────────────────────── */
export default function AppAgentsPage() {
  const [agents, setAgents] = useState<AppAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/app-agents')
      if (!res.ok) throw new Error('Failed to fetch agents')
      const data = await res.json()
      setAgents(data.agents ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <Brain className="w-6 h-6 text-violet-400" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">App Agents</h1>
              </div>
              <p className="text-sm text-slate-400">
                Each connected app gets a dedicated AI agent. Configure behavior, knowledge, and rules in plain English.
              </p>
            </div>
            <Link
              href="/admin/dashboard/app-agents/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New App Agent
            </Link>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={fetchAgents} className="ml-auto text-sm text-red-300 hover:text-red-200">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && agents.length === 0 && (
          <motion.div initial="hidden" animate="show" variants={fadeUp} className={`${glass} p-12 text-center`}>
            <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No App Agents Yet</h3>
            <p className="text-sm text-slate-500 mb-6">
              Create your first app agent to give a connected app its own dedicated AI specialist.
            </p>
            <Link
              href="/admin/dashboard/app-agents/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create First Agent
            </Link>
          </motion.div>
        )}

        {/* Agent cards */}
        {!loading && agents.length > 0 && (
          <div className="grid gap-4">
            {agents.map((agent, i) => {
              const status = agent.active ? STATUS_MAP.active : STATUS_MAP.inactive
              const crawl = CRAWL_STATUS[agent.crawlStatus] ?? CRAWL_STATUS.none
              const StatusIcon = status.icon

              return (
                <motion.div
                  key={agent.id}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/admin/dashboard/app-agents/${agent.appSlug}`}>
                    <div className={`${glass} p-5 hover:border-violet-500/20 transition-all cursor-pointer group`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-violet-500/10">
                            <Bot className="w-5 h-5 text-violet-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">
                              {agent.appName}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">{agent.appSlug}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          {/* Status */}
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
                            <span className={`text-xs ${status.color}`}>{status.label}</span>
                          </div>

                          {/* App Type */}
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-slate-400">{agent.appType}</span>
                          </div>

                          {/* Tone */}
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-slate-400 capitalize">{agent.tone}</span>
                          </div>

                          {/* Budget */}
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-slate-400 capitalize">{agent.budgetMode.replace('_', ' ')}</span>
                          </div>

                          {/* Learning */}
                          {agent.learningEnabled && (
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-xs text-emerald-400">Learning</span>
                            </div>
                          )}

                          {/* Crawl status */}
                          <span className={`text-xs ${crawl.color}`}>{crawl.label}</span>

                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
