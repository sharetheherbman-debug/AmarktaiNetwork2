'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Code2, Image, Activity, Package,
  Send, Loader2, Play, Trash2,
  ChevronDown, Thermometer, RefreshCw,
  CheckCircle2, XCircle, Clock, Zap, ArrowRight,
  Terminal, Shield, Upload, Mic, Video, Eye,
  Layers, GitBranch, AlertTriangle, Info,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */

type WorkspaceTab = 'chat' | 'code' | 'multimodal' | 'traces' | 'pack-simulator'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model?: string
  provider?: string
  latencyMs?: number
  cost?: number
  timestamp: string
  trace?: RoutingTrace
}

interface RoutingTrace {
  traceId: string
  provider: string
  model: string
  latencyMs: number
  cost?: number
  fallbackUsed?: boolean
  fallbackChain?: string[]
  executionMode?: string
  confidenceScore?: number | null
}

interface ModelOption {
  provider: string
  model_id: string
  model_name: string
  primary_role: string
  supports_chat: boolean
  enabled: boolean
}

interface ProviderOption {
  providerKey: string
  displayName: string
  enabled: boolean
  healthStatus: string
  defaultModel: string
  fallbackModel: string
}

interface BrainEvent {
  id?: number
  traceId: string
  appSlug: string
  taskType: string
  executionMode: string
  routedProvider: string | null
  routedModel: string | null
  success: boolean
  latencyMs: number | null
  confidenceScore: number | null
  validationUsed: boolean
  consensusUsed: boolean
  errorMessage: string | null
  warnings?: string[]
  createdAt?: string
  timestamp?: string
}

interface CapabilityPack {
  id: string
  name: string
  slug: string
  description?: string
  capabilities?: string[]
  allowedProviders?: string[]
  allowedModels?: string[]
  maxTokens?: number
  rateLimit?: number
}

/* ─── Constants ──────────────────────────────────────────────── */

const TABS: { key: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { key: 'chat',           label: 'Chat',           icon: MessageSquare },
  { key: 'code',           label: 'Code',           icon: Code2 },
  { key: 'multimodal',     label: 'Multimodal',     icon: Image },
  { key: 'traces',         label: 'Traces',         icon: Activity },
  { key: 'pack-simulator', label: 'Pack Simulator', icon: Package },
]

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'go', 'rust',
  'json', 'html', 'css', 'sql', 'bash',
]

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/* ─── Glass Card Wrapper ─────────────────────────────────────── */

function Glass({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] ${className}`}>
      {children}
    </div>
  )
}

/* ─── Stat Pill ──────────────────────────────────────────────── */

function StatPill({ icon: Icon, label, value, color = 'text-zinc-400' }: {
  icon: React.ElementType; label: string; value: string | number; color?: string
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs">
      <Icon size={12} className={color} />
      <span className="text-zinc-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CHAT WORKSPACE
   ═══════════════════════════════════════════════════════════════ */

function ChatWorkspace({ models, providers }: { models: ModelOption[]; providers: ProviderOption[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [sending, setSending] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [lastTrace, setLastTrace] = useState<RoutingTrace | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const filteredModels = selectedProvider
    ? models.filter(m => m.provider === selectedProvider && m.enabled)
    : models.filter(m => m.enabled)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    const userMsg: ChatMessage = {
      id: uid(), role: 'user', content: text, timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    try {
      const body: Record<string, unknown> = { message: text, taskType: 'chat' }
      if (selectedProvider) body.providerKey = selectedProvider
      const res = await fetch('/api/admin/brain/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      const trace: RoutingTrace = {
        traceId: data.traceId ?? uid(),
        provider: data.routedProvider ?? 'unknown',
        model: data.routedModel ?? 'unknown',
        latencyMs: data.latencyMs ?? 0,
        fallbackUsed: data.fallbackUsed ?? false,
        executionMode: data.executionMode,
        confidenceScore: data.confidenceScore,
      }
      setLastTrace(trace)
      const assistantMsg: ChatMessage = {
        id: uid(), role: 'assistant',
        content: data.output ?? data.error ?? 'No response received.',
        model: trace.model, provider: trace.provider,
        latencyMs: trace.latencyMs, trace, timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: uid(), role: 'assistant', content: 'Request failed. Check connection or provider status.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
    }
  }, [input, sending, selectedProvider])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls Bar */}
      <Glass className="p-3 flex flex-wrap items-center gap-3">
        {/* Provider Selector */}
        <div className="relative">
          <select
            value={selectedProvider}
            onChange={e => { setSelectedProvider(e.target.value); setSelectedModel('') }}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-zinc-300 focus:outline-none focus:border-blue-500/40"
          >
            <option value="">Auto (best provider)</option>
            {providers.filter(p => p.enabled).map(p => (
              <option key={p.providerKey} value={p.providerKey}>{p.displayName}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>

        {/* Model Selector */}
        <div className="relative">
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-zinc-300 focus:outline-none focus:border-blue-500/40"
          >
            <option value="">Auto (best model)</option>
            {filteredModels.map(m => (
              <option key={m.model_id} value={m.model_id}>{m.model_name} ({m.provider})</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>

        {/* Temperature Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Thermometer size={13} /> {temperature.toFixed(1)}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setMessages([])}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Clear chat"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </Glass>

      {/* Temperature Slider */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <Glass className="p-3 flex items-center gap-4">
              <span className="text-xs text-zinc-500">Temperature</span>
              <input
                type="range" min={0} max={2} step={0.05} value={temperature}
                onChange={e => setTemperature(Number(e.target.value))}
                className="flex-1 accent-blue-500 h-1"
              />
              <span className="text-xs text-blue-400 font-mono w-8 text-right">{temperature.toFixed(2)}</span>
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Routing Trace Banner */}
      {lastTrace && (
        <Glass className="px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
          <GitBranch size={13} className="text-violet-400" />
          <span className="text-zinc-500">Last trace:</span>
          <span className="text-blue-400">{lastTrace.provider}</span>
          <ArrowRight size={11} className="text-zinc-600" />
          <span className="text-violet-400">{lastTrace.model}</span>
          <StatPill icon={Clock} label="" value={`${lastTrace.latencyMs}ms`} color="text-amber-400" />
          {lastTrace.fallbackUsed && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Fallback</span>
          )}
          {lastTrace.executionMode && (
            <span className="text-zinc-500">{lastTrace.executionMode}</span>
          )}
        </Glass>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            <MessageSquare size={32} strokeWidth={1.2} />
            <p className="text-sm">Send a message to begin testing</p>
          </div>
        )}
        {messages.map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100'
                : 'bg-white/[0.04] border border-white/[0.06] text-zinc-300'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.trace && (
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                  <StatPill icon={Layers} label="" value={msg.trace.provider} color="text-blue-400" />
                  <StatPill icon={Zap} label="" value={msg.trace.model} color="text-violet-400" />
                  <StatPill icon={Clock} label="" value={`${msg.trace.latencyMs}ms`} color="text-amber-400" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-white/[0.04] border border-white/[0.06]">
              <Loader2 size={16} className="animate-spin text-blue-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <Glass className="p-2 flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none px-3 py-2"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
        </button>
      </Glass>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CODE WORKSPACE
   ═══════════════════════════════════════════════════════════════ */

function CodeWorkspace() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [trace, setTrace] = useState<RoutingTrace | null>(null)

  const handleRun = useCallback(async () => {
    if (!code.trim() || running) return
    setRunning(true)
    setOutput('')
    setTrace(null)
    try {
      const res = await fetch('/api/admin/brain/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze this ${language} code and explain what it does, identify any bugs or improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``,
          taskType: 'code_analysis',
        }),
      })
      const data = await res.json()
      setTrace({
        traceId: data.traceId ?? uid(),
        provider: data.routedProvider ?? 'unknown',
        model: data.routedModel ?? 'unknown',
        latencyMs: data.latencyMs ?? 0,
        fallbackUsed: data.fallbackUsed ?? false,
        executionMode: data.executionMode,
      })
      setOutput(data.output ?? data.error ?? 'No analysis returned.')
    } catch {
      setOutput('Error: Failed to connect to brain gateway.')
    } finally {
      setRunning(false)
    }
  }, [code, language, running])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls */}
      <Glass className="p-3 flex items-center gap-3">
        <Terminal size={15} className="text-emerald-400" />
        <span className="text-sm text-zinc-300 font-medium">Code Analysis</span>
        <div className="relative ml-3">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/40"
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
        <button
          onClick={handleRun}
          disabled={running || !code.trim()}
          className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-sm transition-colors"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run
        </button>
      </Glass>

      {/* Trace */}
      {trace && (
        <Glass className="px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
          <GitBranch size={13} className="text-violet-400" />
          <span className="text-blue-400">{trace.provider}</span>
          <ArrowRight size={11} className="text-zinc-600" />
          <span className="text-violet-400">{trace.model}</span>
          <StatPill icon={Clock} label="" value={`${trace.latencyMs}ms`} color="text-amber-400" />
          {trace.fallbackUsed && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Fallback</span>
          )}
        </Glass>
      )}

      {/* Editor + Output */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <Glass className="p-0.5 flex flex-col min-h-0">
          <div className="px-3 py-2 text-xs text-zinc-500 border-b border-white/[0.06]">Input — {language}</div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={`Paste your ${language} code here...`}
            spellCheck={false}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-700 font-mono p-3 resize-none focus:outline-none min-h-0"
          />
        </Glass>
        <Glass className="p-0.5 flex flex-col min-h-0">
          <div className="px-3 py-2 text-xs text-zinc-500 border-b border-white/[0.06]">Output</div>
          <div className="flex-1 p-3 text-sm text-zinc-300 font-mono whitespace-pre-wrap overflow-y-auto min-h-0">
            {running && <Loader2 size={16} className="animate-spin text-emerald-400" />}
            {!running && !output && <span className="text-zinc-600">Analysis results will appear here...</span>}
            {!running && output}
          </div>
        </Glass>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MULTIMODAL WORKSPACE
   ═══════════════════════════════════════════════════════════════ */

function MultimodalWorkspace() {
  const [activeMode, setActiveMode] = useState<'image' | 'voice' | 'video'>('image')
  const [description, setDescription] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [trace, setTrace] = useState<RoutingTrace | null>(null)

  const modes = [
    { key: 'image' as const, label: 'Image Analysis', icon: Upload, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { key: 'voice' as const, label: 'Voice / Audio', icon: Mic, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { key: 'video' as const, label: 'Video Analysis', icon: Video, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ]

  const handleTest = useCallback(async () => {
    if (!description.trim() || running) return
    setRunning(true)
    setOutput('')
    setTrace(null)
    try {
      const res = await fetch('/api/admin/brain/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[Multimodal ${activeMode} test] ${description}`,
          taskType: `multimodal_${activeMode}`,
        }),
      })
      const data = await res.json()
      setTrace({
        traceId: data.traceId ?? uid(),
        provider: data.routedProvider ?? 'unknown',
        model: data.routedModel ?? 'unknown',
        latencyMs: data.latencyMs ?? 0,
        fallbackUsed: data.fallbackUsed ?? false,
        executionMode: data.executionMode,
      })
      setOutput(data.output ?? data.error ?? 'No response received.')
    } catch {
      setOutput('Error: Failed to connect to brain gateway.')
    } finally {
      setRunning(false)
    }
  }, [description, activeMode, running])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Mode Selector */}
      <Glass className="p-3 flex items-center gap-2">
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => setActiveMode(m.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
              activeMode === m.key
                ? `${m.bg} ${m.color} border border-current/20`
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
          >
            <m.icon size={15} />
            {m.label}
          </button>
        ))}
      </Glass>

      {/* Trace */}
      {trace && (
        <Glass className="px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
          <GitBranch size={13} className="text-violet-400" />
          <span className="text-blue-400">{trace.provider}</span>
          <ArrowRight size={11} className="text-zinc-600" />
          <span className="text-violet-400">{trace.model}</span>
          <StatPill icon={Clock} label="" value={`${trace.latencyMs}ms`} color="text-amber-400" />
        </Glass>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Input Panel */}
        <Glass className="p-4 flex flex-col gap-4 min-h-0">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            {activeMode === 'image' && <Upload size={15} className="text-pink-400" />}
            {activeMode === 'voice' && <Mic size={15} className="text-cyan-400" />}
            {activeMode === 'video' && <Video size={15} className="text-amber-400" />}
            <span className="font-medium capitalize">{activeMode} Testing</span>
          </div>

          {/* Upload Zone */}
          <div className="flex-none rounded-xl border-2 border-dashed border-white/[0.08] hover:border-white/[0.15] p-6 flex flex-col items-center gap-2 text-center transition-colors cursor-pointer">
            <Upload size={24} className="text-zinc-600" />
            <p className="text-xs text-zinc-500">
              {activeMode === 'image' && 'Upload an image (PNG, JPG, WebP) for vision analysis'}
              {activeMode === 'voice' && 'Upload audio (MP3, WAV) for speech-to-text / analysis'}
              {activeMode === 'video' && 'Upload video (MP4, WebM) for frame-by-frame analysis'}
            </p>
            <p className="text-[10px] text-zinc-700 mt-1">File upload routed through multimodal-capable providers only</p>
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the test or provide a prompt for the multimodal model..."
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-zinc-200 placeholder:text-zinc-700 p-3 resize-none focus:outline-none focus:border-blue-500/30 min-h-[80px]"
          />

          <button
            onClick={handleTest}
            disabled={running || !description.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-sm transition-colors"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Test {activeMode}
          </button>
        </Glass>

        {/* Output Panel */}
        <Glass className="p-0.5 flex flex-col min-h-0">
          <div className="px-3 py-2 text-xs text-zinc-500 border-b border-white/[0.06] flex items-center gap-2">
            <Eye size={12} /> Response
          </div>
          <div className="flex-1 p-4 text-sm text-zinc-300 whitespace-pre-wrap overflow-y-auto min-h-0">
            {running && <Loader2 size={16} className="animate-spin text-violet-400" />}
            {!running && !output && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                <Image size={28} strokeWidth={1.2} />
                <p className="text-xs">Multimodal test results will appear here</p>
              </div>
            )}
            {!running && output}
          </div>
        </Glass>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TRACES WORKSPACE
   ═══════════════════════════════════════════════════════════════ */

function TracesWorkspace() {
  const [events, setEvents] = useState<BrainEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<BrainEvent | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/brain/events')
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 min-h-0">
      {/* Event List */}
      <Glass className="lg:w-[380px] flex-none flex flex-col min-h-0">
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-sm text-zinc-300 font-medium">Recent Routing Traces</span>
          <button onClick={loadEvents} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && events.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-zinc-600" />
            </div>
          )}
          {events.map((ev, i) => (
            <button
              key={ev.traceId + i}
              onClick={() => setSelected(ev)}
              className={`w-full text-left px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${
                selected?.traceId === ev.traceId ? 'bg-white/[0.06]' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {ev.success
                  ? <CheckCircle2 size={13} className="text-emerald-400 flex-none" />
                  : <XCircle size={13} className="text-red-400 flex-none" />
                }
                <span className="text-xs text-zinc-300 truncate">{ev.taskType}</span>
                <span className="ml-auto text-[10px] text-zinc-600 font-mono">{ev.latencyMs ?? '\u2014'}ms</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
                <span className="text-blue-400/70">{ev.routedProvider ?? '\u2014'}</span>
                <ArrowRight size={9} />
                <span className="text-violet-400/70">{ev.routedModel ?? '\u2014'}</span>
              </div>
            </button>
          ))}
          {!loading && events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
              <Activity size={24} strokeWidth={1.2} />
              <p className="text-xs">No traces recorded yet</p>
            </div>
          )}
        </div>
      </Glass>

      {/* Trace Detail */}
      <Glass className="flex-1 p-4 overflow-y-auto min-h-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            <Activity size={32} strokeWidth={1.2} />
            <p className="text-sm">Select a trace to view routing details</p>
          </div>
        ) : (
          <motion.div
            key={selected.traceId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              {selected.success
                ? <CheckCircle2 size={18} className="text-emerald-400" />
                : <XCircle size={18} className="text-red-400" />
              }
              <span className="text-lg text-zinc-200 font-medium">{selected.taskType}</span>
              <span className={`ml-auto text-xs px-2.5 py-1 rounded-full ${
                selected.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {selected.success ? 'Success' : 'Failed'}
              </span>
            </div>

            {/* Routing Chain */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Routing Chain</p>
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {selected.routedProvider ?? '\u2014'}
                </span>
                <ArrowRight size={16} className="text-zinc-600" />
                <span className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {selected.routedModel ?? '\u2014'}
                </span>
                <ArrowRight size={16} className="text-zinc-600" />
                <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {selected.latencyMs ?? '\u2014'}ms
                </span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Trace ID', value: selected.traceId.slice(0, 12) + '\u2026', icon: GitBranch, color: 'text-zinc-400' },
                { label: 'Execution Mode', value: selected.executionMode, icon: Layers, color: 'text-blue-400' },
                { label: 'Latency', value: `${selected.latencyMs ?? 0}ms`, icon: Clock, color: 'text-amber-400' },
                { label: 'Confidence', value: selected.confidenceScore != null ? `${(selected.confidenceScore * 100).toFixed(0)}%` : '\u2014', icon: Zap, color: 'text-emerald-400' },
                { label: 'Validation', value: selected.validationUsed ? 'Yes' : 'No', icon: Shield, color: 'text-cyan-400' },
                { label: 'Consensus', value: selected.consensusUsed ? 'Yes' : 'No', icon: GitBranch, color: 'text-violet-400' },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    <item.icon size={11} className={item.color} />
                    {item.label}
                  </div>
                  <p className={`text-sm font-medium ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Error */}
            {selected.errorMessage && (
              <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-4">
                <div className="flex items-center gap-2 text-xs text-red-400 mb-2">
                  <AlertTriangle size={13} /> Error Details
                </div>
                <p className="text-sm text-red-300 font-mono">{selected.errorMessage}</p>
              </div>
            )}

            {/* Warnings */}
            {selected.warnings && selected.warnings.length > 0 && (
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4">
                <div className="flex items-center gap-2 text-xs text-amber-400 mb-2">
                  <AlertTriangle size={13} /> Warnings
                </div>
                {selected.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-300">{w}</p>
                ))}
              </div>
            )}

            {/* Timestamp */}
            {(selected.createdAt ?? selected.timestamp) && (
              <p className="text-[11px] text-zinc-600">
                Created: {new Date(selected.createdAt ?? selected.timestamp ?? '').toLocaleString()}
              </p>
            )}
          </motion.div>
        )}
      </Glass>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PACK SIMULATOR WORKSPACE
   ═══════════════════════════════════════════════════════════════ */

function PackSimulatorWorkspace() {
  const [packs, setPacks] = useState<CapabilityPack[]>([])
  const [selectedPack, setSelectedPack] = useState<CapabilityPack | null>(null)
  const [loading, setLoading] = useState(true)
  const [simInput, setSimInput] = useState('')
  const [simResult, setSimResult] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [simTrace, setSimTrace] = useState<RoutingTrace | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/app-discovery')
        const data = await res.json()
        setPacks(data.packs ?? [])
      } catch { /* silent */ }
      setLoading(false)
    })()
  }, [])

  const handleSimulate = useCallback(async () => {
    if (!simInput.trim() || !selectedPack || simulating) return
    setSimulating(true)
    setSimResult('')
    setSimTrace(null)
    try {
      const res = await fetch('/api/admin/brain/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[Pack: ${selectedPack.name}] ${simInput}`,
          taskType: 'pack_simulation',
        }),
      })
      const data = await res.json()
      setSimTrace({
        traceId: data.traceId ?? uid(),
        provider: data.routedProvider ?? 'unknown',
        model: data.routedModel ?? 'unknown',
        latencyMs: data.latencyMs ?? 0,
        fallbackUsed: data.fallbackUsed ?? false,
        executionMode: data.executionMode,
      })
      setSimResult(data.output ?? data.error ?? 'No response.')
    } catch {
      setSimResult('Error: Simulation request failed.')
    } finally {
      setSimulating(false)
    }
  }, [simInput, selectedPack, simulating])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Pack Selector */}
      <Glass className="p-3 flex flex-wrap items-center gap-3">
        <Package size={15} className="text-violet-400" />
        <span className="text-sm text-zinc-300 font-medium">Capability Pack</span>
        <div className="relative ml-2">
          <select
            value={selectedPack?.id ?? ''}
            onChange={e => setSelectedPack(packs.find(p => p.id === e.target.value) ?? null)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-zinc-300 focus:outline-none focus:border-violet-500/40"
          >
            <option value="">Select a pack...</option>
            {packs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
        {loading && <Loader2 size={14} className="animate-spin text-zinc-500 ml-2" />}
      </Glass>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Pack Details */}
        <div className="flex flex-col gap-4 min-h-0">
          {selectedPack ? (
            <Glass className="p-4 space-y-4 flex-none">
              <div>
                <h3 className="text-sm font-medium text-zinc-200">{selectedPack.name}</h3>
                {selectedPack.description && (
                  <p className="text-xs text-zinc-500 mt-1">{selectedPack.description}</p>
                )}
              </div>

              {selectedPack.capabilities && selectedPack.capabilities.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPack.capabilities.map(c => (
                      <span key={c} className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs border border-violet-500/20">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPack.allowedProviders && selectedPack.allowedProviders.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Allowed Providers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPack.allowedProviders.map(p => (
                      <span key={p} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPack.allowedModels && selectedPack.allowedModels.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Allowed Models</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPack.allowedModels.map(m => (
                      <span key={m} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs border border-cyan-500/20">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 text-xs text-zinc-500">
                {selectedPack.maxTokens != null && <span>Max tokens: <span className="text-zinc-400">{selectedPack.maxTokens.toLocaleString()}</span></span>}
                {selectedPack.rateLimit != null && <span>Rate limit: <span className="text-zinc-400">{selectedPack.rateLimit}/min</span></span>}
              </div>
            </Glass>
          ) : (
            <Glass className="p-4 flex flex-col items-center justify-center flex-1 text-zinc-600 gap-2">
              <Package size={28} strokeWidth={1.2} />
              <p className="text-xs">Select a capability pack to inspect</p>
            </Glass>
          )}

          {/* Simulation Input */}
          {selectedPack && (
            <Glass className="p-4 flex flex-col gap-3 flex-1 min-h-0">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Simulate Request</p>
              <textarea
                value={simInput}
                onChange={e => setSimInput(e.target.value)}
                placeholder="Enter a test prompt to route through this pack..."
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-zinc-200 placeholder:text-zinc-700 p-3 resize-none focus:outline-none focus:border-violet-500/30 min-h-[60px]"
              />
              <button
                onClick={handleSimulate}
                disabled={simulating || !simInput.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-sm transition-colors"
              >
                {simulating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Simulate Routing
              </button>
            </Glass>
          )}
        </div>

        {/* Simulation Output */}
        <Glass className="flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-white/[0.06] text-xs text-zinc-500 flex items-center gap-2">
            <Eye size={12} /> Simulation Result
          </div>

          {/* Sim Trace */}
          {simTrace && (
            <div className="px-3 py-2 border-b border-white/[0.06] flex flex-wrap items-center gap-2 text-xs">
              <GitBranch size={12} className="text-violet-400" />
              <span className="text-blue-400">{simTrace.provider}</span>
              <ArrowRight size={10} className="text-zinc-600" />
              <span className="text-violet-400">{simTrace.model}</span>
              <StatPill icon={Clock} label="" value={`${simTrace.latencyMs}ms`} color="text-amber-400" />
              {simTrace.fallbackUsed && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">Fallback</span>
              )}
            </div>
          )}

          <div className="flex-1 p-4 text-sm text-zinc-300 whitespace-pre-wrap overflow-y-auto min-h-0">
            {simulating && <Loader2 size={16} className="animate-spin text-violet-400" />}
            {!simulating && !simResult && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                <Layers size={28} strokeWidth={1.2} />
                <p className="text-xs text-center">Simulation output will appear here.<br />Select a pack and send a test prompt.</p>
              </div>
            )}
            {!simulating && simResult}
          </div>
        </Glass>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat')
  const [models, setModels] = useState<ModelOption[]>([])
  const [providers, setProviders] = useState<ProviderOption[]>([])

  useEffect(() => {
    const load = async () => {
      const [modelsRes, providersRes] = await Promise.all([
        fetch('/api/admin/models?enabled=true').then(r => r.json()).catch(() => ({ models: [] })),
        fetch('/api/admin/providers').then(r => r.json()).catch(() => []),
      ])
      setModels(modelsRes.models ?? [])
      setProviders(Array.isArray(providersRes) ? providersRes : providersRes.providers ?? [])
    }
    load()
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 lg:p-6 gap-4">
      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            <Terminal size={20} className="text-blue-400" />
            Dev Lab
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Full-access AI testing playground &mdash; all providers &amp; models</p>
        </div>

        {/* Safety Note */}
        <div className="sm:ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-400/80">
          <Shield size={13} />
          <span>Legal &amp; safety hard blocks remain active</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-none flex items-center gap-1 p-1 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="playground-tab-bg"
                className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/[0.08]"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              />
            )}
            <tab.icon size={15} className="relative z-10" />
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Workspace Content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeTab === 'chat'           && <ChatWorkspace models={models} providers={providers} />}
            {activeTab === 'code'           && <CodeWorkspace />}
            {activeTab === 'multimodal'     && <MultimodalWorkspace />}
            {activeTab === 'traces'         && <TracesWorkspace />}
            {activeTab === 'pack-simulator' && <PackSimulatorWorkspace />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Provider Stats Footer */}
      <div className="flex-none flex flex-wrap items-center gap-3 text-[11px] text-zinc-600">
        <Info size={12} />
        <span>{models.length} model{models.length !== 1 ? 's' : ''} loaded</span>
        <span className="text-zinc-800">&bull;</span>
        <span>{providers.filter(p => p.enabled).length} provider{providers.filter(p => p.enabled).length !== 1 ? 's' : ''} active</span>
        <span className="text-zinc-800">&bull;</span>
        <span>Routing traces visible on every request</span>
      </div>
    </div>
  )
}
