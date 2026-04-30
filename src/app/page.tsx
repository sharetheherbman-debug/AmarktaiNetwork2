'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  MessageSquare,
  ImageIcon,
  Mic,
  Video,
  Bot,
  Workflow,
  Archive,
  Database,
  FolderGit2,
  Music,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import NetworkPulseBackground from '@/components/visual/NetworkPulseBackground'

const capabilities = [
  { icon: Sparkles,     label: 'Aiva Assistant',       desc: 'Intelligent chat, routing, and task execution in one interface.' },
  { icon: MessageSquare, label: 'Chat & Reasoning',    desc: 'Task-aware routing across language models.' },
  { icon: ImageIcon,    label: 'Image Generation',     desc: 'High-fidelity visuals with provider fallback.' },
  { icon: Mic,          label: 'Voice Stack',           desc: 'STT, TTS, and persona-aware voice flows.' },
  { icon: Video,        label: 'Video Pipelines',       desc: 'Queue-backed generation under one surface.' },
  { icon: Music,        label: 'Music Creation',        desc: 'AI song generation with lyrics, vocals, and cover art.' },
  { icon: Bot,          label: 'App Agents',            desc: 'App-scoped agents with policy and memory.' },
  { icon: Workflow,     label: 'Workflows',             desc: 'Chain multimodal tasks for production ops.' },
  { icon: Archive,      label: 'Artifacts',             desc: 'Stored outputs across image, audio, code.' },
  { icon: Database,     label: 'Memory Layer',          desc: 'Cross-session context where configured.' },
  { icon: FolderGit2,   label: 'Repo Workbench',        desc: 'Edit, push, PR, and deploy from operator console.' },
]

const workflowSteps = [
  {
    step: '01',
    title: 'Describe your task',
    body: 'Tell Aiva what you need — chat, generate media, build a workflow, edit code, or automate a process.',
    color: 'text-cyan-400',
  },
  {
    step: '02',
    title: 'Aiva understands and routes',
    body: 'Aiva intelligently routes your request to the right capability, model, and provider for the task.',
    color: 'text-blue-400',
  },
  {
    step: '03',
    title: 'Controlled execution',
    body: 'Smart provider selection runs with policy layers, memory hooks, and fallback logic attached.',
    color: 'text-violet-400',
  },
  {
    step: '04',
    title: 'Output & artifacts',
    body: 'Generated outputs, artifacts, and traces surface in the workspace for inspection and iteration.',
    color: 'text-emerald-400',
  },
]

/** Animated "dashboard preview" — minimal CSS art representing the console */
function DashboardPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#050d1e] shadow-2xl">
      {/* Fake title bar */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
        <span className="ml-3 text-[10px] text-slate-600 font-mono">AmarktAI Network — Workspace</span>
      </div>
      {/* Fake sidebar + main */}
      <div className="flex h-56 gap-0">
        {/* Sidebar */}
        <div className="w-32 shrink-0 border-r border-white/[0.07] px-2 py-3 space-y-0.5">
          {['Workspace','Repo Workbench','Music Studio','Image Studio','Artifacts','Settings'].map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              className={`rounded-lg px-2 py-1.5 text-[10px] ${i === 0 ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-600'}`}
            >
              {item}
            </motion.div>
          ))}
        </div>
        {/* Main area */}
        <div className="flex-1 overflow-hidden p-4 space-y-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="h-2 w-32 rounded bg-white/10"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="h-14 w-full rounded-lg border border-white/[0.06] bg-white/[0.03]"
          />
          <div className="grid grid-cols-3 gap-1.5">
            {[0,1,2].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 + i * 0.1 }}
                className="h-16 rounded-lg border border-white/[0.06] bg-white/[0.02]"
              />
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="h-2 w-20 rounded bg-cyan-400/20"
          />
        </div>
      </div>
    </div>
  )
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
})

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden px-4 pt-24 sm:px-6 lg:px-8">
        <NetworkPulseBackground className="opacity-90" />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-label mb-5 text-cyan-300"
          >
            Amarkt<span className="text-blue-400">AI</span> Network · Powered by Aiva
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-display max-w-5xl"
          >
            Your AI operating system for{' '}
            <span className="gradient-text">apps, agents, media, code, workflows, and automation.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg text-slate-300"
          >
            Meet Aiva — your intelligent operations layer. One console for chat, image, video, voice,
            music, code, agents, GitHub, and deployments. Every capability connected, every output tracked.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link href="/admin/login" className="btn-primary">
              Enter Workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/apps" className="btn-ghost">
              Explore Capabilities
            </Link>
            <Link href="/contact" className="btn-ghost">
              Contact
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Meet Aiva ────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()}>
            <p className="text-label text-cyan-300">Meet Aiva</p>
            <h2 className="text-headline mt-3 max-w-3xl">
              Your intelligent operations layer — one AI for everything.
            </h2>
            <p className="mt-4 max-w-2xl text-slate-400">
              Aiva understands your intent, routes tasks to the right capability, manages memory and context,
              and returns structured outputs — all from one interface. No switching tools. No disconnected workflows.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── How it works — horizontal flow ──────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()}>
            <p className="text-label text-blue-300">How it works</p>
            <h2 className="text-headline mt-3 max-w-3xl">
              From idea to output in four steps.
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((s, i) => (
              <motion.div key={s.step} {...fadeUp(i * 0.08)}>
                <div className="relative pl-4 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-gradient-to-b before:from-white/20 before:to-transparent">
                  <p className={`text-[11px] font-bold tracking-[0.14em] uppercase ${s.color}`}>{s.step}</p>
                  <h3 className="mt-2 text-base font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard preview + differentiators — split panel ────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: dashboard preview */}
            <motion.div {...fadeUp()}>
              <DashboardPreview />
            </motion.div>
            {/* Right: content */}
            <motion.div {...fadeUp(0.1)} className="space-y-6">
              <div>
                <p className="text-label text-violet-300">Operator console</p>
                <h2 className="text-headline mt-3">
                  One workspace for the full AI development lifecycle.
                </h2>
                <p className="mt-4 text-slate-400">
                  Build apps, test models, edit code in GitHub repos, run agents, review generated
                  artifacts, and trigger deployments — all from the same operator surface.
                </p>
              </div>
              <ul className="space-y-3">
                {[
                  { color: 'bg-cyan-400',    text: 'Aiva — intelligent chat, routing, and task execution' },
                  { color: 'bg-blue-400',    text: 'GitHub repo editing, commit, PR, and deploy triggers' },
                  { color: 'bg-violet-400',  text: 'App agent configuration and monitoring' },
                  { color: 'bg-emerald-400', text: 'Artifact library — text, image, audio, video, code' },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.color}`} />
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="btn-primary inline-flex">
                Request access <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Capability grid ───────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()}>
            <p className="text-label text-amber-300">Full capability surface</p>
            <h2 className="text-headline mt-3 max-w-3xl">
              One intelligent layer. Every capability you actually need.
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.label}
                {...fadeUp(i * 0.03)}
                className="group flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
              >
                <cap.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-300 group-hover:text-cyan-300 transition-colors" />
                <div>
                  <p className="text-sm font-medium text-white">{cap.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{cap.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GitHub-to-Deploy flow visual ──────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <motion.div {...fadeUp()} className="space-y-5">
              <div>
                <p className="text-label text-emerald-300">GitHub workflow</p>
                <h2 className="text-headline mt-3">
                  From code edit to deployed branch — without leaving the console.
                </h2>
                <p className="mt-4 text-slate-400">
                  Connect your GitHub repos, browse file trees, let Aiva generate or refactor code, review diffs, push branches, create PRs, and trigger workflow_dispatch deploys — all from the Workspace panel.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Connect repo', 'Browse files', 'Edit with AI', 'Review diff', 'Commit + push', 'Trigger deploy'].map((step, i) => (
                  <motion.span
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300"
                  >
                    <span className="text-emerald-400 font-bold">{i + 1}.</span> {step}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Flow diagram — CSS */}
            <motion.div {...fadeUp(0.1)}>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-3">
                {[
                  { label: 'GitHub Repo',         color: 'border-slate-600/60  bg-slate-700/20',      dot: 'bg-slate-400' },
                  { label: 'AI Code Edit (Aiva)',  color: 'border-blue-500/30   bg-blue-500/[0.05]',   dot: 'bg-blue-400' },
                  { label: 'Diff Review',          color: 'border-violet-500/30 bg-violet-500/[0.05]', dot: 'bg-violet-400' },
                  { label: 'Commit + PR',          color: 'border-emerald-500/30 bg-emerald-500/[0.05]', dot: 'bg-emerald-400' },
                  { label: 'Workflow Deploy',      color: 'border-cyan-500/30   bg-cyan-500/[0.05]',   dot: 'bg-cyan-400' },
                ].map((row, i, arr) => (
                  <div key={row.label} className="relative">
                    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-slate-300 ${row.color}`}>
                      <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                      {row.label}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ChevronRight className="h-3.5 w-3.5 rotate-90 text-slate-700" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            {...fadeUp()}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1226] to-[#040916] p-10 text-center"
          >
            <h2 className="text-headline">
              Not a chatbot. Not a demo wrapper. An AI operating layer.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-slate-400">
              Request controlled access for teams building production AI products that need orchestration quality, reliability, and full operator visibility.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/apps" className="btn-ghost">View Capabilities</Link>
              <Link href="/contact" className="btn-primary">
                Request Operator Access <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
