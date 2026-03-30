'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, RefreshCw, AlertTriangle, TrendingDown,
  Wallet, CreditCard, AlertCircle, Bell,
} from 'lucide-react'

interface BudgetProvider {
  provider: string
  dailyLimit: number
  dailySpent: number
  monthlyLimit: number
  monthlySpent: number
  usagePercent: number
  alertLevel: 'normal' | 'warning' | 'critical'
}

interface BudgetAlert {
  id: string
  timestamp: string
  provider: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

interface BudgetSummary {
  totalBudget: number
  totalSpent: number
  remaining: number
  criticalAlerts: number
}

interface BudgetData {
  budgets: BudgetProvider[]
  alerts: BudgetAlert[]
  summary: BudgetSummary
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

function usageBarColor(pct: number) {
  if (pct > 80) return 'bg-red-400'
  if (pct > 60) return 'bg-amber-400'
  return 'bg-emerald-400'
}

function usageTextColor(pct: number) {
  if (pct > 80) return 'text-red-400'
  if (pct > 60) return 'text-amber-400'
  return 'text-emerald-400'
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/20 text-red-400',
  warning:  'bg-amber-500/10 border-amber-500/20 text-amber-400',
  info:     'bg-blue-500/10 border-blue-500/20 text-blue-400',
}

export default function BudgetsPage() {
  const [data, setData] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/budgets')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load budgets')
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
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 text-transparent bg-clip-text">
            Provider Budgets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor spend across providers with daily and monthly budget limits.
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

      {/* Loading */}
      {loading && !data && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/[0.03] rounded-2xl" />)}
          </div>
          <div className="h-48 bg-white/[0.03] rounded-2xl" />
        </div>
      )}

      {/* Error */}
      {error && (
        <motion.div variants={fadeUp} className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-400 font-medium">{error}</p>
        </motion.div>
      )}

      {data && (
        <>
          {/* Stats Row */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Budget',    value: `$${data.summary.totalBudget.toLocaleString()}`, icon: Wallet,        color: 'text-blue-400' },
              { label: 'Spent',           value: `$${data.summary.totalSpent.toLocaleString()}`,  icon: CreditCard,    color: 'text-violet-400' },
              { label: 'Remaining',       value: `$${data.summary.remaining.toLocaleString()}`,   icon: TrendingDown,  color: 'text-emerald-400' },
              { label: 'Critical Alerts', value: data.summary.criticalAlerts,                     icon: AlertTriangle, color: 'text-red-400' },
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

          {/* Budget Breakdown Table */}
          <motion.div variants={fadeUp} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              Budget Breakdown
            </h2>
            {data.budgets.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No budget entries configured.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-white/[0.06]">
                      <th className="text-left pb-3 font-medium">Provider</th>
                      <th className="text-right pb-3 font-medium">Daily Limit</th>
                      <th className="text-right pb-3 font-medium">Daily Spent</th>
                      <th className="text-right pb-3 font-medium">Monthly Limit</th>
                      <th className="text-right pb-3 font-medium">Monthly Spent</th>
                      <th className="pb-3 font-medium w-40 text-center">Usage</th>
                      <th className="text-center pb-3 font-medium">Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.budgets.map((b) => (
                      <tr key={b.provider} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-3">
                          <span className="text-white font-semibold">{b.provider}</span>
                        </td>
                        <td className="py-3 text-right text-slate-300 font-mono">${b.dailyLimit.toFixed(2)}</td>
                        <td className="py-3 text-right text-slate-300 font-mono">${b.dailySpent.toFixed(2)}</td>
                        <td className="py-3 text-right text-slate-300 font-mono">${b.monthlyLimit.toFixed(2)}</td>
                        <td className="py-3 text-right text-slate-300 font-mono">${b.monthlySpent.toFixed(2)}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, b.usagePercent)}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className={`h-full rounded-full ${usageBarColor(b.usagePercent)}`}
                              />
                            </div>
                            <span className={`text-xs font-mono w-10 text-right ${usageTextColor(b.usagePercent)}`}>
                              {b.usagePercent.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-lg border ${
                            b.alertLevel === 'critical'
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : b.alertLevel === 'warning'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {b.alertLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Budget Alerts */}
          <motion.div variants={fadeUp} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Recent Budget Alerts
            </h2>
            {data.alerts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No recent alerts.</p>
            ) : (
              <div className="space-y-2">
                {data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.info}`}
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{alert.provider}</span>
                        <span className="text-xs font-mono opacity-70 capitalize">{alert.severity}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}

      <p className="text-xs text-slate-600">
        Budget limits are enforced at the routing layer. Providers exceeding critical thresholds may be auto-suspended.
      </p>
    </motion.div>
  )
}
