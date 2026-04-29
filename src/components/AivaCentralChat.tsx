'use client'

/**
 * AivaCentralChat — The main AIVA workspace experience.
 *
 * Aiva is the brain of AmarktAI. This component is the ONE interface
 * users interact with to:
 *   - chat naturally
 *   - give commands
 *   - generate content (images, music, video, code)
 *   - trigger app workflows
 *   - navigate to specialist tools
 *
 * Structure:
 *   - Quick Actions bar (top)
 *   - Chat messages (center, scrollable)
 *   - Input bar (bottom)
 *   - Output panel (inline in messages)
 *   - Active task indicator
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Loader2,
  FolderGit2,
  Music,
  ImageIcon,
  Film,
  Code2,
  Workflow,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AivaMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  acknowledgment?: string
  result?: string
  capabilityUsed?: string
  outputType?: string
  jobId?: string
  artifactId?: string
  navigateTo?: string
  sectionLabel?: string
  warning?: string
  error?: string
  success?: boolean
  pending?: boolean
}

interface RunResponse {
  result?: string
  acknowledgment?: string
  capabilityUsed?: string
  outputType?: string
  sessionId?: string
  jobId?: string
  artifactId?: string
  fallbackUsed?: boolean
  warning?: string
  provider?: string
  model?: string
  success?: boolean
  navigateTo?: string
  sectionLabel?: string
  error?: string
}

interface QuickAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  prompt: string
  appHint?: string
  accent: string
}

export interface AivaCentralChatProps {
  /** Called when Aiva wants to navigate to a workspace tab */
  onNavigate?: (tab: string) => void
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Repo Workbench',
    icon: FolderGit2,
    prompt: 'Fix my repo',
    appHint: 'repo',
    accent: 'border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-300 hover:bg-emerald-500/[0.14]',
  },
  {
    label: 'Music Studio',
    icon: Music,
    prompt: 'Create a song',
    appHint: 'music',
    accent: 'border-amber-500/30 bg-amber-500/[0.07] text-amber-300 hover:bg-amber-500/[0.14]',
  },
  {
    label: 'Image Generator',
    icon: ImageIcon,
    prompt: 'Generate an image',
    appHint: 'image',
    accent: 'border-blue-500/30 bg-blue-500/[0.07] text-blue-300 hover:bg-blue-500/[0.14]',
  },
  {
    label: 'Video Generator',
    icon: Film,
    prompt: 'Create a video',
    appHint: 'video',
    accent: 'border-rose-500/30 bg-rose-500/[0.07] text-rose-300 hover:bg-rose-500/[0.14]',
  },
  {
    label: 'Code Builder',
    icon: Code2,
    prompt: 'Write code',
    appHint: 'code',
    accent: 'border-violet-500/30 bg-violet-500/[0.07] text-violet-300 hover:bg-violet-500/[0.14]',
  },
  {
    label: 'Workflows',
    icon: Workflow,
    prompt: 'Build a workflow',
    appHint: 'workflow',
    accent: 'border-cyan-500/30 bg-cyan-500/[0.07] text-cyan-300 hover:bg-cyan-500/[0.14]',
  },
]

// ── Capability badge labels ────────────────────────────────────────────────────

const CAPABILITY_LABELS: Record<string, { label: string; color: string }> = {
  chat:            { label: 'Chat',          color: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20' },
  code:            { label: 'Code',          color: 'text-violet-300 bg-violet-400/10 border-violet-400/20' },
  image_generation:{ label: 'Image',         color: 'text-blue-300 bg-blue-400/10 border-blue-400/20' },
  video_generation:{ label: 'Video',         color: 'text-rose-300 bg-rose-400/10 border-rose-400/20' },
  music_generation:{ label: 'Music',         color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
  repo_workbench:  { label: 'Repo',          color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
  deploy_plan:     { label: 'Deploy Plan',   color: 'text-indigo-300 bg-indigo-400/10 border-indigo-400/20' },
  research:        { label: 'Research',      color: 'text-teal-300 bg-teal-400/10 border-teal-400/20' },
  app_build:       { label: 'App Builder',   color: 'text-orange-300 bg-orange-400/10 border-orange-400/20' },
  workflow:        { label: 'Workflow',       color: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20' },
}

// ── Welcome suggestions ───────────────────────────────────────────────────────

const WELCOME_SUGGESTIONS = [
  'Fix my repo',
  'Create a sad piano song',
  'Generate a futuristic logo',
  'Build a landing page',
  'Create a cinematic city video',
  'Audit my system',
]

// ── Output Renderer ───────────────────────────────────────────────────────────

function OutputRenderer({ msg }: { msg: AivaMessage }) {
  if (!msg.result && !msg.content) return null

  const displayContent = msg.acknowledgment || msg.content

  return (
    <div className="space-y-2">
      {/* Main response text */}
      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{displayContent}</p>

      {/* Raw result for non-text output */}
      {msg.result && msg.outputType && msg.outputType !== 'text' && msg.result !== displayContent && (
        <div className="mt-2 rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
          {msg.outputType === 'image' && msg.result.startsWith('http') && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={msg.result} alt="Generated" className="max-w-full rounded-lg" />
          )}
          {msg.outputType === 'audio' && msg.result.startsWith('http') && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio controls src={msg.result} className="w-full" />
          )}
          {(msg.outputType === 'code' || msg.outputType === 'markdown' || msg.outputType === 'text') && (
            <pre className="text-xs text-slate-300 overflow-auto max-h-64 whitespace-pre-wrap">{msg.result}</pre>
          )}
          {msg.outputType === 'video' && msg.jobId && (
            <p className="text-xs text-slate-400">Video job queued — ID: <code className="text-cyan-300">{msg.jobId}</code></p>
          )}
        </div>
      )}

      {/* Navigate action */}
      {msg.navigateTo && msg.sectionLabel && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-slate-400">Ready to open:</span>
          <span className="text-xs font-medium text-cyan-300 border border-cyan-400/20 bg-cyan-400/[0.07] rounded-lg px-2 py-0.5">
            {msg.sectionLabel}
          </span>
        </div>
      )}

      {/* Artifact link */}
      {msg.artifactId && (
        <a
          href="/admin/dashboard/artifacts"
          className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View in Artifacts
        </a>
      )}

      {/* Warning */}
      {msg.warning && (
        <p className="text-xs text-amber-400/80 flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          {msg.warning}
        </p>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AivaCentralChat({ onNavigate }: AivaCentralChatProps) {
  const [messages, setMessages] = useState<AivaMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [activeJob, setActiveJob] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [inputRows, setInputRows] = useState(1)

  const removePendingMessages = useCallback(
    (prev: AivaMessage[]) => prev.filter((m: AivaMessage) => !m.pending),
    [],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const lineCount = (e.target.value.match(/\n/g) ?? []).length + 1
    setInputRows(Math.min(lineCount, 5))
  }, [])

  const send = useCallback(async (text: string, appHint?: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMsg: AivaMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    const pendingMsg: AivaMessage = {
      id: `pending-${Date.now()}`,
      role: 'assistant',
      content: '',
      pending: true,
    }

    setMessages((prev: AivaMessage[]) => [...prev, userMsg, pendingMsg])
    setInput('')
    setInputRows(1)
    setSending(true)

    try {
      const res = await fetch('/api/aiva/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          appHint,
        }),
      })

      const data: RunResponse = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))

      if (data.sessionId) setSessionId(data.sessionId)
      if (data.jobId) setActiveJob(data.jobId)

      const assistantMsg: AivaMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.acknowledgment ?? data.result ?? data.error ?? 'No response.',
        acknowledgment: data.acknowledgment,
        result: data.result,
        capabilityUsed: data.capabilityUsed,
        outputType: data.outputType,
        jobId: data.jobId,
        artifactId: data.artifactId,
        navigateTo: data.navigateTo,
        sectionLabel: data.sectionLabel,
        warning: data.warning,
        error: data.error,
        success: data.success,
        pending: false,
      }

      setMessages((prev: AivaMessage[]) => removePendingMessages(prev).concat(assistantMsg))

      // Auto-navigate when Aiva routes to a section
      if (data.navigateTo && onNavigate) {
        setTimeout(() => onNavigate(data.navigateTo!), 800)
      }
    } catch (err) {
      setMessages((prev: AivaMessage[]) => removePendingMessages(prev).concat({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Request failed.',
        error: 'Request failed',
      }))
    } finally {
      setSending(false)
    }
  }, [sending, sessionId, onNavigate, removePendingMessages])

  const handleSubmit = useCallback(() => {
    if (input.trim()) send(input)
  }, [input, send])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleQuickAction = useCallback((qa: QuickAction) => {
    send(qa.prompt, qa.appHint)
  }, [send])

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full min-h-[600px]">

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 pb-4">
        {QUICK_ACTIONS.map(qa => (
          <button
            key={qa.label}
            onClick={() => handleQuickAction(qa)}
            disabled={sending}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${qa.accent}`}
          >
            <qa.icon className="h-3.5 w-3.5" />
            {qa.label}
          </button>
        ))}
      </div>

      {/* ── Chat Area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/[0.07] bg-[#060d1f]/60 backdrop-blur-sm">

        {/* Empty state */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
            <div className="relative mb-6">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="absolute -inset-3 rounded-3xl bg-cyan-500/5 blur-xl" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Tell Aiva what you want to do</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-8">
              Aiva understands your intent and routes to the right capability automatically.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {WELCOME_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  className="text-left px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.02] text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] hover:border-white/[0.14] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {hasMessages && (
          <div className="p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg: AivaMessage) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Aiva avatar */}
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/20 flex items-center justify-center mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    </div>
                  )}

                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-cyan-500/10 border border-cyan-400/20 text-slate-200'
                          : 'bg-white/[0.04] border border-white/[0.07] text-slate-200'
                      }`}
                    >
                      {msg.pending ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span className="text-xs">Aiva is thinking…</span>
                        </div>
                      ) : msg.role === 'assistant' ? (
                        <OutputRenderer msg={msg} />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    {/* Capability badge + status */}
                    {msg.role === 'assistant' && !msg.pending && msg.capabilityUsed && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {CAPABILITY_LABELS[msg.capabilityUsed] && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CAPABILITY_LABELS[msg.capabilityUsed].color}`}>
                            {CAPABILITY_LABELS[msg.capabilityUsed].label}
                          </span>
                        )}
                        {msg.success === true && !msg.navigateTo && (
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                        )}
                        {msg.success === false && (
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                        )}
                        {/* Navigate button */}
                        {msg.navigateTo && onNavigate && (
                          <button
                            onClick={() => onNavigate(msg.navigateTo!)}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20 transition-colors"
                          >
                            Open {msg.sectionLabel ?? msg.navigateTo} →
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <div className="h-7 w-7 shrink-0 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400">U</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Active Job Indicator ────────────────────────────────────────────── */}
      <AnimatePresence>
        {(sending || activeJob) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] text-xs text-cyan-300"
          >
            {sending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Aiva is working…</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Job running · ID: {activeJob}</span>
                <button
                  onClick={() => setActiveJob(null)}
                  className="ml-auto text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Bar ──────────────────────────────────────────────────────── */}
      <div className="mt-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/[0.1] bg-[#060d1f]/80 backdrop-blur-sm px-4 py-3 focus-within:border-cyan-400/30 transition-colors">
          <textarea
            ref={inputRef}
            rows={inputRows}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Tell Aiva what you want to do…"
            disabled={sending}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 resize-none focus:outline-none leading-5 min-h-[20px]"
          />
          <div className="flex items-center gap-1 pb-0.5">
            <button
              disabled={sending || !input.trim()}
              onClick={handleSubmit}
              className="rounded-xl bg-cyan-500/10 border border-cyan-400/20 p-2 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-40 transition-colors"
              title="Send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-600 text-center">
          Aiva uses GenX-first routing. <kbd className="text-slate-700">Enter</kbd> to send · <kbd className="text-slate-700">Shift+Enter</kbd> for newline
        </p>
      </div>
    </div>
  )
}
