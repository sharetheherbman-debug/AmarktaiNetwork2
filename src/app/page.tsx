'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import {
  Inbox,
  ScanSearch,
  GitBranch,
  Cpu,
  Database,
  BookOpen,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  MessageSquare,
  Code2,
  Search,
  Bot,
  ImageIcon,
  Video,
  Mic,
  DollarSign,
  ShieldCheck,
  GraduationCap,
  Wrench,
  Network,
  Layers,
  Zap,
  Globe,
  BrainCircuit,
  Sparkles,
  Rocket,
  Eye,
  LayoutGrid,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import NetworkCanvas from '@/components/NetworkCanvas'

// ─── Data ──────────────────────────────────────────────────────────────────

const BRAIN_STEPS = [
  { icon: Inbox,      label: 'App sends task',        desc: 'Any connected app dispatches a request to the central brain via API.',            color: 'text-blue-400',    ring: 'ring-blue-500/30',    bg: 'bg-blue-500/10' },
  { icon: ScanSearch, label: 'Brain classifies',      desc: 'The brain parses intent, modality, complexity, and required capabilities.',       color: 'text-cyan-400',    ring: 'ring-cyan-500/30',    bg: 'bg-cyan-500/10' },
  { icon: GitBranch,  label: 'Routes to best provider', desc: 'Intelligent routing selects the optimal model and provider for the task.',      color: 'text-violet-400',  ring: 'ring-violet-500/30',  bg: 'bg-violet-500/10' },
  { icon: Cpu,        label: 'Executes',              desc: 'The chosen provider processes the task with full context and parameters.',         color: 'text-purple-400',  ring: 'ring-purple-500/30',  bg: 'bg-purple-500/10' },
  { icon: Database,   label: 'Stores memory',         desc: 'Results, confidence scores, and execution context persist for future use.',       color: 'text-teal-400',    ring: 'ring-teal-500/30',    bg: 'bg-teal-500/10' },
  { icon: BookOpen,   label: 'Logs learning',         desc: 'Every outcome feeds the learning layer — successes and failures alike.',          color: 'text-amber-400',   ring: 'ring-amber-500/30',   bg: 'bg-amber-500/10' },
  { icon: TrendingUp, label: 'Improves routing',      desc: 'Accumulated signals refine future routing decisions across the entire ecosystem.', color: 'text-emerald-400', ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10' },
]

const CAPABILITIES = [
  { icon: MessageSquare, title: 'Chat',               desc: 'Multi-turn conversational AI across providers with context persistence and personality tuning.',                 color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  { icon: Code2,         title: 'Coding',             desc: 'Code generation, debugging, refactoring, and review powered by specialised code models.',                        color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
  { icon: Search,        title: 'Retrieval',          desc: 'Semantic search and retrieval-augmented generation across knowledge bases and documents.',                        color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  { icon: Bot,           title: 'Agents',             desc: 'Autonomous multi-step agents that plan, execute, and iterate to accomplish complex goals.',                        color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  { icon: ImageIcon,     title: 'Image Generation',   desc: 'Text-to-image synthesis with automatic provider selection based on style and quality needs.',                     color: 'text-pink-400',    bg: 'bg-pink-500/10' },
  { icon: Video,         title: 'Video & Reels',      desc: 'Short-form video generation and editing capabilities routed to specialised multimodal models.',                   color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  { icon: Mic,           title: 'Voice',              desc: 'Speech-to-text, text-to-speech, and voice cloning through best-in-class audio providers.',                        color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { icon: DollarSign,    title: 'Budget Optimization', desc: 'Per-app and per-task budget controls that route to cost-effective models without sacrificing quality.',           color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Wrench,        title: 'Self-Healing',       desc: 'Automatic failover and rerouting when providers degrade — zero downtime, no manual intervention.',                color: 'text-teal-400',    bg: 'bg-teal-500/10' },
  { icon: ShieldCheck,   title: 'Safety',             desc: 'Built-in content filtering, rate limiting, and policy enforcement across every execution path.',                  color: 'text-sky-400',     bg: 'bg-sky-500/10' },
  { icon: GraduationCap, title: 'Learning',           desc: 'Continuous feedback loops that improve model selection, routing accuracy, and output quality over time.',          color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
]

const ECOSYSTEM_APPS = [
  { name: 'Amarktai Chat',     desc: 'Conversational AI assistant with multi-model orchestration and persistent memory.',        capabilities: ['Chat', 'Retrieval', 'Agents'],           models: 'GPT-4o, Claude, Gemini',          color: 'from-blue-500/20 to-cyan-500/10',    border: 'border-blue-500/20',    icon: MessageSquare, iconColor: 'text-blue-400' },
  { name: 'Amarktai Studio',   desc: 'Creative content generation — images, video, and multimodal compositions.',                capabilities: ['Image Generation', 'Video & Reels'],     models: 'DALL·E 3, Stable Diffusion, Runway', color: 'from-pink-500/20 to-rose-500/10',   border: 'border-pink-500/20',    icon: ImageIcon,     iconColor: 'text-pink-400' },
  { name: 'Amarktai Code',     desc: 'AI-powered development environment with inline suggestions and full-repo awareness.',      capabilities: ['Coding', 'Retrieval', 'Agents'],         models: 'GPT-4o, Claude Sonnet, DeepSeek',   color: 'from-cyan-500/20 to-teal-500/10',   border: 'border-cyan-500/20',    icon: Code2,         iconColor: 'text-cyan-400' },
  { name: 'Amarktai Voice',    desc: 'Real-time voice interaction, transcription, and synthesis across multiple languages.',      capabilities: ['Voice', 'Chat', 'Safety'],               models: 'Whisper, ElevenLabs, Azure Speech', color: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', icon: Mic,           iconColor: 'text-amber-400' },
  { name: 'Amarktai Agents',   desc: 'Deploy autonomous agents that research, plan, and execute multi-step workflows.',          capabilities: ['Agents', 'Retrieval', 'Coding'],         models: 'GPT-4o, Claude Opus, Gemini Pro',   color: 'from-violet-500/20 to-purple-500/10', border: 'border-violet-500/20', icon: Bot,         iconColor: 'text-violet-400' },
  { name: 'Amarktai Search',   desc: 'Semantic search engine powered by embeddings and retrieval-augmented generation.',         capabilities: ['Retrieval', 'Chat', 'Learning'],         models: 'Cohere, Voyage AI, OpenAI',         color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/20', icon: Search,      iconColor: 'text-emerald-400' },
]

const DIFFERENTIATORS = [
  { icon: Layers,       title: 'Not Single-Model',        body: 'AmarktAI orchestrates across 8+ providers and 60+ models simultaneously. Every task is routed to the best model for that specific job — not locked into one vendor.',                                    iconColor: 'text-blue-400',    iconBg: 'bg-blue-500/10',    accent: 'from-blue-500/20 to-cyan-500/10',    border: 'hover:border-blue-500/30',    glow: 'hover:shadow-blue-500/10' },
  { icon: LayoutGrid,   title: 'Not Single-App',          body: 'The brain serves an entire ecosystem of apps. Each app gets its own context, budget, and routing profile — all powered by the same shared intelligence layer.',                                             iconColor: 'text-violet-400',  iconBg: 'bg-violet-500/10',  accent: 'from-violet-500/20 to-purple-500/10', border: 'hover:border-violet-500/30', glow: 'hover:shadow-violet-500/10' },
  { icon: TrendingUp,   title: 'Not Static',              body: 'Every execution feeds back into the system. Routing decisions, model performance, and outcome signals accumulate — AmarktAI gets smarter with every request across the network.',                            iconColor: 'text-teal-400',    iconBg: 'bg-teal-500/10',    accent: 'from-teal-500/20 to-cyan-500/10',    border: 'hover:border-teal-500/30',    glow: 'hover:shadow-teal-500/10' },
  { icon: Zap,          title: 'Not One-Size-Fits-All',   body: 'Different apps need different things. The brain adapts execution per app — routing strategy, model selection, output format, and cost controls are all independently configurable.',                          iconColor: 'text-amber-400',   iconBg: 'bg-amber-500/10',   accent: 'from-amber-500/20 to-orange-500/10', border: 'hover:border-amber-500/30',  glow: 'hover:shadow-amber-500/10' },
  { icon: BrainCircuit, title: 'Intelligent Core',        body: 'Routing, memory, budgets, and learning — all unified in one intelligence layer. No scattered API keys, no fragmented dashboards. One brain that controls and improves everything.',                            iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10', accent: 'from-emerald-500/20 to-teal-500/10', border: 'hover:border-emerald-500/30', glow: 'hover:shadow-emerald-500/10' },
]

const FUTURE_ITEMS = [
  { icon: Globe,      title: 'Growing Ecosystem',     desc: 'New apps continuously connect to the brain, each one making the entire network more capable and intelligent.',                      color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  { icon: Network,    title: 'Smarter Routing',       desc: 'Reinforcement learning and real-time telemetry will evolve routing from rule-based to fully autonomous model selection.',             color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  { icon: Layers,     title: 'Model Flexibility',     desc: 'Seamlessly integrate new providers and models as they launch — the brain adapts without any app needing to change.',                 color: 'text-teal-400',    bg: 'bg-teal-500/10' },
  { icon: Sparkles,   title: 'Multimodal Expansion',  desc: 'Text, image, voice, video, 3D — every modality unified under one intelligence layer with cross-modal reasoning and generation.',     color: 'text-amber-400',   bg: 'bg-amber-500/10' },
]

// ─── Sub-components ────────────────────────────────────────────────────────

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function SectionHeading({ tag, tagColor, title, subtitle }: { tag: string; tagColor: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <FadeUp className="text-center mb-20">
      <p className={`text-xs font-mono tracking-widest uppercase ${tagColor} mb-4`}>{tag}</p>
      <h2 className="font-heading text-4xl md:text-5xl font-bold gradient-text">{title}</h2>
      {subtitle && <p className="text-slate-400 mt-4 max-w-2xl mx-auto text-sm leading-relaxed">{subtitle}</p>}
    </FadeUp>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <div className="scanline" />
      <Header />

      <main className="min-h-screen bg-[#050816] text-[#F8FAFC]">

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <NetworkCanvas className="w-full h-full" interactive activationStep={3} />
          </div>
          <div className="absolute inset-0 z-10 bg-[#050816]/60" />
          <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_30%,#050816_100%)]" />

          <div className="relative z-20 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center gap-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full glass border border-blue-500/20 text-xs font-mono tracking-widest uppercase text-blue-300"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
              </span>
              The Intelligence Layer · Live
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight"
            >
              <span className="gradient-text">One Brain.</span><br />
              <span className="text-white">Many Apps.</span><br />
              <span className="gradient-text-blue-cyan">Infinite AI Capability.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="text-[clamp(1rem,2.5vw,1.25rem)] text-slate-300 max-w-2xl leading-relaxed"
            >
              AmarktAI is the central intelligence layer that routes every AI task to the best model,
              learns from every execution, and powers an entire ecosystem of connected applications.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center gap-3"
            >
              <Link href="/apps" className="btn-primary group">
                Explore Ecosystem
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 text-sm font-semibold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-200 flex items-center gap-2"
              >
                Enter Platform
                <Rocket className="w-4 h-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="px-6 py-3 text-sm font-semibold text-slate-300 border border-white/10 rounded-xl hover:bg-white/5 hover:text-white hover:border-white/20 transition-all duration-200 flex items-center gap-2"
              >
                How It Works
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.65 }}
              className="flex flex-wrap items-center justify-center gap-8 pt-6"
            >
              {[
                { value: '8+',          label: 'AI Providers' },
                { value: '60+',         label: 'Models' },
                { value: 'Real-Time',   label: 'Routing' },
                { value: 'Daily',       label: 'Learning' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-white font-heading">{stat.value}</span>
                  <span className="text-xs text-slate-500 font-mono tracking-wider uppercase">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
          >
            <span className="text-xs text-slate-600 font-mono tracking-widest uppercase">Scroll</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-px h-8 bg-gradient-to-b from-blue-500/40 to-transparent"
            />
          </motion.div>
        </section>

        {/* ── HOW THE BRAIN WORKS ────────────────────────────────────────── */}
        <section id="how-it-works" className="relative py-32 px-6 overflow-hidden">
          <div className="section-divider mb-24" />
          <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

          <div className="max-w-6xl mx-auto">
            <SectionHeading
              tag="System Architecture"
              tagColor="text-blue-400/70"
              title={<>How the <span className="text-white">Brain</span> Works</>}
              subtitle="Every connected app sends tasks to AmarktAI. The brain classifies, routes, executes, remembers, learns, and improves — a continuous cycle of intelligence."
            />

            {/* 7-step flow diagram */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
              {BRAIN_STEPS.map((step, i) => (
                <FadeUp key={step.label} delay={i * 0.08} className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.05, y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl glass-card ring-1 ${step.ring} w-full h-full`}
                  >
                    <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#050816] border border-slate-700 text-[10px] text-slate-400 font-mono flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                      className={`p-3 rounded-xl ${step.bg}`}
                    >
                      <step.icon className={`w-5 h-5 ${step.color}`} strokeWidth={1.5} />
                    </motion.div>
                    <p className="text-xs text-center text-white font-semibold leading-snug">{step.label}</p>
                    <p className="text-xs text-center text-slate-500 leading-snug">{step.desc}</p>
                  </motion.div>
                  {/* Connector arrow (visible on lg) */}
                  {i < BRAIN_STEPS.length - 1 && (
                    <motion.div
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                      className="hidden lg:block mt-2"
                    >
                      <ArrowRight className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                    </motion.div>
                  )}
                </FadeUp>
              ))}
            </div>

            {/* Cycle indicator */}
            <FadeUp delay={0.6} className="mt-12 text-center">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass border border-emerald-500/20">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </motion.div>
                <span className="text-xs text-slate-400 font-mono tracking-wider">Continuous loop — every execution makes the brain smarter</span>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ── CAPABILITIES ───────────────────────────────────────────────── */}
        <section className="relative py-32 px-6 overflow-hidden">
          <div className="section-divider mb-24" />

          <div className="max-w-6xl mx-auto">
            <SectionHeading
              tag="Core Capabilities"
              tagColor="text-cyan-400/70"
              title={<>What the Brain <span className="gradient-text-blue-cyan">Can Do</span></>}
              subtitle="From conversational AI to autonomous agents, from image generation to self-healing infrastructure — the brain handles it all through intelligent routing and orchestration."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {CAPABILITIES.map((cap, i) => (
                <FadeUp key={cap.title} delay={i * 0.05}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="glass-card rounded-2xl p-6 border border-slate-700/40 hover:border-slate-600/60 h-full flex flex-col gap-4 group transition-all duration-300"
                  >
                    <div className={`w-10 h-10 rounded-lg ${cap.bg} flex items-center justify-center`}>
                      <cap.icon className={`w-5 h-5 ${cap.color}`} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-heading text-base font-semibold text-white">{cap.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed flex-1">{cap.desc}</p>
                  </motion.div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── APPS POWERED BY THE BRAIN ──────────────────────────────────── */}
        <section className="relative py-32 px-6 overflow-hidden">
          <div className="section-divider mb-24" />
          <div className="absolute inset-0 grid-bg-fine opacity-40 pointer-events-none" />

          <div className="max-w-6xl mx-auto">
            <SectionHeading
              tag="Ecosystem"
              tagColor="text-violet-400/70"
              title={<>Apps Powered by the <span className="gradient-text-violet">Brain</span></>}
              subtitle="Every app in the Amarktai Network connects to the same central intelligence. Each has its own capabilities, preferred models, and budget — all orchestrated by one brain."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ECOSYSTEM_APPS.map((app, i) => (
                <FadeUp key={app.name} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`relative glass-card rounded-2xl p-7 border ${app.border} h-full flex flex-col gap-5 group overflow-hidden transition-all duration-300 hover:shadow-xl`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${app.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none`} />
                    <div className="relative z-10 flex flex-col gap-5 h-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <app.icon className={`w-5 h-5 ${app.iconColor}`} strokeWidth={1.5} />
                        </div>
                        <h3 className="font-heading text-lg font-semibold text-white">{app.name}</h3>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed flex-1">{app.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {app.capabilities.map((c) => (
                          <span key={c} className="px-2 py-0.5 rounded-full text-xs font-mono bg-white/5 text-slate-400 border border-white/5">{c}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <Eye className="w-3 h-3" />
                        <span>{app.models}</span>
                      </div>
                    </div>
                  </motion.div>
                </FadeUp>
              ))}

              {/* Placeholder: more apps coming */}
              <FadeUp delay={ECOSYSTEM_APPS.length * 0.08}>
                <div className="glass-card rounded-2xl p-7 border border-dashed border-slate-700/60 h-full flex flex-col items-center justify-center gap-4 text-center min-h-[240px]">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-slate-500" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-slate-500 font-heading font-semibold">More Apps Coming</p>
                  <p className="text-xs text-slate-600 max-w-[200px]">The ecosystem grows continuously. Every new app makes the brain smarter.</p>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ── WHY THIS IS DIFFERENT ──────────────────────────────────────── */}
        <section className="relative py-32 px-6 overflow-hidden">
          <div className="section-divider mb-24" />

          <div className="max-w-6xl mx-auto">
            <SectionHeading
              tag="Architecture Philosophy"
              tagColor="text-emerald-400/70"
              title={<>Why This Is <span className="gradient-text-aurora">Different</span></>}
              subtitle="Most AI platforms give you a model. AmarktAI gives you an intelligence layer — one that routes, learns, adapts, and grows across every app in the ecosystem."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DIFFERENTIATORS.map((card, i) => (
                <FadeUp key={card.title} delay={i * 0.08}>
                  <div className={`relative h-full glass-card rounded-2xl p-8 border border-slate-700/40 ${card.border} shadow-xl ${card.glow} hover:shadow-2xl transition-all duration-300 group overflow-hidden`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none`} />
                    <div className="relative z-10 flex flex-col gap-5 h-full">
                      <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                        <card.icon className={`w-6 h-6 ${card.iconColor}`} strokeWidth={1.5} />
                      </div>
                      <h3 className="font-heading text-xl font-semibold text-white">{card.title}</h3>
                      <p className="text-slate-400 leading-relaxed text-sm flex-1">{card.body}</p>
                      <div className={`flex items-center gap-1.5 text-xs font-mono ${card.iconColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                        <span>Learn more</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── FUTURE VISION ──────────────────────────────────────────────── */}
        <section className="relative py-32 px-6 overflow-hidden">
          <div className="section-divider mb-24" />
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

          <div className="max-w-5xl mx-auto">
            <SectionHeading
              tag="Looking Ahead"
              tagColor="text-amber-400/70"
              title={<>The Future of <span className="gradient-text">Intelligence</span></>}
              subtitle="AmarktAI is designed to evolve. As the AI landscape shifts, the brain adapts — new models, new modalities, new apps, all unified under one self-improving intelligence layer."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {FUTURE_ITEMS.map((item, i) => (
                <FadeUp key={item.title} delay={i * 0.1}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="glass-card rounded-2xl p-8 border border-slate-700/40 hover:border-slate-600/60 flex gap-5 transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-xl ${item.bg} flex-shrink-0 flex items-center justify-center`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="font-heading text-lg font-semibold text-white">{item.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                </FadeUp>
              ))}
            </div>

            {/* Vision statement */}
            <FadeUp delay={0.5} className="mt-16 text-center">
              <blockquote className="max-w-2xl mx-auto">
                <p className="text-lg md:text-xl text-slate-300 font-heading leading-relaxed italic">
                  &ldquo;The goal is not to build another AI tool. It&apos;s to build the intelligence infrastructure that every AI tool connects to.&rdquo;
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="w-8 h-px bg-blue-500/50" />
                  <span className="text-xs text-slate-500 font-mono tracking-widest uppercase">Amarktai Network Vision</span>
                  <span className="w-8 h-px bg-blue-500/50" />
                </div>
              </blockquote>
            </FadeUp>
          </div>
        </section>

        {/* ── BOTTOM CTA ────────────────────────────────────────────────── */}
        <section className="relative py-32 px-6">
          <div className="section-divider mb-24" />

          <FadeUp className="max-w-2xl mx-auto text-center flex flex-col items-center gap-8">
            <p className="text-xs font-mono tracking-widest uppercase text-emerald-400/70">Ecosystem Online</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold gradient-text">Join the Ecosystem</h2>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
              Explore the connected apps powered by{' '}
              <span className="text-white font-semibold">Amarkt</span>
              <span className="text-blue-400 font-semibold">AI</span>
              {' '}— and see what the intelligence layer makes possible.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link href="/apps" className="btn-primary group">
                Explore Apps
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/contact"
                className="px-6 py-3 text-sm font-semibold text-slate-300 border border-white/10 rounded-xl hover:bg-white/5 hover:text-white hover:border-white/20 transition-all duration-200"
              >
                Contact the Team
              </Link>
            </div>
          </FadeUp>
        </section>

      </main>

      <Footer />
    </>
  )
}
