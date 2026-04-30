'use client'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import {
  MessageSquare, ImageIcon, Mic, Video, Music, Workflow,
  Bot, Archive, Database, FolderGit2, ArrowRight,
  AppWindow, ChevronRight, Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const surfaces = [
  {
    icon: Sparkles, name: 'Aiva',
    desc: 'Your intelligent AI assistant. Chat, route tasks, generate content, run workflows, and navigate all capabilities through one unified interface.',
    tags: ['aiva', 'chat', 'routing'],
    accent: 'text-cyan-400',
  },
  {
    icon: FolderGit2, name: 'Repo Workbench',
    desc: 'Browse GitHub repos, edit files with AI assistance, review diffs, commit, push, create PRs, and trigger deployments from the operator console.',
    tags: ['github', 'code', 'deploy'],
    accent: 'text-emerald-400',
  },
  {
    icon: MessageSquare, name: 'Chat & Reasoning',
    desc: 'Task-aware language model routing and execution. Supports code gen, planning, analysis, and Q&A under one execution path.',
    tags: ['chat', 'code', 'reasoning'],
    accent: 'text-cyan-400',
  },
  {
    icon: ImageIcon, name: 'Image Generator',
    desc: 'High-fidelity image generation with provider-aware routing. Supports standard and adult-mode generation based on policy.',
    tags: ['image', 'visual', 'creative'],
    accent: 'text-blue-400',
  },
  {
    icon: ImageIcon, name: 'Image Editor',
    desc: 'Edit and refine generated images with AI-powered transformations, inpainting, and style adjustments.',
    tags: ['image', 'edit', 'creative'],
    accent: 'text-blue-400',
  },
  {
    icon: Mic, name: 'Voice STT / TTS',
    desc: 'STT and TTS pipelines with persona-aware voice routing. Audio artifacts stored in the artifact library.',
    tags: ['stt', 'tts', 'voice'],
    accent: 'text-violet-400',
  },
  {
    icon: Video, name: 'Video Generator',
    desc: 'Queue-backed video generation and planning with tracking and output artifact storage.',
    tags: ['video', 'generation'],
    accent: 'text-rose-400',
  },
  {
    icon: Music, name: 'Music Creator',
    desc: 'AI song generation with theme, genre, mood, vocals, lyrics, BPM, and cover art — all from one creation surface.',
    tags: ['music', 'audio', 'creative'],
    accent: 'text-amber-400',
  },
  {
    icon: Workflow, name: 'Workflows',
    desc: 'Repeatable multimodal task chains for production operations. Chain text, image, code, and audio steps.',
    tags: ['workflow', 'automation'],
    accent: 'text-emerald-400',
  },
  {
    icon: Archive, name: 'Artifacts',
    desc: 'Stored outputs across image, audio, video, text, and code — with provider, model, and prompt metadata.',
    tags: ['artifacts', 'storage', 'history'],
    accent: 'text-violet-400',
  },
  {
    icon: Bot, name: 'App Connectors',
    desc: 'Dedicated AI agents scoped to individual apps with capability controls, system prompts, and model policy selection.',
    tags: ['agents', 'apps', 'connectors'],
    accent: 'text-blue-400',
  },
  {
    icon: Database, name: 'Memory Layer',
    desc: 'Retrieval-aware context and cross-session persistence where enabled. Keeps useful context across app interactions.',
    tags: ['memory', 'retrieval', 'context'],
    accent: 'text-slate-400',
  },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, delay },
})

export default function AppsPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <Header />
      <main className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-label text-violet-300">Capability surfaces</p>
            <h1 className="text-display mt-4 max-w-5xl">
              One orchestration layer. Every AI capability you actually need.
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-slate-300">
              Every surface runs through the same operator runtime: shared intelligent routing, shared policy controls, shared artifacts, and shared operator visibility. No disconnected wrappers.
            </p>
          </motion.div>

          {/* Aiva badge */}
          <motion.div {...fadeUp(0.1)} className="mt-8">
            <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-cyan-300">All capabilities are accessible through <strong>Aiva</strong> — your intelligent operations layer</span>
            </div>
          </motion.div>

          {/* Capability grid */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {surfaces.map((app, i) => (
              <motion.div
                key={app.name}
                {...fadeUp(i * 0.04)}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between">
                  <app.icon className={`h-5 w-5 ${app.accent}`} />
                </div>
                <h2 className="mt-4 text-base font-semibold text-white">{app.name}</h2>
                <p className="mt-2 text-sm text-slate-400">{app.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {app.tags.map(tag => (
                    <span key={tag} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Operator note */}
          <motion.div {...fadeUp(0.2)} className="mt-14">
            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0a1226] to-[#040916] p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AppWindow className="h-4 w-4 text-blue-400" />
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-400">Operator console</p>
                  </div>
                  <h2 className="text-lg font-semibold text-white max-w-xl">
                    All capabilities are accessible from the operator dashboard — not separate tools, not separate logins.
                  </h2>
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
                    <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" /> Configure which capabilities each app agent can access</li>
                    <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" /> Set model policy per app (best / balanced / cheap / fixed)</li>
                    <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" /> Monitor requests, artifacts, and events per app</li>
                  </ul>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link href="/about" className="btn-ghost whitespace-nowrap">Architecture</Link>
                  <Link href="/contact" className="btn-primary whitespace-nowrap">
                    Request Access <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
