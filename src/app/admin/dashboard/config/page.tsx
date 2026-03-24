'use client'

import { motion } from 'framer-motion'
import {
  CheckCircle, AlertCircle, Clock, ChevronRight, Info,
  BrainCircuit, Database, Mail, CreditCard, Plug,
  Shield, Plane,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────
type ItemStatus = 'configured' | 'not-configured' | 'pending' | 'optional-unconfigured'
type ItemRequired = 'required' | 'optional'

interface SetupItem {
  name: string
  status: ItemStatus
  required: ItemRequired
  usedIn: string
  whyItMatters: string
  note?: string
  actionHref?: string
  actionLabel?: string
}

interface SetupSection {
  id: string
  title: string
  description: string
  icon: typeof BrainCircuit
  color: string
  borderColor: string
  items: SetupItem[]
}

// ── Setup Matrix Data ─────────────────────────────────────────────
const setupMatrix: SetupSection[] = [
  {
    id: 'ai-providers',
    title: 'AI Provider Keys',
    description: 'API keys for all language model providers. The brain routes requests across these.',
    icon: BrainCircuit,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/20',
    items: [
      {
        name: 'OpenAI (GPT-4o, GPT-4)',
        status: 'pending',
        required: 'required',
        usedIn: 'Brain orchestration, default model routing',
        whyItMatters: 'Primary AI model for most app requests. Required for the brain to function.',
        note: 'Configure in AI Providers vault',
        actionHref: '/admin/dashboard/ai-providers',
        actionLabel: 'Configure',
      },
      {
        name: 'Google Gemini',
        status: 'pending',
        required: 'required',
        usedIn: 'Fallback routing, multimodal tasks',
        whyItMatters: 'Second-tier model for cost optimisation and multimodal capability.',
        note: 'Configure in AI Providers vault',
        actionHref: '/admin/dashboard/ai-providers',
        actionLabel: 'Configure',
      },
      {
        name: 'Grok / xAI',
        status: 'pending',
        required: 'optional',
        usedIn: 'Alternative routing, reasoning tasks',
        whyItMatters: 'Strong reasoning model for complex analytical requests.',
        actionHref: '/admin/dashboard/ai-providers',
        actionLabel: 'Configure',
      },
      {
        name: 'Qwen (Alibaba)',
        status: 'pending',
        required: 'optional',
        usedIn: 'Multi-language tasks, low-latency routing',
        whyItMatters: 'Cost-efficient for high-volume multilingual workloads.',
        actionHref: '/admin/dashboard/ai-providers',
        actionLabel: 'Configure',
      },
      {
        name: 'Hugging Face',
        status: 'pending',
        required: 'optional',
        usedIn: 'Custom model inference, open-source models',
        whyItMatters: 'Access to thousands of open-source models and custom fine-tuned models.',
        actionHref: '/admin/dashboard/ai-providers',
        actionLabel: 'Configure',
      },
      {
        name: 'NVIDIA NIM',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'High-performance inference, LLaMA models',
        whyItMatters: 'GPU-optimised inference for performance-critical tasks.',
        note: 'Reserved slot — configure when needed',
        actionHref: '/admin/dashboard/ai-providers',
        actionLabel: 'Configure',
      },
    ],
  },
  {
    id: 'databases',
    title: 'Data Layer',
    description: 'Core storage and caching infrastructure the network depends on.',
    icon: Database,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
    items: [
      {
        name: 'MongoDB',
        status: 'pending',
        required: 'required',
        usedIn: 'AI brain memory, event logs, context storage',
        whyItMatters: 'Stores all AI brain state, shared memory, and event history. Critical for persistence.',
        note: 'Set MONGODB_URI in environment',
      },
      {
        name: 'MariaDB / MySQL',
        status: 'pending',
        required: 'required',
        usedIn: 'App registry, product data, relational records',
        whyItMatters: 'Primary relational database for all structured app and user data.',
        note: 'Set DATABASE_URL in environment (Prisma)',
      },
      {
        name: 'Redis',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'Session caching, rate limiting, real-time pub/sub',
        whyItMatters: 'Improves performance significantly for session management and real-time features.',
        note: 'Set REDIS_URL in environment',
      },
    ],
  },
  {
    id: 'communications',
    title: 'Communications',
    description: 'Email and SMS infrastructure for transactional and alert messaging.',
    icon: Mail,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    items: [
      {
        name: 'SMTP (Email)',
        status: 'not-configured',
        required: 'required',
        usedIn: 'Contact form emails, system alerts, waitlist confirmation',
        whyItMatters: 'All email delivery flows through SMTP. Required for contact forms and admin alerts.',
        note: 'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment',
      },
      {
        name: 'Twilio (SMS)',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'SMS alerts, two-factor authentication, notifications',
        whyItMatters: 'Enables SMS-based alerts and 2FA for admin security.',
        note: 'Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    description: 'Stripe integration for billing, subscriptions, and payment processing.',
    icon: CreditCard,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    items: [
      {
        name: 'Stripe (API key)',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'Subscriptions, one-time payments, billing management',
        whyItMatters: 'Required for any paid features or app monetisation across the ecosystem.',
        note: 'Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in environment',
      },
      {
        name: 'Stripe Webhook Secret',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'Payment event processing, subscription lifecycle',
        whyItMatters: 'Needed to securely receive Stripe payment events and update billing state.',
        note: 'Set STRIPE_WEBHOOK_SECRET in environment',
      },
    ],
  },
  {
    id: 'app-connections',
    title: 'App Integration Layer',
    description: 'APIs that allow connected apps to communicate with Amarktai Network.',
    icon: Plug,
    color: 'text-teal-400',
    borderColor: 'border-teal-500/20',
    items: [
      {
        name: 'Integration API',
        status: 'configured',
        required: 'required',
        usedIn: 'All connected apps',
        whyItMatters: 'The endpoint that apps use to connect and send events to the network.',
      },
      {
        name: 'Token Authentication',
        status: 'configured',
        required: 'required',
        usedIn: 'All app integrations',
        whyItMatters: 'Secure app-specific tokens prevent unauthorised network access.',
      },
      {
        name: 'Heartbeat Monitoring',
        status: 'configured',
        required: 'required',
        usedIn: 'App health, VPS monitoring',
        whyItMatters: 'Real-time health status for every connected app.',
      },
      {
        name: 'VPS Resource Feeds',
        status: 'configured',
        required: 'optional',
        usedIn: 'Infrastructure dashboard',
        whyItMatters: 'CPU, RAM, disk metrics from app servers for the monitoring dashboard.',
      },
      {
        name: 'Event Ingestion',
        status: 'configured',
        required: 'optional',
        usedIn: 'Events & Logs dashboard',
        whyItMatters: 'Centralised event stream from all apps for audit and diagnostics.',
      },
    ],
  },
  {
    id: 'travel-integrations',
    title: 'Travel App Integrations',
    description: 'External APIs used by Amarktai Travel.',
    icon: Plane,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    items: [
      {
        name: 'Flight Search API (e.g. Amadeus)',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'Amarktai Travel — flight search and booking',
        whyItMatters: 'Required for real-time flight search and booking in the travel app.',
        note: 'Set AMADEUS_API_KEY or equivalent in environment',
      },
      {
        name: 'Hotel Search API',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'Amarktai Travel — accommodation search',
        whyItMatters: 'Required for hotel and accommodation search features.',
        note: 'Configure when travel backend is deployed',
      },
      {
        name: 'Currency / FX API',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'Amarktai Travel, Amarktai Online — price display',
        whyItMatters: 'Enables multi-currency pricing display across travel and commerce apps.',
        note: 'Set FX_API_KEY in environment',
      },
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure & Security',
    description: 'System-level configuration for sessions, security, and monitoring.',
    icon: Shield,
    color: 'text-slate-400',
    borderColor: 'border-slate-500/20',
    items: [
      {
        name: 'Admin Session Auth',
        status: 'configured',
        required: 'required',
        usedIn: 'Admin dashboard access',
        whyItMatters: 'Secures all admin routes with session-based authentication.',
      },
      {
        name: 'ADMIN_PASSWORD env variable',
        status: 'pending',
        required: 'required',
        usedIn: 'Admin login',
        whyItMatters: 'Overrides the default admin password. Must be set in production.',
        note: 'Set ADMIN_PASSWORD in environment',
      },
      {
        name: 'Rate Limiting',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'All API routes',
        whyItMatters: 'Protects the network from abuse and cost-attack on AI endpoints.',
        note: 'Coming in next backend phase',
      },
      {
        name: 'Two-Factor Authentication',
        status: 'not-configured',
        required: 'optional',
        usedIn: 'Admin login',
        whyItMatters: 'Additional security layer for admin access.',
        note: 'Coming in next backend phase',
      },
    ],
  },
]

// ── Status Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<ItemStatus, {
  icon: typeof CheckCircle
  color: string
  label: string
  bg: string
}> = {
  configured: { icon: CheckCircle, color: 'text-emerald-400', label: 'Configured', bg: 'bg-emerald-500/8 border-emerald-500/20' },
  pending: { icon: Clock, color: 'text-amber-400', label: 'Partial / Pending', bg: 'bg-amber-500/8 border-amber-500/20' },
  'not-configured': { icon: AlertCircle, color: 'text-slate-500', label: 'Not configured', bg: 'bg-slate-500/5 border-slate-500/15' },
  'optional-unconfigured': { icon: AlertCircle, color: 'text-slate-600', label: 'Optional — not set', bg: 'bg-white/3 border-white/8' },
}

const REQUIRED_CONFIG = {
  required: { label: 'Required', color: 'text-red-400', bg: 'bg-red-500/8 border-red-500/20' },
  optional: { label: 'Optional', color: 'text-slate-500', bg: 'bg-white/3 border-white/10' },
}

// ── Main Component ────────────────────────────────────────────────
export default function SetupMatrixPage() {
  const allItems = setupMatrix.flatMap((s) => s.items)
  const configuredCount = allItems.filter((i) => i.status === 'configured').length
  const totalCount = allItems.length
  const requiredItems = allItems.filter((i) => i.required === 'required')
  const configuredRequired = requiredItems.filter((i) => i.status === 'configured').length

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white font-heading">Setup Matrix</h1>
        <p className="text-sm text-slate-400 mt-1">
          Complete integration and configuration status for Amarktai Network
        </p>
      </motion.div>

      {/* Summary Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-5 border border-blue-500/10"
      >
        <div className="flex flex-wrap gap-6 items-center justify-between">
          <div className="flex gap-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Overall</p>
              <p className="text-2xl font-bold text-white font-heading">
                {Math.round((configuredCount / totalCount) * 100)}%
              </p>
              <p className="text-xs text-slate-500">{configuredCount}/{totalCount} items</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Required</p>
              <p className={`text-2xl font-bold font-heading ${configuredRequired === requiredItems.length ? 'text-emerald-400' : 'text-amber-400'}`}>
                {configuredRequired}/{requiredItems.length}
              </p>
              <p className="text-xs text-slate-500">core items</p>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-mono">Configuration Progress</span>
              <span className="font-mono">{Math.round((configuredCount / totalCount) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${(configuredCount / totalCount) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { label: 'Configured', count: allItems.filter(i => i.status === 'configured').length, color: 'text-emerald-400' },
                { label: 'Pending', count: allItems.filter(i => i.status === 'pending').length, color: 'text-amber-400' },
                { label: 'Missing', count: allItems.filter(i => i.status === 'not-configured').length, color: 'text-slate-500' },
              ].map((stat) => (
                <span key={stat.label} className="flex items-center gap-1 text-[10px] font-mono">
                  <span className={`font-bold ${stat.color}`}>{stat.count}</span>
                  <span className="text-slate-600">{stat.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      <div className="space-y-4">
        {setupMatrix.map((section, si) => {
          const Icon = section.icon
          const sectionConfigured = section.items.filter((i) => i.status === 'configured').length
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + si * 0.04 }}
              className={`glass rounded-2xl overflow-hidden border ${section.borderColor}`}
            >
              {/* Section Header */}
              <div className="px-5 py-4 border-b border-white/[0.04] flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${section.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white font-heading">{section.title}</h2>
                    <span className="text-[10px] text-slate-600 font-mono">{sectionConfigured}/{section.items.length}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-white/[0.03]">
                {section.items.map((item) => {
                  const st = STATUS_CONFIG[item.status]
                  const req = REQUIRED_CONFIG[item.required]
                  const StIcon = st.icon
                  return (
                    <div
                      key={item.name}
                      className="px-5 py-4 hover:bg-white/[0.015] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <StIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${st.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-sm text-white font-medium">{item.name}</span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${req.color} ${req.bg}`}>
                                {req.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-1.5">{item.whyItMatters}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono">
                              <span className="text-slate-600">Used in: <span className="text-slate-400">{item.usedIn}</span></span>
                              {item.note && <span className="text-slate-600">{item.note}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-[10px] font-medium px-2 py-1 rounded-lg border ${st.color} ${st.bg}`}>
                            {st.label}
                          </span>
                          {item.actionHref && (
                            <Link
                              href={item.actionHref}
                              className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                            >
                              {item.actionLabel ?? 'Go'} <ChevronRight className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl p-5 border border-white/5"
      >
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs text-slate-500 leading-relaxed">
              Configuration is applied server-side via environment variables. Keys marked as
              {' "'}Pending{'" '} are referenced in code but require deployment-time environment variables to activate.
              Keys marked {'"'}Not configured{'" '} are reserved integration slots for future backend phases.
            </p>
            <p className="text-xs text-slate-600">
              AI provider keys are stored encrypted in the database and managed from the{' '}
              <Link href="/admin/dashboard/ai-providers" className="text-violet-400 hover:text-violet-300">
                AI Providers vault
              </Link>.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
