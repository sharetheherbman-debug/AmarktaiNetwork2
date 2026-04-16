'use client'

/**
 * AppBuilderTab — Serious PWA / App Builder inside Studio.
 *
 * Multi-step flow for building production-ready AI apps:
 *   1. Define — Name, niche, purpose, description
 *   2. Configure — Choose pack, capabilities, routing profile
 *   3. Media — Choose default media/artifact settings
 *   4. Generate — AI-powered scaffold generation
 *   5. Export — Review & prepare for deployment
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Check, ChevronRight, ChevronLeft, Sparkles,
  Download, Rocket, Package, Brain, Shield,
  Globe, Palette, AlertCircle, FolderTree, FileCode,
  Copy,
} from 'lucide-react'

/* ── Types ────────────────────────────────────────────────────── */

interface ProjectTypeInfo {
  id: string; label: string; description: string; language: string; icon: string
}

interface GeneratedFile {
  path: string; content: string; language: string
}

interface GenerationSession {
  id: string; description: string; projectType: string; files: GeneratedFile[]
  history: Array<{ id: string; type: string; description: string; projectType: string; timestamp: string; fileCount: number }>
  createdAt: string; updatedAt: string; aiProvider?: string | null
}

/* ── Constants ────────────────────────────────────────────────── */

const STEPS = [
  { key: 'define',    label: 'Define',     icon: Globe },
  { key: 'configure', label: 'Configure',  icon: Brain },
  { key: 'media',     label: 'Media',      icon: Palette },
  { key: 'generate',  label: 'Generate',   icon: Sparkles },
  { key: 'export',    label: 'Export',      icon: Rocket },
] as const

type StepKey = (typeof STEPS)[number]['key']

const CAPABILITY_PACKS = [
  { id: '', label: 'None', desc: 'Start from scratch' },
  { id: 'support_pack', label: 'Support & Chat', desc: 'Customer support, live chat, FAQ bot' },
  { id: 'creator_pack', label: 'Creator / Media', desc: 'Image generation, video, voice, content' },
  { id: 'companion_pack', label: 'Companion', desc: 'Personal AI companion, coaching' },
  { id: 'research_pack', label: 'Research', desc: 'Deep research, web search, analysis' },
  { id: 'education_pack', label: 'Education', desc: 'Tutoring, quiz generation, learning' },
  { id: 'smart_home_pack', label: 'Smart Home', desc: 'IoT control, automation, monitoring' },
  { id: 'religious_pack', label: 'Religious / Spiritual', desc: 'Scripture, devotionals, ministry tools' },
  { id: 'health_pack', label: 'Health / Tracking', desc: 'Fitness, nutrition, wellness tracking' },
  { id: 'family_pack', label: 'Family / Personal', desc: 'Family assistant, scheduling, reminders' },
  { id: 'dev_pack', label: 'Developer / Eng', desc: 'Code generation, debugging, DevOps' },
  { id: 'voice_pack', label: 'Voice Assistant', desc: 'TTS, STT, voice-first interface' },
  { id: 'media_pack', label: 'Media Production', desc: 'Music, video editing, production pipeline' },
  { id: 'operations_pack', label: 'Operations', desc: 'Automation, monitoring, alerts' },
]

const NICHES = [
  'General', 'E-commerce', 'SaaS', 'Healthcare', 'Education', 'Finance',
  'Real Estate', 'Fitness', 'Church / Ministry', 'Music', 'Gaming',
  'Legal', 'Marketing', 'Travel', 'Food & Dining', 'Fashion',
  'Automotive', 'Construction', 'Agriculture', 'Nonprofit',
]

const ROUTING_PROFILES = [
  { id: 'balanced', label: 'Balanced', desc: 'Best mix of speed, quality, and cost' },
  { id: 'quality_first', label: 'Quality First', desc: 'Use the best model available regardless of cost' },
  { id: 'cost_optimized', label: 'Cost Optimized', desc: 'Minimize cost, use free tiers when possible' },
  { id: 'speed_first', label: 'Speed First', desc: 'Fastest response times, low-latency models' },
]

const CARD = 'bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl'

/* ── Component ────────────────────────────────────────────────── */

export default function AppBuilderTab() {
  const [step, setStep] = useState<StepKey>('define')
  const stepIdx = STEPS.findIndex(s => s.key === step)

  /* ── Form state ── */
  const [appName, setAppName] = useState('')
  const [appNiche, setAppNiche] = useState('General')
  const [appPurpose, setAppPurpose] = useState('')
  const [appDescription, setAppDescription] = useState('')
  const [projectType, setProjectType] = useState('nextjs')
  const [projectTypes, setProjectTypes] = useState<ProjectTypeInfo[]>([])
  const [capabilityPack, setCapabilityPack] = useState('')
  const [routingProfile, setRoutingProfile] = useState('balanced')
  const [safeMode, setSafeMode] = useState(true)
  const [styling, setStyling] = useState<'tailwind' | 'css-modules' | 'plain'>('tailwind')
  const [includeDocker, setIncludeDocker] = useState(true)
  const [includeAuth, setIncludeAuth] = useState(true)
  const [includePWA, setIncludePWA] = useState(true)

  /* ── Media defaults ── */
  const [defaultImageModel, setDefaultImageModel] = useState('auto')
  const [defaultVoiceGender, setDefaultVoiceGender] = useState<'male' | 'female' | 'neutral'>('neutral')
  const [enableVideo, setEnableVideo] = useState(false)
  const [enableMusic, setEnableMusic] = useState(false)

  /* ── Generation state ── */
  const [generating, setGenerating] = useState(false)
  const [session, setSession] = useState<GenerationSession | null>(null)
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ── Load project types ── */
  const loadProjectTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/labs?action=types')
      if (res.ok) { const data = await res.json(); setProjectTypes(data.types ?? []) }
    } catch { /* best-effort */ }
  }, [])

  useEffect(() => { loadProjectTypes() }, [loadProjectTypes])

  /* ── Navigation ── */
  const canNext = () => {
    if (step === 'define') return appName.trim().length > 0 && appPurpose.trim().length > 0
    return true
  }

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].key)
  }
  const goPrev = () => {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1].key)
  }

  /* ── Generate ── */
  const buildDescription = () => {
    const parts = [
      `Build a ${projectType} app called "${appName}".`,
      `Niche: ${appNiche}.`,
      `Purpose: ${appPurpose}.`,
    ]
    if (appDescription) parts.push(`Details: ${appDescription}`)
    if (capabilityPack) {
      const pack = CAPABILITY_PACKS.find(p => p.id === capabilityPack)
      if (pack) parts.push(`Capability pack: ${pack.label} (${pack.desc}).`)
    }
    parts.push(`Routing: ${routingProfile}. Safe mode: ${safeMode ? 'on' : 'off'}.`)
    if (includeAuth) parts.push('Include authentication (next-auth or iron-session).')
    if (includePWA) parts.push('Include PWA manifest and service worker.')
    if (enableVideo) parts.push('Include video generation capability.')
    if (enableMusic) parts.push('Include music generation capability.')
    return parts.join(' ')
  }

  const generate = useCallback(async () => {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/admin/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          description: buildDescription(),
          projectType,
          options: {
            includeDocker,
            styling,
            capabilityPack: capabilityPack || undefined,
          },
        }),
      })
      const data = await res.json().catch(() => ({ error: 'Failed to parse server response during app generation' }))
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setSession(data.session ?? null)
      if (data.session?.files?.length) setSelectedFile(data.session.files[0])
      setStep('export')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appName, appNiche, appPurpose, appDescription, projectType, capabilityPack, routingProfile, safeMode, includeDocker, includePWA, includeAuth, styling, enableVideo, enableMusic])

  const downloadAll = useCallback(() => {
    if (!session) return
    const text = session.files.map(f => `// === ${f.path} ===\n${f.content}`).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${appName.replace(/\s+/g, '-').toLowerCase()}-scaffold.txt`
    a.click(); URL.revokeObjectURL(url)
  }, [session, appName])

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Step progress */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const active = s.key === step
          const completed = i < stepIdx
          return (
            <div key={s.key} className="flex items-center gap-1">
              {i > 0 && <div className={`w-8 h-px ${completed ? 'bg-blue-500/50' : 'bg-white/[0.06]'}`} />}
              <button
                onClick={() => { if (completed || active) setStep(s.key) }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border transition-all
                  ${active
                    ? 'text-white bg-blue-500/10 border-blue-500/30'
                    : completed
                      ? 'text-blue-400 bg-white/[0.02] border-white/[0.06] cursor-pointer hover:bg-white/[0.04]'
                      : 'text-slate-500 bg-white/[0.01] border-white/[0.04] cursor-default'
                  }`}
              >
                {completed ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <s.icon className={`w-3.5 h-3.5 ${active ? 'text-blue-400' : ''}`} />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className={`${CARD} p-6`}>
        {/* ── STEP 1: Define ── */}
        {step === 'define' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Define Your App</h3>
              <p className="text-xs text-slate-500">Set the foundation — name, niche, and purpose.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">App Name *</label>
                <input value={appName} onChange={e => setAppName(e.target.value)}
                  placeholder="My AI App"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Niche</label>
                <select value={appNiche} onChange={e => setAppNiche(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all">
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Purpose *</label>
              <input value={appPurpose} onChange={e => setAppPurpose(e.target.value)}
                placeholder="e.g. Help users track fitness goals with AI coaching"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Description <span className="text-slate-600">(optional)</span></label>
              <textarea value={appDescription} onChange={e => setAppDescription(e.target.value)} rows={3}
                placeholder="Describe features, target audience, specific requirements…"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 resize-none transition-all" />
            </div>
          </div>
        )}

        {/* ── STEP 2: Configure ── */}
        {step === 'configure' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Configure Stack</h3>
              <p className="text-xs text-slate-500">Choose your framework, AI capabilities, and routing strategy.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Framework</label>
                <select value={projectType} onChange={e => setProjectType(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all">
                  {projectTypes.length > 0
                    ? projectTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)
                    : <option value="nextjs">Next.js</option>
                  }
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Styling</label>
                <select value={styling} onChange={e => setStyling(e.target.value as typeof styling)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all">
                  <option value="tailwind">Tailwind CSS</option>
                  <option value="css-modules">CSS Modules</option>
                  <option value="plain">Plain CSS</option>
                </select>
              </div>
            </div>

            {/* Capability Pack */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Capability Pack</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CAPABILITY_PACKS.map(pack => (
                  <button key={pack.id} onClick={() => setCapabilityPack(pack.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-all
                      ${capabilityPack === pack.id
                        ? 'bg-blue-500/10 border-blue-500/30 text-white'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}>
                    <div className="text-xs font-medium">{pack.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{pack.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Routing Profile */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> Routing Profile</label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {ROUTING_PROFILES.map(rp => (
                  <button key={rp.id} onClick={() => setRoutingProfile(rp.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-all
                      ${routingProfile === rp.id
                        ? 'bg-violet-500/10 border-violet-500/30 text-white'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}>
                    <div className="text-xs font-medium">{rp.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{rp.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Docker', checked: includeDocker, set: setIncludeDocker },
                { label: 'Authentication', checked: includeAuth, set: setIncludeAuth },
                { label: 'PWA Manifest', checked: includePWA, set: setIncludePWA },
                { label: 'Safe Mode', checked: safeMode, set: setSafeMode, icon: Shield },
              ].map(opt => (
                <label key={opt.label} className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input type="checkbox" checked={opt.checked} onChange={e => opt.set(e.target.checked)}
                    className="rounded border-slate-600 bg-transparent text-blue-500 focus:ring-blue-500/30" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Media ── */}
        {step === 'media' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Media & Artifacts</h3>
              <p className="text-xs text-slate-500">Configure default media generation settings for your app.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Default Image Model</label>
                <select value={defaultImageModel} onChange={e => setDefaultImageModel(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all">
                  <option value="auto">Auto (best available)</option>
                  <option value="dall-e-3">DALL·E 3</option>
                  <option value="flux">FLUX</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Default Voice Gender</label>
                <select value={defaultVoiceGender} onChange={e => setDefaultVoiceGender(e.target.value as typeof defaultVoiceGender)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all">
                  <option value="neutral">Neutral</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input type="checkbox" checked={enableVideo} onChange={e => setEnableVideo(e.target.checked)}
                  className="rounded border-slate-600 bg-transparent text-blue-500 focus:ring-blue-500/30" />
                Enable Video Generation
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input type="checkbox" checked={enableMusic} onChange={e => setEnableMusic(e.target.checked)}
                  className="rounded border-slate-600 bg-transparent text-blue-500 focus:ring-blue-500/30" />
                Enable Music Generation
              </label>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 text-xs text-slate-500">
              Media capabilities are auto-configured based on your connected providers.
              You can adjust these after deployment in App Settings.
            </div>
          </div>
        )}

        {/* ── STEP 4: Generate ── */}
        {step === 'generate' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Generate Scaffold</h3>
              <p className="text-xs text-slate-500">Review your configuration and generate the app scaffold with AI.</p>
            </div>

            {/* Config summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'App', value: appName },
                { label: 'Niche', value: appNiche },
                { label: 'Framework', value: projectType },
                { label: 'Pack', value: CAPABILITY_PACKS.find(p => p.id === capabilityPack)?.label ?? 'None' },
                { label: 'Routing', value: ROUTING_PROFILES.find(r => r.id === routingProfile)?.label ?? 'Balanced' },
                { label: 'Styling', value: styling },
              ].map(item => (
                <div key={item.label} className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5">
                  <div className="text-[10px] text-slate-500">{item.label}</div>
                  <div className="text-xs text-white font-medium mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={generate} disabled={generating}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:shadow-lg hover:shadow-blue-500/20 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Generating…' : 'Generate App Scaffold'}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Export ── */}
        {step === 'export' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Export & Deploy</h3>
                <p className="text-xs text-slate-500">
                  {session ? `${session.files.length} files generated` : 'Generate your scaffold first'}{session?.aiProvider ? ` via ${session.aiProvider}` : ''}
                </p>
              </div>
              {session && (
                <button onClick={downloadAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white hover:bg-white/[0.06] transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download All
                </button>
              )}
            </div>

            {session ? (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="flex min-h-[400px]">
                  {/* File tree */}
                  <div className="w-56 shrink-0 border-r border-white/[0.06] overflow-y-auto py-2">
                    {session.files.map(f => (
                      <button key={f.path} onClick={() => setSelectedFile(f)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors
                          ${selectedFile?.path === f.path ? 'bg-blue-500/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'}`}>
                        <FileCode className="w-3 h-3 shrink-0" />
                        <span className="truncate">{f.path}</span>
                      </button>
                    ))}
                  </div>
                  {/* Code viewer */}
                  <div className="flex-1 overflow-auto relative">
                    {selectedFile ? (
                      <>
                        <button
                          onClick={() => { navigator.clipboard.writeText(selectedFile.content); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                          className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors">
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <pre className="p-4 text-xs text-slate-300 overflow-auto"><code>{selectedFile.content}</code></pre>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-slate-500">Select a file to view</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderTree className="w-8 h-8 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">No scaffold generated yet.</p>
                <button onClick={() => setStep('generate')} className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Go to Generate step →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step navigation */}
      <div className="flex items-center justify-between">
        <button onClick={goPrev} disabled={stepIdx === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </button>
        {stepIdx < STEPS.length - 1 && (
          <button onClick={goNext} disabled={!canNext()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
