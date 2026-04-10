'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Film, RefreshCw, AlertCircle, Loader2, ArrowLeft, Clock,
  CheckCircle, XCircle, Zap, DollarSign,
} from 'lucide-react'
import Link from 'next/link'

/* ── Types ───────────────────────────────────────────────── */
interface VideoModel {
  model_id: string
  display_name: string
  provider: string
  cost_tier: string
  specialist_domains: string[]
}

interface VideoJob {
  id: string
  prompt: string
  status: string
  provider: string | null
  model: string | null
  createdAt: string
  completedAt: string | null
  videoUrl: string | null
}

interface VideoData {
  models: VideoModel[]
  recentJobs: VideoJob[]
  stats: { total: number; pending: number; processing: number; completed: number; failed: number }
}

/* ── Page ────────────────────────────────────────────────── */
export default function VideoDashboardPage() {
  const [data, setData] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      // Fetch models and job stats in parallel
      const [modelsRes, jobsRes] = await Promise.all([
        fetch('/api/admin/models'),
        fetch('/api/admin/jobs'),
      ])

      let videoModels: VideoModel[] = []
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json()
        const allModels = modelsData.models ?? modelsData ?? []
        videoModels = allModels.filter((m: { supports_video_generation?: boolean }) => m.supports_video_generation)
      }

      let stats = { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 }
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        stats = jobsData.video ?? stats
      }

      setData({
        models: videoModels,
        recentJobs: [], // Video jobs are tracked via the video-generate API
        stats,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const glass = 'bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Film className="w-5 h-5 text-pink-400" />
                Video Generation
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Multi-provider video generation via queue-backed execution</p>
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-slate-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className={`${glass} p-4 border-red-500/20`}>
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : data && (
          <>
            {/* Job Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Total Jobs', value: data.stats.total, icon: Film, color: 'text-white' },
                { label: 'Pending', value: data.stats.pending, icon: Clock, color: 'text-amber-400' },
                { label: 'Processing', value: data.stats.processing, icon: Loader2, color: 'text-blue-400' },
                { label: 'Completed', value: data.stats.completed, icon: CheckCircle, color: 'text-green-400' },
                { label: 'Failed', value: data.stats.failed, icon: XCircle, color: 'text-red-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${glass} p-4`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                  </div>
                  <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                </motion.div>
              ))}
            </div>

            {/* Available Video Models */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glass} p-6`}>
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-violet-400" />
                Available Video Models ({data.models.length})
              </h2>
              {data.models.length === 0 ? (
                <p className="text-xs text-slate-500">No video models configured. Enable providers with video generation support.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.models.map(m => (
                    <div key={m.model_id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-sm font-medium text-white truncate">{m.display_name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{m.model_id}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          {m.provider}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5" /> {m.cost_tier}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Pipeline Info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glass} p-5`}>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Video Generation Pipeline</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">POST /api/brain/video-generate</span>
                <span>→</span>
                <span className="px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">Brain Routing</span>
                <span>→</span>
                <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">BullMQ Queue</span>
                <span>→</span>
                <span className="px-2 py-1 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">Provider Execution</span>
                <span>→</span>
                <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">Webhook Callback</span>
              </div>
              <div className="mt-3 text-[10px] text-slate-500 space-y-1">
                <p>• Video generation runs asynchronously via the job queue — never inline.</p>
                <p>• Budget mode is respected: low_cost routes to cheaper providers, best_quality to premium.</p>
                <p>• Video capability never falls back to text — returns explicit error if no video model is available.</p>
                <p>• Supported providers: Runway, Pika, Luma, Replicate, OpenAI (when enabled).</p>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
