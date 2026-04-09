'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Bot, Globe, Brain, Shield, MessageSquare, BookOpen,
  RefreshCw, CheckCircle, AlertCircle, Loader2, Zap, Users, Heart,
  Search, Sparkles,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────── */
interface AppAgentConfig {
  id: string
  appSlug: string
  appName: string
  appUrl: string
  appType: string
  purpose: string
  active: boolean
  tone: string
  responseLength: string
  creativity: string
  mustShowSourceForQuotes: boolean
  mustUseTrustedSources: boolean
  canAnswerWithoutSource: string
  separateQuoteFromExplanation: boolean
  adultMode: boolean
  sensitiveTopicMode: string
  mustHandoffSeriousTopics: boolean
  topicsNeedingCare: string[]
  humanExpertAvailable: boolean
  handoffTriggers: string[]
  humanContactMethod: string
  knowledgeCategories: string[]
  knowledgeNotes: string
  mustAlwaysDo: string[]
  mustNeverDo: string[]
  adminNotes: string
  budgetMode: string
  allowPremiumOnlyWhenNeeded: boolean
  learningEnabled: boolean
  autoImprovementEnabled: boolean
  adminReviewRequired: boolean
  religiousMode: string
  religiousBranch: string
  approvedSourcePacks: string[]
  doctrineAwareRouting: boolean
  crawlStatus: string
}

/* ── Config ────────────────────────────────────────────────── */
const glass = 'bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl'
const inputCls = 'w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all'
const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5 tracking-wide'
const selectCls = 'w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer'
const toggleCls = (on: boolean) =>
  `relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${on ? 'bg-violet-500' : 'bg-white/10'}`
const toggleDot = (on: boolean) =>
  `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'warm', label: 'Warm' },
  { value: 'professional', label: 'Professional' },
  { value: 'playful', label: 'Playful' },
]

const RESPONSE_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short answers' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
]

const CREATIVITY_OPTIONS = [
  { value: 'creative', label: 'Creative' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'strictly_factual', label: 'Strictly factual' },
]

const SOURCE_OPTIONS = [
  { value: 'never', label: 'Never — always needs a source' },
  { value: 'sometimes', label: 'Sometimes — prefer source' },
  { value: 'allowed', label: 'Allowed — can answer freely' },
]

const SENSITIVE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'strict', label: 'Strict' },
  { value: 'very_strict', label: 'Very strict' },
]

const BUDGET_OPTIONS = [
  { value: 'low_cost', label: 'Low cost — use cheap models' },
  { value: 'balanced', label: 'Balanced — smart model selection' },
  { value: 'best_quality', label: 'Best quality — use premium models' },
]

const RELIGIOUS_OPTIONS = [
  { value: 'none', label: 'Not a religious app' },
  { value: 'christian', label: 'Christian' },
  { value: 'muslim', label: 'Muslim' },
  { value: 'multi_faith', label: 'Multi-faith' },
]

const APP_TYPE_OPTIONS = [
  'general', 'ecommerce', 'finance', 'health', 'education', 'religious',
  'travel', 'social', 'support', 'creative', 'developer', 'companion',
  'pets', 'security', 'media', 'marketing',
]

const KNOWLEDGE_CATEGORIES = [
  'Product docs', 'Help articles', 'FAQs', 'Blog content', 'Legal docs',
  'Religious texts', 'Training materials', 'Research papers', 'Policy docs',
  'User guides', 'API docs', 'Community content',
]

const MUST_ALWAYS_OPTIONS = [
  'Show sources for quotes', 'Be respectful and careful', 'Protect user privacy',
  'Follow brand voice guidelines', 'Offer to help further', 'Disclose AI limitations',
  'Check facts before answering', 'Use simple language', 'Recommend experts when unsure',
]

const MUST_NEVER_OPTIONS = [
  'Give medical advice', 'Give legal advice', 'Share personal data',
  'Make up facts or sources', 'Use offensive language', 'Discuss competitors negatively',
  'Make promises on behalf of the company', 'Skip safety checks', 'Guess scripture references',
]

const TOPICS_NEEDING_CARE = [
  'Mental health', 'Self-harm', 'Medical symptoms', 'Legal issues',
  'Financial advice', 'Religious rulings', 'Political topics', 'Discrimination',
  'Violence', 'Substance abuse', 'Grief and loss', 'Relationship conflicts',
]

const HANDOFF_TRIGGERS = [
  'User seems distressed', 'Medical emergency mentioned', 'Legal question',
  'Complex religious ruling', 'Financial decision', 'Complaint escalation',
  'User explicitly asks for a human', 'Safety concern detected',
]

/* ── Component ─────────────────────────────────────────────── */
export default function AppAgentDetailPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const isNew = slug === 'new'

  const [agent, setAgent] = useState<Partial<AppAgentConfig>>({
    appName: '', appSlug: '', appUrl: '', appType: 'general', purpose: '', active: true,
    tone: 'professional', responseLength: 'balanced', creativity: 'balanced',
    mustShowSourceForQuotes: false, mustUseTrustedSources: false, canAnswerWithoutSource: 'sometimes',
    separateQuoteFromExplanation: false, adultMode: false, sensitiveTopicMode: 'standard',
    mustHandoffSeriousTopics: false, topicsNeedingCare: [], humanExpertAvailable: false,
    handoffTriggers: [], humanContactMethod: '', knowledgeCategories: [], knowledgeNotes: '',
    mustAlwaysDo: [], mustNeverDo: [], adminNotes: '', budgetMode: 'balanced',
    allowPremiumOnlyWhenNeeded: true, learningEnabled: false, autoImprovementEnabled: false,
    adminReviewRequired: true, religiousMode: 'none', religiousBranch: '',
    approvedSourcePacks: [], doctrineAwareRouting: false,
  })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [crawling, setCrawling] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchAgent = useCallback(async () => {
    if (isNew) return
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/app-agents/${slug}`)
      if (!res.ok) throw new Error('Agent not found')
      const data = await res.json()
      setAgent(data.agent)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load' })
    } finally {
      setLoading(false)
    }
  }, [slug, isNew])

  useEffect(() => { fetchAgent() }, [fetchAgent])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const url = isNew ? '/api/admin/app-agents' : `/api/admin/app-agents/${slug}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setAgent(data.agent)
      setMessage({ type: 'success', text: isNew ? 'Agent created!' : 'Settings saved!' })
      if (isNew && data.agent?.appSlug) {
        window.history.replaceState(null, '', `/admin/dashboard/app-agents/${data.agent.appSlug}`)
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const triggerCrawl = async () => {
    setCrawling(true)
    try {
      const res = await fetch(`/api/admin/app-agents/${agent.appSlug}/crawl`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Crawl failed')
      setMessage({ type: 'success', text: `Crawl complete! Detected niche: ${data.crawl?.detectedNiche ?? 'unknown'}` })
      fetchAgent()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Crawl failed' })
    } finally {
      setCrawling(false)
    }
  }

  const update = <K extends keyof AppAgentConfig>(key: K, value: AppAgentConfig[K]) => {
    setAgent(prev => ({ ...prev, [key]: value }))
  }

  const toggleInArray = (key: 'topicsNeedingCare' | 'handoffTriggers' | 'knowledgeCategories' | 'mustAlwaysDo' | 'mustNeverDo' | 'approvedSourcePacks', value: string) => {
    setAgent(prev => {
      const arr = (prev[key] as string[]) ?? []
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="mb-8">
          <Link href="/admin/dashboard/app-agents" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to App Agents
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Bot className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{isNew ? 'Create New App Agent' : agent.appName}</h1>
                <p className="text-xs text-slate-500">{isNew ? 'Set up a dedicated AI agent for your app' : agent.appSlug}</p>
              </div>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500 text-white hover:bg-violet-600 transition-all text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </motion.div>

        {/* Messages */}
        {message && (
          <motion.div initial="hidden" animate="show" variants={fadeUp} className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
            <p className={`text-sm ${message.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>
          </motion.div>
        )}

        <div className="space-y-6">

          {/* ─── Basic Details ──────────────────────────────────── */}
          <Section icon={Globe} title="Basic app details" description="Tell us about this app">
            {isNew && (
              <Field label="App slug (unique ID)">
                <input className={inputCls} value={agent.appSlug ?? ''} onChange={e => update('appSlug', e.target.value)} placeholder="e.g. my-horse-app" />
              </Field>
            )}
            <Field label="App name">
              <input className={inputCls} value={agent.appName ?? ''} onChange={e => update('appName', e.target.value)} placeholder="My Horse App" />
            </Field>
            <Field label="App website">
              <input className={inputCls} value={agent.appUrl ?? ''} onChange={e => update('appUrl', e.target.value)} placeholder="https://myhorseapp.com" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="App type">
                <select className={selectCls} value={agent.appType ?? 'general'} onChange={e => update('appType', e.target.value)}>
                  {APP_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Active">
                <Toggle on={agent.active ?? true} onChange={v => update('active', v)} label={agent.active ? 'Active' : 'Inactive'} />
              </Field>
            </div>
            <Field label="Main purpose of this app">
              <textarea className={`${inputCls} min-h-[80px]`} value={agent.purpose ?? ''} onChange={e => update('purpose', e.target.value)} placeholder="Describe what this app does and how AI should help..." />
            </Field>
          </Section>

          {/* ─── Firecrawl ─────────────────────────────────────── */}
          {!isNew && agent.appUrl && (
            <Section icon={Search} title="Website understanding" description="Crawl the app website to help the AI learn about it">
              <div className="flex items-center gap-4">
                <button
                  onClick={triggerCrawl}
                  disabled={crawling}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-all text-sm disabled:opacity-50"
                >
                  {crawling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {crawling ? 'Crawling...' : 'Crawl Website'}
                </button>
                {agent.crawlStatus && agent.crawlStatus !== 'none' && (
                  <span className="text-xs text-slate-400">Status: {agent.crawlStatus}</span>
                )}
              </div>
            </Section>
          )}

          {/* ─── AI Behavior ───────────────────────────────────── */}
          <Section icon={Brain} title="How this AI should behave" description="Set the personality and style of responses">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Tone">
                <select className={selectCls} value={agent.tone ?? 'professional'} onChange={e => update('tone', e.target.value)}>
                  {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Response length">
                <select className={selectCls} value={agent.responseLength ?? 'balanced'} onChange={e => update('responseLength', e.target.value)}>
                  {RESPONSE_LENGTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Creativity">
                <select className={selectCls} value={agent.creativity ?? 'balanced'} onChange={e => update('creativity', e.target.value)}>
                  {CREATIVITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* ─── Source Behavior ────────────────────────────────── */}
          <Section icon={BookOpen} title="Source and quote behavior" description="How should the AI handle sources and citations?">
            <div className="grid grid-cols-2 gap-4">
              <Toggle on={agent.mustShowSourceForQuotes ?? false} onChange={v => update('mustShowSourceForQuotes', v)} label="Must show source for quotes" />
              <Toggle on={agent.mustUseTrustedSources ?? false} onChange={v => update('mustUseTrustedSources', v)} label="Must only use trusted sources" />
              <Toggle on={agent.separateQuoteFromExplanation ?? false} onChange={v => update('separateQuoteFromExplanation', v)} label="Separate direct quote from explanation" />
            </div>
            <Field label="Can answer without a source">
              <select className={selectCls} value={agent.canAnswerWithoutSource ?? 'sometimes'} onChange={e => update('canAnswerWithoutSource', e.target.value)}>
                {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </Section>

          {/* ─── Safety ────────────────────────────────────────── */}
          <Section icon={Shield} title="Safety and restrictions" description="Control what the AI can and cannot do">
            <div className="grid grid-cols-2 gap-4">
              <Toggle on={agent.adultMode ?? false} onChange={v => update('adultMode', v)} label="Adult mode" />
              <Toggle on={agent.mustHandoffSeriousTopics ?? false} onChange={v => update('mustHandoffSeriousTopics', v)} label="Must pass serious topics to a human" />
            </div>
            <Field label="Sensitive topic mode">
              <select className={selectCls} value={agent.sensitiveTopicMode ?? 'standard'} onChange={e => update('sensitiveTopicMode', e.target.value)}>
                {SENSITIVE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Topics that need extra care">
              <div className="flex flex-wrap gap-2">
                {TOPICS_NEEDING_CARE.map(topic => (
                  <Chip key={topic} label={topic} selected={(agent.topicsNeedingCare ?? []).includes(topic)} onClick={() => toggleInArray('topicsNeedingCare', topic)} />
                ))}
              </div>
            </Field>
          </Section>

          {/* ─── Human Handoff ─────────────────────────────────── */}
          <Section icon={Users} title="Expert help / human handoff" description="When should the AI pass to a real person?">
            <Toggle on={agent.humanExpertAvailable ?? false} onChange={v => update('humanExpertAvailable', v)} label="Human expert available" />
            {agent.humanExpertAvailable && (
              <>
                <Field label="When should AI hand over to a human?">
                  <div className="flex flex-wrap gap-2">
                    {HANDOFF_TRIGGERS.map(trigger => (
                      <Chip key={trigger} label={trigger} selected={(agent.handoffTriggers ?? []).includes(trigger)} onClick={() => toggleInArray('handoffTriggers', trigger)} />
                    ))}
                  </div>
                </Field>
                <Field label="Human contact method or path">
                  <input className={inputCls} value={agent.humanContactMethod ?? ''} onChange={e => update('humanContactMethod', e.target.value)} placeholder="e.g. email support@myapp.com or link to /contact" />
                </Field>
              </>
            )}
          </Section>

          {/* ─── Knowledge ─────────────────────────────────────── */}
          <Section icon={BookOpen} title="What this AI must know" description="Select knowledge categories and add notes">
            <Field label="Knowledge categories">
              <div className="flex flex-wrap gap-2">
                {KNOWLEDGE_CATEGORIES.map(cat => (
                  <Chip key={cat} label={cat} selected={(agent.knowledgeCategories ?? []).includes(cat)} onClick={() => toggleInArray('knowledgeCategories', cat)} />
                ))}
              </div>
            </Field>
            <Field label="Knowledge notes (teach the AI about this app)">
              <textarea className={`${inputCls} min-h-[100px]`} value={agent.knowledgeNotes ?? ''} onChange={e => update('knowledgeNotes', e.target.value)} placeholder="Tell the AI what it needs to know about this app..." />
            </Field>
          </Section>

          {/* ─── Must Always / Must Never ──────────────────────── */}
          <Section icon={CheckCircle} title="What this AI must always do" description="Select rules the AI must always follow">
            <div className="flex flex-wrap gap-2">
              {MUST_ALWAYS_OPTIONS.map(rule => (
                <Chip key={rule} label={rule} selected={(agent.mustAlwaysDo ?? []).includes(rule)} onClick={() => toggleInArray('mustAlwaysDo', rule)} />
              ))}
            </div>
          </Section>

          <Section icon={AlertCircle} title="What this AI must never do" description="Select things the AI must never do">
            <div className="flex flex-wrap gap-2">
              {MUST_NEVER_OPTIONS.map(rule => (
                <Chip key={rule} label={rule} selected={(agent.mustNeverDo ?? []).includes(rule)} onClick={() => toggleInArray('mustNeverDo', rule)} />
              ))}
            </div>
          </Section>

          {/* ─── Admin Notes ───────────────────────────────────── */}
          <Section icon={MessageSquare} title="Extra rules for this app" description="Teach the agent in plain English. These notes become structured rules.">
            <textarea
              className={`${inputCls} min-h-[160px]`}
              value={agent.adminNotes ?? ''}
              onChange={e => update('adminNotes', e.target.value)}
              placeholder={`Write rules in plain English, for example:\n\n• This app must always show the source when it quotes holy text\n• This app must never give uncited religious rulings\n• This app must keep tone calm and respectful\n• This app must pass urgent health issues to a real expert\n• This app must avoid guessing`}
            />
            <p className="text-xs text-slate-500 mt-1">Each rule will be automatically parsed and enforced by the agent.</p>
          </Section>

          {/* ─── Budget ────────────────────────────────────────── */}
          <Section icon={Zap} title="Budget mode" description="Control how much the AI spends per request">
            <Field label="Budget mode">
              <select className={selectCls} value={agent.budgetMode ?? 'balanced'} onChange={e => update('budgetMode', e.target.value)}>
                {BUDGET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Toggle on={agent.allowPremiumOnlyWhenNeeded ?? true} onChange={v => update('allowPremiumOnlyWhenNeeded', v)} label="Allow premium model only when needed" />
          </Section>

          {/* ─── Religious ─────────────────────────────────────── */}
          <Section icon={Heart} title="Religious support" description="Configure religious-specific behavior if this is a faith-based app">
            <Field label="Religious mode">
              <select className={selectCls} value={agent.religiousMode ?? 'none'} onChange={e => update('religiousMode', e.target.value)}>
                {RELIGIOUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            {agent.religiousMode !== 'none' && (
              <>
                <Field label="Tradition / branch (optional)">
                  <input className={inputCls} value={agent.religiousBranch ?? ''} onChange={e => update('religiousBranch', e.target.value)} placeholder="e.g. Sunni, Catholic, Baptist, Shia..." />
                </Field>
                <Toggle on={agent.doctrineAwareRouting ?? false} onChange={v => update('doctrineAwareRouting', v)} label="Be aware of doctrinal differences" />
              </>
            )}
          </Section>

          {/* ─── Learning ──────────────────────────────────────── */}
          <Section icon={Sparkles} title="App-specific learning" description="Let the agent learn and improve over time">
            <div className="space-y-3">
              <Toggle on={agent.learningEnabled ?? false} onChange={v => update('learningEnabled', v)} label="Learn from this app daily" />
              <Toggle on={agent.autoImprovementEnabled ?? false} onChange={v => update('autoImprovementEnabled', v)} label="Allow auto-improvement recommendations" />
              <Toggle on={agent.adminReviewRequired ?? true} onChange={v => update('adminReviewRequired', v)} label="Admin review required before major behavior changes" />
            </div>
          </Section>

          {/* Save button (bottom) */}
          <div className="flex justify-end pt-4">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-500 text-white hover:bg-violet-600 transition-all text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shared Sub-components ───────────────────────────────── */

function Section({ icon: Icon, title, description, children }: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} className={`${glass} p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-violet-400" />
        <div>
          <h2 className="text-sm font-medium text-white">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <button type="button" className={toggleCls(on)} onClick={() => onChange(!on)}>
        <span className={toggleDot(on)} />
      </button>
    </div>
  )
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        selected
          ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
          : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
      }`}
    >
      {label}
    </button>
  )
}
