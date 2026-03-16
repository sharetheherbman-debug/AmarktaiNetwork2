'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ArrowRight, Brain, Code2, Globe, Layers, Shield, Zap, Activity, ChevronRight, Star } from 'lucide-react'

const apps = [
  { name: 'Amarktai Crypto', category: 'Finance & AI', status: 'invite_only', description: 'Advanced cryptocurrency intelligence platform with real-time AI signals and portfolio analytics.' },
  { name: 'Amarktai Forex', category: 'Finance & AI', status: 'invite_only', description: 'Institutional-grade forex analysis powered by proprietary AI models and market intelligence.' },
  { name: 'Faith Haven', category: 'Community', status: 'in_development', description: 'A digital space for faith communities to connect, grow, and build meaningful relationships.' },
  { name: 'Learn Digital', category: 'Education', status: 'in_development', description: 'Adaptive digital learning platform designed for the next generation of technology professionals.' },
  { name: 'Jobs SA', category: 'Employment', status: 'coming_soon', description: 'South Africa-focused intelligent job matching platform connecting talent with opportunity.' },
  { name: 'Kinship', category: 'Social', status: 'in_development', description: 'Community-driven platform fostering meaningful connections and shared experiences.' },
]

const capabilities = [
  { icon: Brain, title: 'AI Systems', description: 'End-to-end artificial intelligence systems with real-time inference, model training, and intelligent automation pipelines.' },
  { icon: Code2, title: 'Applications', description: 'Precision-engineered web and mobile applications built for performance, scale, and exceptional user experience.' },
  { icon: Globe, title: 'Web Platforms', description: 'Full-stack web platforms and PWAs that deliver seamless experiences across all devices and connectivity conditions.' },
  { icon: Layers, title: 'Digital Infrastructure', description: 'Scalable cloud-native architectures and distributed systems designed for reliability and growth.' },
  { icon: Shield, title: 'Secure Systems', description: 'Security-first design principles embedded at every layer, from architecture to deployment.' },
  { icon: Zap, title: 'Intelligent Automation', description: 'Workflow automation and intelligent processing systems that eliminate friction and multiply productivity.' },
]

const statusLabels: Record<string, { label: string; color: string }> = {
  invite_only: { label: 'Invite Only', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  in_development: { label: 'In Development', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  coming_soon: { label: 'Coming Soon', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  live: { label: 'Live', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
}

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -50])

  return (
    <div className="min-h-screen bg-[#060816]">
      <Header />

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#060816] via-[#0B1020] to-[#060816]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-3xl" />
        </div>

        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm text-blue-400 mb-8 border border-blue-500/20"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Building Africa&apos;s most advanced AI ecosystem</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Intelligence
            <br />
            <span className="gradient-text">Engineered</span>
            <br />
            for the Future
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Amarktai Network designs and develops AI systems, applications, and intelligent automation platforms that redefine what digital technology can accomplish.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/apps"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity glow-blue"
            >
              Explore the Ecosystem
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-6 py-3 glass text-slate-300 font-medium rounded-xl hover:text-white hover:border-blue-500/30 transition-all border border-white/5"
            >
              Learn More
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto"
          >
            {[
              { value: '8+', label: 'Applications' },
              { value: 'AI-First', label: 'Architecture' },
              { value: '2025', label: 'Launching' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold gradient-text-blue-cyan" style={{ fontFamily: 'Space Grotesk' }}>{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-px h-12 bg-gradient-to-b from-blue-500/50 to-transparent animate-pulse" />
        </motion.div>
      </section>

      {/* Capabilities */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-xs text-cyan-400 mb-4 border border-cyan-500/20">
              <Zap className="w-3 h-3" />
              What We Build
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
              Full-Spectrum{' '}
              <span className="gradient-text">Digital Capability</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From AI model development to production-grade platforms, we engineer every layer of the digital stack.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="glass rounded-2xl p-6 group cursor-default"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4 group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all">
                  <cap.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>{cap.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{cap.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Intelligence Layer */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B1020]/50 to-transparent" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-xs text-purple-400 mb-4 border border-purple-500/20">
              <Brain className="w-3 h-3" />
              AI Intelligence Layer
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
              Intelligence at the{' '}
              <span className="gradient-text">Core</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Every platform we build is powered by a deep AI intelligence layer — not as an add-on, but as the foundational architecture.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-slate-400 font-mono">amarktai.intelligence // real-time inference</span>
              </div>
              {[
                { key: 'market_signal', value: 'BULLISH_DIVERGENCE', confidence: '94.2%', type: 'CRYPTO' },
                { key: 'risk_model', value: 'LOW_EXPOSURE', confidence: '89.7%', type: 'FOREX' },
                { key: 'pattern_match', value: 'HEAD_AND_SHOULDERS', confidence: '91.3%', type: 'ANALYSIS' },
                { key: 'sentiment', value: 'POSITIVE_TRENDING', confidence: '87.5%', type: 'NLP' },
              ].map((item, i) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg border border-white/5 font-mono text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{item.key}:</span>
                    <span className="text-cyan-400">{item.value}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400/70">{item.type}</span>
                    <span className="text-emerald-400">{item.confidence}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {[
                { title: 'Predictive Intelligence', desc: 'Models trained on real-world data deliver high-confidence predictions across financial, behavioral, and operational domains.', icon: Brain },
                { title: 'Real-Time Processing', desc: 'Sub-millisecond inference pipelines process live data streams and deliver actionable intelligence without delay.', icon: Zap },
                { title: 'Adaptive Systems', desc: 'Self-improving architectures that continuously refine their models based on new data and outcomes.', icon: Activity },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1" style={{ fontFamily: 'Space Grotesk' }}>{item.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* App Ecosystem Preview */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-xs text-blue-400 mb-4 border border-blue-500/20">
                <Globe className="w-3 h-3" />
                The Ecosystem
              </div>
              <h2 className="text-4xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
                Applications Built for{' '}
                <span className="gradient-text">Impact</span>
              </h2>
            </div>
            <Link
              href="/apps"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
            >
              View all apps
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {apps.map((app, i) => {
              const status = statusLabels[app.status]
              return (
                <motion.div
                  key={app.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  whileHover={{ y: -3 }}
                  className="glass rounded-2xl p-5 flex flex-col gap-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium">{app.category}</span>
                      <h3 className="text-base font-semibold text-white mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>{app.name}</h3>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed flex-1">{app.description}</p>
                  {app.status === 'invite_only' && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-400">
                      <Star className="w-3 h-3 fill-blue-400" />
                      Request invitation
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5" />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
                Ready to Build the Future?
              </h2>
              <p className="text-slate-400 mb-8">
                Get in touch to explore how Amarktai Network can power your next intelligent platform.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity glow-blue"
              >
                Start the Conversation
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
