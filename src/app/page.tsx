'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight,
  GitBranch,
  Brain,
  RefreshCw,
  Layers,
  DollarSign,
  ShieldCheck,
  Cpu,
  Inbox,
  ScanSearch,
  Database,
  TrendingUp,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import LivingCore from '@/components/LivingCore'
import EcosystemNetwork from '@/components/EcosystemNetwork'

/* ───────────────────── Fade-in section wrapper ───────────────────── */

function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

/* ───────────────────── Data ───────────────────── */

const PIPELINE_STEPS = [
  { icon: Inbox, label: 'Request', desc: 'Any input enters the system' },
  { icon: ScanSearch, label: 'Classification', desc: 'Intent and complexity analysed' },
  { icon: GitBranch, label: 'Routing', desc: 'Matched to the optimal model' },
  { icon: Cpu, label: 'Execution', desc: 'Processed with full context' },
  { icon: TrendingUp, label: 'Learning', desc: 'Outcome feeds back into the system' },
]

const CAPABILITIES = [
  {
    icon: GitBranch,
    title: 'Intelligent Routing',
    desc: 'Every request is classified and directed to the model best suited for the task — cost, latency, and quality balanced automatically.',
  },
  {
    icon: Database,
    title: 'Persistent Memory',
    desc: 'Conversations and context persist across sessions, giving every interaction the depth of a long-running relationship.',
  },
  {
    icon: TrendingUp,
    title: 'Continuous Learning',
    desc: 'Routing decisions, error rates, and user feedback flow back into the system so it improves with every request.',
  },
  {
    icon: Layers,
    title: 'Multimodal Processing',
    desc: 'Text, code, images, and audio handled through a single unified pipeline — no separate integrations needed.',
  },
  {
    icon: ShieldCheck,
    title: 'Self-Healing',
    desc: 'When a provider fails or degrades, traffic shifts instantly. The system recovers before users notice.',
  },
  {
    icon: DollarSign,
    title: 'Budget Control',
    desc: 'Real-time cost tracking per request and per user. Set limits, get alerts, never be surprised by a bill.',
  },
]

const ADAPTIVE_POINTS = [
  {
    icon: Brain,
    title: 'Learns from every interaction',
    desc: 'Each request outcome — success, failure, latency, cost — becomes training signal for smarter future routing.',
  },
  {
    icon: RefreshCw,
    title: 'Adapts routing over time',
    desc: 'Model performance drifts. The system detects it and rebalances without manual intervention.',
  },
  {
    icon: ShieldCheck,
    title: 'Self-heals when issues arise',
    desc: 'Provider outages, rate limits, quality drops — detected and mitigated in real time.',
  },
]

/* ═══════════════════════════════════════════════════════════════════ */
/*  PAGE                                                              */
/* ═══════════════════════════════════════════════════════════════════ */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050810] text-white">
      <Header />

      {/* ── Section 1 · Hero ──────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <LivingCore className="absolute inset-0 z-0 opacity-30" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            The Intelligence Layer Behind
            <br />
            <span className="text-blue-500">What Comes Next</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            A central intelligence system that powers multiple applications,
            routes every request to the optimal model, and learns from each
            interaction. Built for serious products — not demos.
          </p>
          <Link
            href="/admin/login"
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Enter Platform
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Section 2 · Product Truth ─────────────────────────────── */}
      <Section id="product" className="py-28">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            What Amarkt<span className="text-blue-500">AI</span> Network
            Actually Is
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
            Not another wrapper. A connective intelligence layer that sits
            between your applications and the models that power them.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {[
              'One intelligence layer. Many connected applications.',
              'Every request routed to the optimal model.',
              'The system learns from every interaction.',
              'Built for production. Not for demos.',
            ].map((statement) => (
              <div
                key={statement}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-5"
              >
                <p className="text-base font-medium leading-relaxed text-slate-200">
                  {statement}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Section 3 · How Intelligence Moves ────────────────────── */}
      <Section id="intelligence" className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            How Intelligence Moves
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
            Every request follows a deliberate path — classified, routed,
            executed, and fed back into a system that never stops improving.
          </p>
          <div className="mt-16 flex flex-col items-center gap-8 md:flex-row md:justify-between">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.label} className="flex flex-col items-center text-center md:flex-1">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
                    <Icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {step.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{step.desc}</p>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight className="mt-4 h-4 w-4 rotate-90 text-slate-600 md:hidden" />
                  )}
                </div>
              )
            })}
          </div>
          {/* Connecting line on desktop */}
          <div className="mx-auto mt-[-72px] hidden max-w-4xl md:block">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>
        </div>
      </Section>

      {/* ── Section 4 · Ecosystem Network ─────────────────────────── */}
      <Section id="ecosystem" className="py-28">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            One System. Every Application.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
            Each application connected to the network benefits from the
            intelligence of all the others. Usage patterns, model performance,
            and learned preferences compound across the entire ecosystem.
          </p>
          <div className="mx-auto mt-12 h-[420px] w-full max-w-xl">
            <EcosystemNetwork className="h-full w-full" />
          </div>
        </div>
      </Section>

      {/* ── Section 5 · Capabilities ──────────────────────────────── */}
      <Section id="apps" className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Core Capabilities
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
            Everything a production intelligence layer needs — nothing it
            doesn&apos;t.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon
              return (
                <div
                  key={cap.title}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-6"
                >
                  <Icon className="h-6 w-6 text-blue-400" />
                  <h3 className="mt-4 text-base font-semibold text-white">
                    {cap.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {cap.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ── Section 6 · Adaptive Intelligence ─────────────────────── */}
      <Section className="py-28">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Adaptive Intelligence
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
            The system doesn&apos;t just execute — it evolves. Every interaction
            makes the next one better.
          </p>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {ADAPTIVE_POINTS.map((point) => {
              const Icon = point.icon
              return (
                <div key={point.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
                    <Icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {point.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ── Section 7 · Final CTA ─────────────────────────────────── */}
      <Section id="access" className="py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Connect?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            One platform, one intelligence layer, every application you build
            from here forward.
          </p>
          <Link
            href="/admin/login"
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Enter Platform
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      <Footer />
    </div>
  )
}
