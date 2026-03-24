'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  Brain,
  Send,
  Mic,
  MicOff,
  PanelRightOpen,
  PanelRightClose,
  Sparkles,
  Database,
  Activity,
  WifiOff,
} from 'lucide-react'

export default function BrainChatPage() {
  const [input, setInput] = useState('')
  const [sidePanel, setSidePanel] = useState(false)
  const [tooltip, setTooltip] = useState(false)

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Main Chat Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col glass rounded-2xl overflow-hidden"
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>
                Super Brain Chat
              </h1>
              <div className="flex items-center gap-1.5">
                <WifiOff className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] text-slate-600 uppercase tracking-wider">Awaiting backend</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidePanel(!sidePanel)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-colors"
          >
            {sidePanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center mb-5">
            <Sparkles className="w-9 h-9 text-slate-700" />
          </div>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Amarktai Super Brain is ready for connection. Once the AI backend is active, you can chat with the Brain directly from here.
          </p>
          <p className="text-xs text-slate-600 mt-2 max-w-sm">
            Streaming responses, memory context, and multi-model routing will be available in this interface.
          </p>

          {/* Connect Button */}
          <div className="relative mt-6">
            <button
              disabled
              className="px-5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400/50 cursor-not-allowed flex items-center gap-2"
              onMouseEnter={() => setTooltip(true)}
              onMouseLeave={() => setTooltip(false)}
            >
              <Brain className="w-4 h-4" />
              Connect AI Backend
            </button>
            {tooltip && (
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

        {/* Input Bar */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message the Super Brain..."
                disabled
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none disabled:cursor-not-allowed"
              />
              <button disabled className="p-1.5 rounded-lg text-slate-600 cursor-not-allowed" title="Voice input (coming soon)">
                <MicOff className="w-4 h-4" />
              </button>
            </div>
            <button
              disabled
              className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400/40 cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Side Panel */}
      {sidePanel && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-72 flex-shrink-0 space-y-4 hidden lg:block"
        >
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>
                Memory Context
              </h3>
            </div>
            <div className="flex flex-col items-center py-6 text-center">
              <Database className="w-6 h-6 text-slate-700 mb-2" />
              <p className="text-xs text-slate-600">No memory loaded</p>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>
                System State
              </h3>
            </div>
            <div className="flex flex-col items-center py-6 text-center">
              <Activity className="w-6 h-6 text-slate-700 mb-2" />
              <p className="text-xs text-slate-600">No state data</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
