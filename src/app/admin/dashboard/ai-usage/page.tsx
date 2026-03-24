'use client'

import { motion } from 'framer-motion'
import {
  Activity,
  Zap,
  BarChart3,
  DollarSign,
  Clock,
  TrendingUp,
  Layers,
  WifiOff,
} from 'lucide-react'

const metricCards = [
  {
    label: 'Total Requests',
    icon: Activity,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
  },
  {
    label: 'Token Usage',
    icon: Zap,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
  },
  {
    label: 'Active Models',
    icon: Layers,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
  },
  {
    label: 'Avg Response Time',
    icon: Clock,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
  },
]

export default function AIUsagePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'Space Grotesk' }}
        >
          AI Usage
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor AI request volume, token consumption, and cost across all
          providers
        </p>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * (i + 1) }}
              className={`glass rounded-2xl p-5 border ${card.borderColor}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">
                  {card.label}
                </p>
              </div>
              <p className="text-lg font-bold text-slate-600">—</p>
              <p className="text-xs text-slate-600 mt-1">No data received yet</p>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Model Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-sm font-semibold text-white"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              Model Distribution
            </h2>
            <BarChart3 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
              <BarChart3 className="w-7 h-7 text-slate-700" />
            </div>
            <p className="text-sm text-slate-500">
              Chart will populate when AI routing is active
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Model usage breakdown across providers
            </p>
          </div>
        </motion.div>

        {/* Cost Tracking */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-sm font-semibold text-white"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              Cost Tracking
            </h2>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
              <TrendingUp className="w-7 h-7 text-slate-700" />
            </div>
            <p className="text-sm text-slate-500">
              Cost data will appear once providers are configured
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Per-provider and per-model cost analysis
            </p>
          </div>
        </motion.div>
      </div>

      {/* Request Timeline / Log */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-sm font-semibold text-white"
            style={{ fontFamily: 'Space Grotesk' }}
          >
            Request Timeline
          </h2>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
            <WifiOff className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              Not Connected
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
            <Activity className="w-7 h-7 text-slate-700" />
          </div>
          <p className="text-sm text-slate-400">
            No AI requests logged yet
          </p>
          <p className="text-xs text-slate-600 mt-1.5 max-w-sm">
            Connect providers to start tracking — every request, token count,
            latency, and cost will be logged here in real time.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
