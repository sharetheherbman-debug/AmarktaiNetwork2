'use client'

import { motion } from 'framer-motion'
import {
  BrainCircuit,
  Sparkles,
  Bot,
  Cpu,
  Cloud,
  Box,
  ShieldCheck,
  WifiOff,
  Lock,
  Settings2,
  Info,
} from 'lucide-react'
import { useState } from 'react'

const providers = [
  {
    name: 'OpenAI',
    models: 'GPT-4, GPT-4o',
    icon: BrainCircuit,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    bgGlow: 'bg-emerald-500/5',
  },
  {
    name: 'Google Gemini',
    models: 'Gemini Pro, Gemini Ultra',
    icon: Sparkles,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    bgGlow: 'bg-blue-500/5',
  },
  {
    name: 'Grok (xAI)',
    models: 'Grok-1, Grok-2',
    icon: Bot,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    bgGlow: 'bg-purple-500/5',
  },
  {
    name: 'Qwen',
    models: 'Qwen-72B, Qwen-Max',
    icon: Cloud,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
    bgGlow: 'bg-cyan-500/5',
  },
  {
    name: 'Hugging Face',
    models: 'Open-source Models',
    icon: Box,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    bgGlow: 'bg-amber-500/5',
  },
  {
    name: 'NVIDIA',
    models: 'Reserved Slot',
    icon: Cpu,
    color: 'text-green-400',
    borderColor: 'border-green-500/20',
    bgGlow: 'bg-green-500/5',
    reserved: true,
  },
]

export default function AIProvidersPage() {
  const [tooltip, setTooltip] = useState<string | null>(null)

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
          AI Providers
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage AI model providers and API connections for the Super Brain
        </p>
      </motion.div>

      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {providers.map((provider, i) => {
          const Icon = provider.icon
          return (
            <motion.div
              key={provider.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * (i + 1) }}
              className={`glass rounded-2xl p-6 border ${provider.borderColor} relative overflow-hidden`}
            >
              {/* Background glow */}
              <div
                className={`absolute top-0 right-0 w-32 h-32 ${provider.bgGlow} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`}
              />

              <div className="relative space-y-4">
                {/* Provider Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center`}
                    >
                      <Icon className={`w-5 h-5 ${provider.color}`} />
                    </div>
                    <div>
                      <h3
                        className="text-sm font-semibold text-white"
                        style={{ fontFamily: 'Space Grotesk' }}
                      >
                        {provider.name}
                      </h3>
                      <p className="text-xs text-slate-500">{provider.models}</p>
                    </div>
                  </div>

                  {/* Connection Status */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
                    <WifiOff className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                      Offline
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status</span>
                    <span className="text-xs text-amber-400/80">
                      {provider.reserved ? 'Reserved' : 'Not configured'}
                    </span>
                  </div>

                  {/* API Key Field */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">API Key</span>
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-600" />
                      <span className="text-xs text-slate-600 font-mono">
                        No API key configured
                      </span>
                    </div>
                  </div>
                </div>

                {/* Configure Button */}
                <div className="relative">
                  <button
                    disabled
                    className="w-full py-2 px-4 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-slate-500 cursor-not-allowed flex items-center justify-center gap-2 hover:bg-white/[0.03]"
                    onMouseEnter={() => setTooltip(provider.name)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Configure
                  </button>
                  {tooltip === provider.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 whitespace-nowrap z-10"
                    >
                      Available in backend phase
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Security Note */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-5 border border-blue-500/10"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h3
              className="text-sm font-semibold text-white"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              Security & Configuration
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI provider configuration will be available when the backend API is
              connected. Keys are stored server-side only — never in the browser.
            </p>
          </div>
          <Info className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1" />
        </div>
      </motion.div>
    </div>
  )
}
