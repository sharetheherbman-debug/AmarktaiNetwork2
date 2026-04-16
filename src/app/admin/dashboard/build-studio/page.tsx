'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FlaskConical, Code2, Workflow, GitBranch,
  Layers, ImageIcon, Mic, Film, Music,
  Rocket, Sparkles,
} from 'lucide-react'

/* ── Lazy tab imports ────────────────────────────────────────── */
import dynamic from 'next/dynamic'

const TestAITab = dynamic(() => import('./tabs/TestAITab'), { ssr: false })
const CreateAppTab = dynamic(() => import('./tabs/CreateAppTab'), { ssr: false })
const AppBuilderTab = dynamic(() => import('./tabs/AppBuilderTab'), { ssr: false })
const CreatorStudioTab = dynamic(() => import('./tabs/CreatorStudioTab'), { ssr: false })
const WorkflowBuilderTab = dynamic(() => import('./tabs/WorkflowBuilderTab'), { ssr: false })
const GitHubTab = dynamic(() => import('./tabs/GitHubTab'), { ssr: false })
const CompareTab = dynamic(() => import('./tabs/CompareTab'), { ssr: false })

/* ── Tab sections — grouped for clarity ──────────────────────── */

interface TabDef {
  key: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  color: string
}

interface TabSection {
  label: string
  tabs: TabDef[]
}

const SECTIONS: TabSection[] = [
  {
    label: 'Test & Compare',
    tabs: [
      { key: 'test-ai', label: 'Test AI', icon: FlaskConical, color: 'text-blue-400' },
      { key: 'compare', label: 'Compare', icon: Layers, color: 'text-indigo-400' },
    ],
  },
  {
    label: 'Create',
    tabs: [
      { key: 'app-builder', label: 'App Builder', icon: Rocket, color: 'text-emerald-400' },
      { key: 'create-app', label: 'Quick Scaffold', icon: Code2, color: 'text-teal-400' },
      { key: 'workflows', label: 'Workflows', icon: Workflow, color: 'text-rose-400' },
    ],
  },
  {
    label: 'Media',
    tabs: [
      { key: 'images', label: 'Images', icon: ImageIcon, color: 'text-pink-400' },
      { key: 'voice', label: 'Voice', icon: Mic, color: 'text-violet-400' },
      { key: 'video', label: 'Video', icon: Film, color: 'text-cyan-400' },
      { key: 'music', label: 'Music', icon: Music, color: 'text-amber-400' },
    ],
  },
  {
    label: 'Deploy',
    tabs: [
      { key: 'export', label: 'Export', icon: GitBranch, color: 'text-slate-400' },
    ],
  },
]

const ALL_TABS = SECTIONS.flatMap(s => s.tabs)
type TabKey = string

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

export default function BuildStudioPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('test-ai')

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/[0.06] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Studio</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Test AI · Build apps · Generate media · Compare models · Deploy
            </p>
          </div>
        </div>
      </motion.div>

      {/* Grouped tab bar */}
      <motion.div variants={fadeUp} className="flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-thin">
        {SECTIONS.map((section, si) => (
          <div key={section.label} className="flex items-center">
            {si > 0 && <div className="w-px h-5 bg-white/[0.06] mx-2 shrink-0" />}
            <div className="flex items-center gap-0.5">
              {section.tabs.map((tab) => {
                const active = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`group flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium whitespace-nowrap rounded-xl transition-all duration-200
                      ${active
                        ? 'text-white bg-white/[0.06] border border-white/[0.10] shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                      }`}
                  >
                    <tab.icon className={`w-4 h-4 ${active ? tab.color : 'group-hover:text-white'}`} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Section label */}
      <motion.div variants={fadeUp}>
        {(() => {
          const section = SECTIONS.find(s => s.tabs.some(t => t.key === activeTab))
          const tab = ALL_TABS.find(t => t.key === activeTab)
          if (!section || !tab) return null
          return (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 uppercase tracking-[0.12em] font-semibold">
              <span>{section.label}</span>
              <span>·</span>
              <span className="text-slate-400">{tab.label}</span>
            </div>
          )
        })()}
      </motion.div>

      {/* Tab content */}
      <motion.div variants={fadeUp}>
        {activeTab === 'test-ai'     && <TestAITab />}
        {activeTab === 'compare'     && <CompareTab />}
        {activeTab === 'app-builder' && <AppBuilderTab />}
        {activeTab === 'create-app'  && <CreateAppTab />}
        {activeTab === 'images'      && <CreatorStudioTab initialMode="image" />}
        {activeTab === 'voice'       && <CreatorStudioTab initialMode="voice" />}
        {activeTab === 'video'       && <CreatorStudioTab initialMode="video" />}
        {activeTab === 'music'       && <CreatorStudioTab initialMode="music" />}
        {activeTab === 'workflows'   && <WorkflowBuilderTab />}
        {activeTab === 'export'      && <GitHubTab />}
      </motion.div>
    </motion.div>
  )
}
