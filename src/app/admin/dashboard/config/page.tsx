'use client'

import { motion } from 'framer-motion'
import {
  Settings,
  BrainCircuit,
  Plug,
  Server,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Info,
} from 'lucide-react'

interface ConfigSection {
  title: string
  icon: typeof Settings
  color: string
  borderColor: string
  items: { name: string; status: 'configured' | 'not-configured' | 'pending'; note?: string }[]
}

const sections: ConfigSection[] = [
  {
    title: 'AI Provider Setup',
    icon: BrainCircuit,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    items: [
      { name: 'OpenAI (GPT-4, GPT-4o)', status: 'not-configured', note: 'Coming in backend phase' },
      { name: 'Google Gemini', status: 'not-configured', note: 'Coming in backend phase' },
      { name: 'Grok (xAI)', status: 'not-configured', note: 'Coming in backend phase' },
      { name: 'Qwen', status: 'not-configured', note: 'Coming in backend phase' },
      { name: 'Hugging Face', status: 'not-configured', note: 'Coming in backend phase' },
      { name: 'NVIDIA', status: 'not-configured', note: 'Reserved slot' },
    ],
  },
  {
    title: 'App Connection Setup',
    icon: Plug,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    items: [
      { name: 'Integration API', status: 'configured' },
      { name: 'Token Authentication', status: 'configured' },
      { name: 'Heartbeat Monitoring', status: 'configured' },
      { name: 'Event Ingestion', status: 'configured' },
      { name: 'VPS Resource Feeds', status: 'configured' },
    ],
  },
  {
    title: 'VPS Monitoring',
    icon: Server,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    items: [
      { name: 'Resource Snapshot API', status: 'configured' },
      { name: 'Real-time Dashboard', status: 'configured' },
      { name: 'Threshold Alerts', status: 'not-configured', note: 'Coming in backend phase' },
      { name: 'Historical Data Retention', status: 'pending', note: 'Stores latest snapshot per app' },
    ],
  },
  {
    title: 'Security Configuration',
    icon: Shield,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    items: [
      { name: 'Admin Session Auth', status: 'configured' },
      { name: 'API Token Validation', status: 'configured' },
      { name: 'Rate Limiting', status: 'not-configured', note: 'Coming in backend phase' },
      { name: 'Audit Logging', status: 'not-configured', note: 'Coming in backend phase' },
      { name: 'Two-Factor Authentication', status: 'not-configured', note: 'Coming in backend phase' },
    ],
  },
]

const statusConfig = {
  configured: { icon: CheckCircle, color: 'text-emerald-400', label: 'Configured' },
  'not-configured': { icon: AlertCircle, color: 'text-slate-500', label: 'Not configured' },
  pending: { icon: Clock, color: 'text-amber-400', label: 'Partial' },
}

export default function ConfigPage() {
  const totalItems = sections.reduce((a, s) => a + s.items.length, 0)
  const configuredItems = sections.reduce(
    (a, s) => a + s.items.filter((i) => i.status === 'configured').length,
    0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
          Configuration
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          System setup status and component configuration overview
        </p>
      </motion.div>

      {/* Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-5 border border-blue-500/10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>
                System Configuration
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {configuredItems} of {totalItems} components configured
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              {Math.round((configuredItems / totalItems) * 100)}%
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Complete</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
            style={{ width: `${(configuredItems / totalItems) * 100}%` }}
          />
        </div>
      </motion.div>

      {/* Sections */}
      <div className="space-y-5">
        {sections.map((section, si) => {
          const Icon = section.icon
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + si * 0.05 }}
              className={`glass rounded-2xl overflow-hidden border ${section.borderColor}`}
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <Icon className={`w-4 h-4 ${section.color}`} />
                <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>
                  {section.title}
                </h2>
                <span className="ml-auto text-xs text-slate-600">
                  {section.items.filter((i) => i.status === 'configured').length}/{section.items.length}
                </span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {section.items.map((item) => {
                  const st = statusConfig[item.status]
                  const StIcon = st.icon
                  return (
                    <div
                      key={item.name}
                      className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <StIcon className={`w-4 h-4 ${st.color}`} />
                        <span className="text-sm text-slate-300">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.note && (
                          <span className="text-[10px] text-slate-600 hidden sm:inline">
                            {item.note}
                          </span>
                        )}
                        <span className={`text-xs ${st.color}`}>{st.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer Note */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-5 border border-white/5"
      >
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Configuration changes are applied server-side. The admin dashboard is a management interface only.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
