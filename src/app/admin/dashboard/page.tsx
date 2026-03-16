'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import MetricCard from '@/components/ui/MetricCard'
import { Package, Mail, Users, Plug, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

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
}

const severityColor: Record<string, string> = {
  info: 'text-blue-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  critical: 'text-red-500',
}

const healthIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <CheckCircle className="w-4 h-4 text-emerald-400" />
    case 'unhealthy': return <AlertCircle className="w-4 h-4 text-red-400" />
    default: return <Clock className="w-4 h-4 text-slate-400" />
  }
}

const mockChartData = Array.from({ length: 14 }, (_, i) => ({
  day: format(new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000), 'MMM d'),
  contacts: Math.floor(Math.random() * 8) + 1,
  waitlist: Math.floor(Math.random() * 15) + 2,
}))

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Overview of the Amarktai Network platform</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <MetricCard
            label="Total Products"
            value={data?.metrics.totalProducts ?? 0}
            icon={<Package className="w-4 h-4" />}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <MetricCard
            label="Contacts"
            value={data?.metrics.totalContacts ?? 0}
            icon={<Mail className="w-4 h-4" />}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <MetricCard
            label="Waitlist"
            value={data?.metrics.totalWaitlist ?? 0}
            icon={<Users className="w-4 h-4" />}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <MetricCard
            label="Integrations"
            value={data?.metrics.totalIntegrations ?? 0}
            icon={<Plug className="w-4 h-4" />}
          />
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>Contacts & Waitlist (14 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0B1020', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="contacts" stroke="#3B82F6" fill="rgba(59,130,246,0.1)" strokeWidth={2} />
              <Area type="monotone" dataKey="waitlist" stroke="#06B6D4" fill="rgba(6,182,212,0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />Contacts
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />Waitlist
            </div>
          </div>
        </motion.div>

        {/* Product Health */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>Product Health</h3>
          {data?.productStats && data.productStats.length > 0 ? (
            <div className="space-y-3">
              {data.productStats.slice(0, 6).map((product) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    {healthIcon(product.integration?.healthStatus ?? 'unknown')}
                    <span className="text-sm text-white">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 capitalize">{product.status.replace('_', ' ')}</span>
                    {product.integration?.lastHeartbeatAt && (
                      <span className="text-xs text-slate-600">
                        {format(new Date(product.integration.lastHeartbeatAt), 'HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No products yet</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contacts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>Recent Contacts</h3>
          {data?.recentContacts && data.recentContacts.length > 0 ? (
            <div className="space-y-3">
              {data.recentContacts.map((contact) => (
                <div key={contact.id} className="flex items-start justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm text-white font-medium">{contact.name}</p>
                    <p className="text-xs text-slate-400">{contact.email}</p>
                    {contact.companyOrProject && (
                      <p className="text-xs text-slate-500">{contact.companyOrProject}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {format(new Date(contact.createdAt), 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No contacts yet</p>
            </div>
          )}
        </motion.div>

        {/* Recent Events */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>Recent Events</h3>
          {data?.recentEvents && data.recentEvents.length > 0 ? (
            <div className="space-y-3">
              {data.recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <Activity className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${severityColor[event.severity] ?? 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{event.title}</p>
                    <p className="text-xs text-slate-500">{event.product.name} · {event.eventType}</p>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {format(new Date(event.timestamp), 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No events yet</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
