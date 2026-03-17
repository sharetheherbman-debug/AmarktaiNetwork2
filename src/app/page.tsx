'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import NetworkCanvas from '@/components/NetworkCanvas'
import {
  Brain,
  Globe,
  Zap,
  Shield,
  BarChart2,
  Server,
  ArrowRight,
  Cpu,
  Lock,
  Layers,
  TrendingUp,
  Activity,
  Database,
  CheckCircle,
  Sparkles,
  Wifi,
} from 'lucide-react'

/* ─── Live Terminal Feed ────────────────────────────────────── */
const logPool = [
  { label: 'MODEL', text: 'GPT-4 inference engine — online', color: 'text-cyan-400' },
  { label: 'DATA', text: () => `Real-time market feed — ${(Math.floor(Math.random()*400)+600)} signals/s`, color: 'text-blue-400' },
  { label: 'RISK', text: () => `Portfolio risk model — accuracy ${(93+Math.random()*3).toFixed(1)}%`, color: 'text-green-400' },
  { label: 'PATTERN', text: 'Anomaly detected in BTC/USD — flagging', color: 'text-yellow-400' },
  { label: 'NLP', text: () => `Sentiment scan — ${(11000+Math.floor(Math.random()*3000)).toLocaleString()} docs indexed`, color: 'text-violet-400' },
  { label: 'ALERT', text: 'Threat signature matched — quarantine applied', color: 'text-red-400' },
  { label: 'LEARN', text: () => `Checkpoint saved — epoch ${Math.floor(Math.random()*200)+800} / 1000`, color: 'text-cyan-400' },
  { label: 'SYS', text: () => `All systems nominal — uptime ${(99.9+Math.random()*0.09).toFixed(2)}%`, color: 'text-green-400' },
  { label: 'API', text: () => `${Math.floor(Math.random()*500)+1200} req/s — p99: ${Math.floor(Math.random()*30)+18}ms`, color: 'text-blue-400' },
  { label: 'SYNC', text: 'Cross-app data layer synced — 6 nodes active', color: 'text-teal-400' },
  { label: 'AUTH', text: () => `${Math.floor(Math.random()*40)+120} auth events processed`, color: 'text-violet-400' },
  { label: 'INFER', text: () => `Sub-${Math.floor(Math.random()*30)+55}ms inference — batch complete`, color: 'text-cyan-400' },
  { label: 'CACHE', text: () => `Cache hit ratio: ${(87+Math.random()*10).toFixed(1)}%`, color: 'text-emerald-400' },
  { label: 'SCHED', text: 'Training job scheduled — queue position 1', color: 'text-yellow-400' },
]

function getTimestamp() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}

function resolveText(t: string | (() => string)): string {
  return typeof t === 'function' ? t() : t
}

interface LogLine { id: number; time: string; label: string; text: string; color: string }

function LiveTerminal() {
  const [lines, setLines] = useState<LogLine[]>([])
  const [cursor, setCursor] = useState(true)
  const idRef = useRef(100)
  const poolIdxRef = useRef(6)

  useEffect(() => {
    // Populate initial lines on the client only to avoid hydration mismatch
    setLines(
      logPool.slice(0, 6).map((l, i) => ({
        id: i,
        time: getTimestamp(),
        label: l.label,
        text: resolveText(l.text),
        color: l.color,
      }))
    )
    const cursorInterval = setInterval(() => setCursor(v => !v), 530)
    const lineInterval = setInterval(() => {
      const entry = logPool[poolIdxRef.current % logPool.length]
      poolIdxRef.current += 1
      const newLine: LogLine = {
        id: idRef.current++,
        time: getTimestamp(),
        label: entry.label,
        text: resolveText(entry.text),
        color: entry.color,
      }
      setLines(prev => [...prev.slice(-9), newLine])
    }, 1600)
    return () => { clearInterval(cursorInterval); clearInterval(lineInterval) }
  }, [])

  return (
    <div className="terminal rounded-2xl overflow-hidden ring-1 ring-blue-500/15">
      <div className="terminal-header">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-4 text-xs text-blue-400/50 font-mono flex items-center gap-2">
            amarktai-ai v2.4.1
            <span className="inline-flex items-center gap-1 text-green-400/70">
              <Wifi size={10} />
              <span className="text-[10px]">live</span>
            </span>
          </span>
        </div>
      </div>
      <div className="p-5 font-mono text-[11px] h-[300px] overflow-hidden flex flex-col justify-end">
        <div className="space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-3"
              >
                <span className="text-blue-500/35 shrink-0">[{line.time}]</span>
                <span className={`font-bold shrink-0 w-[4.5rem] ${line.color}`}>{line.label}</span>
                <span className="text-blue-100/65">{line.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="flex gap-3 pt-1">
            <span className="text-blue-500/35">{'>'}</span>
            <span className={`text-cyan-400 font-bold transition-opacity duration-100 ${cursor ? 'opacity-100' : 'opacity-0'}`}>█</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Data ──────────────────────────────────────────────────── */
const capabilities = [
  {
    icon: Brain,
    title: 'AI Systems',
    description: 'End-to-end machine learning pipelines, real-time inference engines, and intelligent automation at scale.',
    color: 'text-blue-400',
  },
  {
    icon: Globe,
    title: 'Web Applications',
    description: 'High-performance, real-time web apps built on modern frameworks with seamless, production-grade UX.',
    color: 'text-cyan-400',
  },
  {
    icon: Zap,
    title: 'Automation',
    description: 'Intelligent workflow automation that eliminates friction and multiplies business velocity.',
    color: 'text-violet-400',
  },
  {
    icon: Server,
    title: 'Infrastructure',
    description: 'Resilient cloud-native architecture designed for massive scale and zero-downtime deployments.',
    color: 'text-teal-400',
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Defense-in-depth security with real-time threat detection and zero-trust architecture at every layer.',
    color: 'text-emerald-400',
  },
  {
    icon: BarChart2,
    title: 'Analytics',
    description: 'Deep data intelligence with AI-powered dashboards that surface insights and drive decisions.',
    color: 'text-blue-400',
  },
]

const differentiators = [
  {
    icon: Cpu,
    title: 'AI-Native Architecture',
    description:
      'Every product is designed from first principles with artificial intelligence at its core — not bolted on as an afterthought.',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/25',
    glowColor: 'rgba(59,130,246,0.06)',
  },
  {
    icon: Layers,
    title: 'Ecosystem Thinking',
    description:
      'Our apps interoperate by design, creating a compounding intelligence network that grows more powerful with each new addition.',
    color: 'text-violet-400',
    borderColor: 'border-violet-500/25',
    glowColor: 'rgba(139,92,246,0.06)',
  },
  {
    icon: Globe,
    title: 'Africa → World',
    description:
      'Built in Africa, engineered for the world. We solve real, hard problems for real people — and then export that intelligence globally.',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/25',
    glowColor: 'rgba(34,211,238,0.06)',
  },
  {
    icon: Lock,
    title: 'Security First',
    description:
      'Enterprise-grade security woven into every layer of every application. Your data, your control — always. Non-negotiable.',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/25',
    glowColor: 'rgba(16,185,129,0.06)',
  },
]

const aiFeatures = [
  {
    icon: Activity,
    title: 'Real-Time Inference',
    description: 'Sub-100ms model inference flowing across every application in the ecosystem.',
  },
  {
    icon: Database,
    title: 'Unified Data Layer',
    description: 'A shared data fabric powering cross-app intelligence and compounding insights.',
  },
  {
    icon: TrendingUp,
    title: 'Continuous Learning',
    description: 'Models retrain automatically on new data streams — always improving.',
  },
  {
    icon: CheckCircle,
    title: 'Explainable AI',
    description: 'Every decision is transparent, auditable, and fully traceable.',
  },
]

/* ─── Variant Definitions ───────────────────────────────────── */
const sectionVariants = {
  hidden: { opacity: 0, y: 56 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' as const, staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

/* ─── Page Component ────────────────────────────────────────── */
export default function HomePage() {
  /* Parallax */
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '35%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  /* Section visibility */
  const platformRef = useRef<HTMLElement>(null)
  const whyRef = useRef<HTMLElement>(null)
  const aiRef = useRef<HTMLElement>(null)
  const ecosystemRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)

  const platformInView = useInView(platformRef, { once: true, margin: '-80px' })
  const whyInView = useInView(whyRef, { once: true, margin: '-80px' })
  const aiInView = useInView(aiRef, { once: true, margin: '-80px' })
  const ecosystemInView = useInView(ecosystemRef, { once: true, margin: '-80px' })
  const ctaInView = useInView(ctaRef, { once: true, margin: '-80px' })

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-x-hidden">
      <Header />

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-end justify-center overflow-hidden pb-16 sm:pb-20"
      >
        {/* Network canvas */}
        <NetworkCanvas className="absolute inset-0 w-full h-full" />

        {/* Grid */}
        <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />

        {/* Aurora blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-[15%] left-[15%] w-[700px] h-[700px] bg-blue-600/12 rounded-full blur-[140px]"
            animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.18, 0.12] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[30%] right-[10%] w-[550px] h-[550px] bg-violet-600/12 rounded-full blur-[120px]"
            animate={{ scale: [1, 1.06, 1], opacity: [0.12, 0.17, 0.12] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
          <motion.div
            className="absolute bottom-[10%] left-[45%] w-[450px] h-[450px] bg-cyan-500/8 rounded-full blur-[100px]"
            animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.13, 0.08] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        {/* Radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, #050816 90%)',
          }}
        />

        {/* Content — parallax wrapper */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 container mx-auto px-6 text-center pt-24 lg:pt-28"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2.5 glass px-5 py-2.5 rounded-full mb-6 border border-blue-500/20"
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <span className="text-sm font-medium text-blue-200 tracking-wide">
              Building Africa&apos;s Most Advanced AI Platform
            </span>
            <Sparkles size={13} className="text-cyan-400" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-[clamp(2.5rem,6.5vw,5rem)] font-black leading-[0.93] tracking-tight mb-5"
          >
            <span className="block text-white/85">Intelligence</span>
            <span className="block gradient-text-blue-cyan py-1">Engineered</span>
            <span className="block text-white/85">for Impact</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="max-w-2xl mx-auto text-base md:text-lg text-blue-100/60 mb-10 leading-relaxed"
          >
            Amarktai Network is an interconnected portfolio of AI applications built to
            transform how Africa works, learns, trades, and connects — and export that
            intelligence to the world.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/apps"
              className="btn-primary px-8 py-4 rounded-full text-base font-semibold inline-flex items-center justify-center gap-2 group"
            >
              Explore the Network
              <ArrowRight
                size={17}
                className="group-hover:translate-x-1 transition-transform duration-200"
              />
            </Link>
            <Link
              href="/about"
              className="btn-ghost px-8 py-4 rounded-full text-base font-semibold inline-flex items-center justify-center gap-2"
            >
              Learn About Us
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <div className="section-divider" />

      {/* ── THE PLATFORM ──────────────────────────────────────── */}
      <motion.section
        ref={platformRef}
        variants={sectionVariants}
        initial="hidden"
        animate={platformInView ? 'visible' : 'hidden'}
        className="relative py-32 px-6"
      >
        {/* Subtle background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-20">
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6 border border-blue-500/20"
            >
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-[0.18em]">
                The Platform
              </span>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-6xl font-black mb-5 tracking-tight"
            >
              What We{' '}
              <span className="gradient-text">Build</span>
            </motion.h2>

            <motion.p variants={itemVariants} className="text-blue-100/45 text-lg max-w-xl mx-auto">
              Six core capabilities powering every product in the Amarktai ecosystem.
            </motion.p>
          </div>

          {/* Cards grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap) => (
              <motion.div
                key={cap.title}
                variants={itemVariants}
                whileHover={{
                  borderColor: 'rgba(59,130,246,0.35)',
                  boxShadow: '0 0 32px rgba(59,130,246,0.08)',
                }}
                className="glass-card p-7 rounded-2xl border border-white/[0.06] transition-colors duration-300 cursor-default"
              >
                <div
                  className={`w-11 h-11 rounded-xl glass flex items-center justify-center mb-5 ${cap.color}`}
                >
                  <cap.icon size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{cap.title}</h3>
                <p className="text-sm text-blue-100/45 leading-relaxed">{cap.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="section-divider" />

      {/* ── WHY AMARKTAI ──────────────────────────────────────── */}
      <motion.section
        ref={whyRef}
        variants={sectionVariants}
        initial="hidden"
        animate={whyInView ? 'visible' : 'hidden'}
        className="relative py-32 px-6 overflow-hidden"
      >
        {/* Violet aurora */}
        <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/7 rounded-full blur-[130px] pointer-events-none" />

        <div className="relative container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6 border border-violet-500/20"
            >
              <span className="text-[11px] font-bold text-violet-400 uppercase tracking-[0.18em]">
                Differentiators
              </span>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-6xl font-black mb-5 tracking-tight"
            >
              Why{' '}
              <span className="gradient-text-aurora">Amarktai</span>
            </motion.h2>

            <motion.p variants={itemVariants} className="text-blue-100/45 text-lg max-w-xl mx-auto">
              We&apos;re not building another app. We&apos;re engineering a new kind of intelligence ecosystem.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {differentiators.map((item) => (
              <motion.div
                key={item.title}
                variants={itemVariants}
                whileHover={{ scale: 1.015, boxShadow: `0 24px 48px ${item.glowColor}` }}
                className={`glass-strong p-9 rounded-3xl border ${item.borderColor} transition-all duration-300 cursor-default`}
              >
                <div
                  className={`w-13 h-13 w-14 h-14 rounded-2xl glass flex items-center justify-center mb-6 ${item.color}`}
                >
                  <item.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-blue-100/55 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="section-divider" />

      {/* ── AI INTELLIGENCE ───────────────────────────────────── */}
      <motion.section
        ref={aiRef}
        variants={sectionVariants}
        initial="hidden"
        animate={aiInView ? 'visible' : 'hidden'}
        className="relative py-32 px-6 overflow-hidden"
      >
        {/* Cyan aurora */}
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/7 rounded-full blur-[110px] pointer-events-none" />

        <div className="relative container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6 border border-cyan-500/20"
            >
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-[0.18em]">
                AI Intelligence Layer
              </span>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-6xl font-black mb-5 tracking-tight"
            >
              The{' '}
              <span className="gradient-text-blue-cyan">AI Core</span>
            </motion.h2>

            <motion.p variants={itemVariants} className="text-blue-100/45 text-lg max-w-xl mx-auto">
              A shared intelligence layer running beneath every Amarktai application.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Live Terminal */}
            <motion.div variants={itemVariants}>
              <LiveTerminal />
            </motion.div>

            {/* Features list */}
            <motion.div variants={itemVariants} className="space-y-7">
              {aiFeatures.map((feature) => (
                <div key={feature.title} className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 group-hover:bg-cyan-500/10 transition-colors duration-200">
                    <feature.icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-blue-100/50 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      <div className="section-divider" />

      {/* ── ONE NETWORK. ONE VISION. ──────────────────────────── */}
      <motion.section
        ref={ecosystemRef}
        variants={sectionVariants}
        initial="hidden"
        animate={ecosystemInView ? 'visible' : 'hidden'}
        className="relative py-40 px-6 overflow-hidden"
      >
        {/* Multi-layered aurora background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-blue-600/8 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-violet-600/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-cyan-500/6 rounded-full blur-[80px]" />
        </div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />

        <div className="relative container mx-auto max-w-5xl text-center">
          {/* Eyebrow */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-10 border border-blue-500/20"
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-[0.18em]">
              The Vision
            </span>
          </motion.div>

          {/* Main statement */}
          <motion.h2
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight mb-8"
          >
            <span className="block text-white/90">One Network.</span>
            <span className="block gradient-text-blue-cyan py-2">One Vision.</span>
          </motion.h2>

          {/* Supporting copy */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-blue-100/55 max-w-2xl mx-auto leading-relaxed mb-6"
          >
            Every application we build is a node in a single, unified intelligence network.
            Each product is stronger for every other product that exists — compounding intelligence,
            compounding impact.
          </motion.p>

          <motion.p
            variants={itemVariants}
            className="text-base text-blue-100/40 max-w-xl mx-auto leading-relaxed mb-14"
          >
            From finance to education, social connection to cybersecurity — one ecosystem,
            one underlying intelligence layer, one unstoppable vision.
          </motion.p>

          {/* Premium divider treatment */}
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-6 mb-14">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-blue-500/40" />
            <div className="w-2 h-2 rounded-full bg-blue-500/60" />
            <div className="h-px w-8 bg-blue-500/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/70" />
            <div className="h-px w-8 bg-violet-500/40" />
            <div className="w-2 h-2 rounded-full bg-violet-500/60" />
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-violet-500/40" />
          </motion.div>

          {/* CTA */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/apps"
              className="btn-primary px-8 py-4 rounded-full text-base font-semibold inline-flex items-center justify-center gap-2 group"
            >
              Explore the Ecosystem
              <ArrowRight
                size={17}
                className="group-hover:translate-x-1 transition-transform duration-200"
              />
            </Link>
            <Link
              href="/about"
              className="btn-ghost px-8 py-4 rounded-full text-base font-semibold inline-flex items-center justify-center"
            >
              Our Story
            </Link>
          </motion.div>
        </div>
      </motion.section>

      <div className="section-divider" />

      {/* ── CTA ───────────────────────────────────────────────── */}
      <motion.section
        ref={ctaRef}
        variants={sectionVariants}
        initial="hidden"
        animate={ctaInView ? 'visible' : 'hidden'}
        className="relative py-44 px-6 overflow-hidden"
      >
        {/* Background aurora */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] bg-blue-600/9 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-violet-600/9 rounded-full blur-[110px]" />
        </div>

        {/* Rotating rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[480px] h-[480px] rounded-full border border-blue-500/10"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[680px] h-[680px] rounded-full border border-violet-500/7"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[880px] h-[880px] rounded-full border border-cyan-500/5"
          />
        </div>

        <div className="relative z-10 container mx-auto max-w-4xl text-center">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2.5 glass px-5 py-2.5 rounded-full mb-10 border border-blue-500/20"
          >
            <Sparkles size={13} className="text-cyan-400" />
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-[0.18em]">
              Join the Movement
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-5xl md:text-7xl font-black mb-7 tracking-tight leading-tight"
          >
            Ready to Build<br />
            <span className="gradient-text-blue-cyan">the Future?</span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-blue-100/55 mb-14 max-w-lg mx-auto leading-relaxed"
          >
            Whether you&apos;re a user, partner, or investor — there&apos;s a place for
            you in the Amarktai ecosystem.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/contact"
              className="btn-primary px-8 py-4 rounded-full text-base font-semibold inline-flex items-center justify-center gap-2 group"
            >
              Start the Conversation
              <ArrowRight
                size={17}
                className="group-hover:translate-x-1 transition-transform duration-200"
              />
            </Link>
            <Link
              href="/apps"
              className="btn-ghost px-8 py-4 rounded-full text-base font-semibold inline-flex items-center justify-center"
            >
              View the Ecosystem
            </Link>
          </motion.div>
        </div>
      </motion.section>

      <Footer />
    </div>
  )
}
