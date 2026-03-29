'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import {
  Brain, Target, Globe, Zap, Shield, Users, ArrowRight, Network, Cpu,
  Layers, Sparkles, Eye, Puzzle, Lightbulb, Rocket, BrainCircuit,
} from 'lucide-react'
import Link from 'next/link'

// ── Scroll-triggered fade ────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Data ─────────────────────────────────────────────────────────────────────

const VALUES = [
  { icon: Brain,   title: 'Intelligence First', description: 'AI is not an afterthought — it is the foundation. Every system we build has intelligence embedded at its core architecture.', color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  { icon: Target,  title: 'Precision',          description: 'We obsess over details. From database schemas to pixel-perfect UIs, precision defines every artifact we ship.',            color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  { icon: Shield,  title: 'Security',           description: 'Privacy and security are not features — they are foundational principles baked into every layer of our platform.',          color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { icon: Zap,     title: 'Adaptability',        description: 'Real-world demands change fast. Our architecture adapts in real time — routing, scaling, and evolving without downtime.',   color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  { icon: Eye,     title: 'Transparency',        description: 'Every decision our system makes is observable. Full audit trails, clear reasoning chains, and open monitoring dashboards.', color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  { icon: Puzzle,  title: 'Ecosystem Thinking',  description: 'No platform exists alone. We design for interconnection — every app strengthens every other app in the network.',          color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20' },
]

const MILESTONES = [
  { year: '2022', title: 'Concept',          description: 'AmarktAI conceived as a vision: one intelligence layer powering an interconnected ecosystem of AI-first products.',    icon: Lightbulb,   color: 'from-blue-500 to-cyan-500' },
  { year: '2023', title: 'Architecture',     description: 'Deep research phase. System architecture designed — multi-model routing, shared context store, and the brain API defined.', icon: BrainCircuit, color: 'from-cyan-500 to-violet-500' },
  { year: '2024', title: 'Beta',             description: 'Full-scale development sprint. Core platform built. Crypto and Companion enter closed beta with early testers.',         icon: Cpu,         color: 'from-violet-500 to-purple-500' },
  { year: '2025', title: 'Launch',           description: 'Platform goes operational. Connected apps go live. Intelligence layer actively orchestrating across production workloads.', icon: Rocket,      color: 'from-purple-500 to-blue-500' },
  { year: '2026', title: 'Ecosystem Growth', description: 'Open developer APIs. New verticals — Health, Travel, Marketing — join the network. Compounding intelligence at scale.',  icon: Network,     color: 'from-blue-500 to-emerald-500' },
]

const PILLARS = [
  { icon: Cpu,    title: 'AI Orchestration Layer', desc: 'Multi-model orchestration, shared memory, real-time monitoring, and automation — the shared intelligence layer powering every connected app.' },
  { icon: Network, title: 'Connected Ecosystem',    desc: 'A growing network of connected apps sharing one intelligence layer — each platform feeds data and context back into AmarktAI.' },
  { icon: Layers,  title: 'Full-Stack Ownership',   desc: 'We own every layer: from model routing to UI polish. No handoffs. No compromises. Complete vertical integration.' },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050816]">
      <Header />

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative pt-40 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-600/6 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-cyan-600/5 rounded-full blur-[80px]" />
          <div className="absolute inset-0 grid-bg opacity-25" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full text-xs text-blue-400 mb-8 border border-blue-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            About AmarktAI Network
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight"
          >
            <span className="text-white">Building the Future</span>
            <br />
            <span className="text-white">of&nbsp;</span>
            <span className="gradient-text">AI Operations</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            AmarktAI Network is the central intelligence layer that orchestrates, monitors, and
            powers an entire ecosystem of connected platforms — not just another AI tool, but the
            brain behind every app.
          </motion.p>
        </div>
      </section>

      {/* ── Vision — What is AmarktAI Network? ─────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeUp>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 glass rounded-full text-xs text-cyan-400 mb-6 border border-cyan-500/20">
                <Globe className="w-3 h-3" />
                Our Vision
              </div>
              <h2 className="font-heading text-4xl lg:text-5xl font-extrabold text-white mb-6">
                What is{' '}
                <span className="gradient-text-blue-cyan">AmarktAI Network</span>?
              </h2>
              <p className="text-slate-400 leading-relaxed mb-5">
                AmarktAI Network is the shared intelligence layer powering AI operations across every
                connected app in our ecosystem. It handles multi-model orchestration, adaptive execution,
                real-time monitoring, and intelligent automation — so each app operates with the full
                power of the network behind it.
              </p>
              <p className="text-slate-400 leading-relaxed mb-5">
                This is not another AI wrapper or chatbot skin. AmarktAI is the <em className="text-white/80 not-italic font-medium">operations platform</em> that
                makes a growing constellation of intelligent apps think, learn, and act as one.
              </p>
              <p className="text-slate-400 leading-relaxed mb-8">
                Engineered to a premium global standard. Every model call, every routing decision, every
                byte of shared context flows through one central brain — creating compounding intelligence
                that no standalone product can match.
              </p>
              <Link href="/apps" className="btn-primary group inline-flex">
                Explore the Ecosystem
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
              </Link>
            </FadeUp>

            <div className="space-y-4">
              {PILLARS.map((p, i) => (
                <FadeUp key={p.title} delay={i * 0.12}>
                  <motion.div
                    whileHover={{ x: 6, transition: { duration: 0.2 } }}
                    className="glass-card rounded-xl p-5 flex gap-4 ring-hover"
                  >
                    <div className="w-11 h-11 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-400 border border-blue-500/20">
                      <p.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold text-white mb-1">{p.title}</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
                    </div>
                  </motion.div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Timeline ───────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A1020]/50 to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <FadeUp className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 glass rounded-full text-xs text-violet-400 mb-5 border border-violet-500/20">
              <Target className="w-3 h-3" />
              Our Journey
            </div>
            <h2 className="font-heading text-4xl lg:text-5xl font-extrabold text-white mb-4">
              From Concept to <span className="gradient-text-violet">Ecosystem</span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              A multi-year mission to build the definitive intelligence layer for connected applications.
            </p>
          </FadeUp>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-violet-500/50 to-emerald-500/30" />

            <div className="space-y-14">
              {MILESTONES.map((m, i) => (
                <FadeUp key={m.year} delay={i * 0.1}>
                  <div className={`relative flex flex-col sm:flex-row gap-6 items-start ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
                    {/* Dot on line */}
                    <div className={`absolute left-8 sm:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-br ${m.color} border-2 border-[#050816] shadow-lg z-10 mt-6`} />

                    {/* Card */}
                    <div className={`ml-16 sm:ml-0 sm:w-[calc(50%-2.5rem)] ${i % 2 === 0 ? 'sm:mr-10' : 'sm:ml-10'}`}>
                      <motion.div
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className="glass-card rounded-2xl p-6 ring-hover"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${m.color} text-white text-xs font-bold`}>
                            <m.icon className="w-3 h-3" />
                            {m.year}
                          </div>
                        </div>
                        <h3 className="font-heading text-xl font-bold text-white mb-2">{m.title}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{m.description}</p>
                      </motion.div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Values ────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <FadeUp className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 glass rounded-full text-xs text-blue-400 mb-5 border border-blue-500/20">
              <Brain className="w-3 h-3" />
              How We Think
            </div>
            <h2 className="font-heading text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Our <span className="gradient-text">Core Values</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              These are not corporate buzzwords. These are the real principles that guide every
              decision, every line of code, and every product we ship.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map((v, i) => (
              <FadeUp key={v.title} delay={i * 0.06}>
                <motion.div
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className={`glass-card rounded-2xl p-6 ring-hover border ${v.border} cursor-default h-full`}
                >
                  <div className={`w-11 h-11 rounded-xl ${v.bg} flex items-center justify-center mb-4 ${v.color}`}>
                    <v.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-semibold text-white mb-2">{v.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{v.description}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why This Approach ──────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A1020]/40 to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto relative">
          <FadeUp>
            <div className="glass rounded-3xl p-10 sm:p-14 relative overflow-hidden border border-violet-500/15">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 via-transparent to-blue-600/8 pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 glass rounded-full text-xs text-violet-400 mb-6 border border-violet-500/20">
                  <Users className="w-3 h-3" />
                  Our Philosophy
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mb-6">
                  Why We Build <span className="gradient-text-violet">This Way</span>
                </h2>
                <div className="space-y-4 text-slate-400 leading-relaxed">
                  <p>
                    Most AI companies build standalone products — a chatbot here, an analytics tool there.
                    Each operates in isolation, duplicating infrastructure and losing context between interactions.
                  </p>
                  <p>
                    We took a fundamentally different approach. Instead of building siloed products, we built
                    <span className="text-white/80 font-medium"> one intelligence layer</span> that powers everything.
                    Every app in our ecosystem connects to the same brain. Insights from finance sharpen marketing.
                    Community signals inform employment matching. Travel patterns enhance personalisation everywhere.
                  </p>
                  <p>
                    The result: a network that gets exponentially smarter with every app that connects — creating
                    compounding value that no standalone product can replicate.
                  </p>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <FadeUp>
            <div className="glass rounded-3xl p-12 relative overflow-hidden border border-blue-500/15">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 to-violet-600/8 pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

              <div className="relative z-10">
                <h2 className="font-heading text-4xl font-extrabold text-white mb-4">
                  Join the Network
                </h2>
                <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                  Whether you want to collaborate, integrate, or learn more about what we&apos;re
                  building — we&apos;d love to hear from you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/contact" className="btn-primary group">
                    Get in Touch
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  </Link>
                  <Link href="/apps" className="btn-ghost">
                    Explore the Ecosystem
                  </Link>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <Footer />
    </div>
  )
}
