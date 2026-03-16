'use client'

import { motion } from 'framer-motion'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Brain, Target, Globe, Zap, Shield, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const values = [
  {
    icon: Brain,
    title: 'Intelligence First',
    description: 'AI is not an afterthought. Every system, product, and platform we build has intelligence embedded at its core architecture.',
  },
  {
    icon: Target,
    title: 'Precision Engineering',
    description: 'We obsess over the details. From database schemas to pixel-perfect UIs, precision defines everything we ship.',
  },
  {
    icon: Globe,
    title: 'African Innovation',
    description: 'Proudly building from Africa for the world. We believe the continent\'s next great technology companies are being built today.',
  },
  {
    icon: Zap,
    title: 'Speed & Scale',
    description: 'We move fast without breaking things. Our architecture is designed for rapid iteration and infinite scale.',
  },
  {
    icon: Shield,
    title: 'Security by Default',
    description: 'Privacy and security are not features — they are foundational principles baked into every system we design.',
  },
  {
    icon: Users,
    title: 'Community Impact',
    description: 'Technology should uplift communities. Every product we build is designed to create meaningful impact.',
  },
]

const milestones = [
  { year: '2022', title: 'Foundation', description: 'Amarktai Network was conceived as a vision to build Africa\'s premier AI technology ecosystem.' },
  { year: '2023', title: 'Research & Architecture', description: 'Deep research phase. Designing the intelligence layer, system architecture, and product roadmap.' },
  { year: '2024', title: 'Development Sprint', description: 'Full-scale development begins. Amarktai Crypto and Forex enter closed beta. Core platform built.' },
  { year: '2025', title: 'Ecosystem Launch', description: 'Phased launch of all platforms. Invitation access opens. Africa\'s AI ecosystem goes live.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#060816]">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-xs text-purple-400 mb-6 border border-purple-500/20">
              <Brain className="w-3 h-3" />
              About Amarktai Network
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'Space Grotesk' }}>
              Africa&apos;s Premier{' '}
              <span className="gradient-text">AI Technology</span>
              <br />
              Company
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              We are an AI-first technology company building the next generation of intelligent platforms, applications, and digital infrastructure — engineered for the world, built from Africa.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Space Grotesk' }}>
                Our <span className="gradient-text">Mission</span>
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                Amarktai Network exists to close the gap between the potential of artificial intelligence and its real-world application. We build systems that think, platforms that adapt, and applications that deliver measurable impact.
              </p>
              <p className="text-slate-400 leading-relaxed mb-6">
                We are not a traditional software company. Every product in our ecosystem is designed around an intelligence layer that learns, predicts, and optimizes — creating compounding value over time.
              </p>
              <p className="text-slate-400 leading-relaxed">
                From financial intelligence platforms to community applications, our ecosystem spans the full spectrum of human digital experience — all unified by a common commitment to AI excellence.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-8 space-y-6"
            >
              {[
                { label: 'Applications in Development', value: '8+' },
                { label: 'AI Models Deployed', value: '12+' },
                { label: 'Countries Targeted', value: '54' },
                { label: 'Technology Partners', value: 'Growing' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <span className="text-sm text-slate-400">{stat.label}</span>
                  <span className="text-lg font-bold gradient-text-blue-cyan" style={{ fontFamily: 'Space Grotesk' }}>{stat.value}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B1020]/40 to-transparent" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
              What We <span className="gradient-text">Stand For</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Our values are not aspirations — they are operating principles that define how we build, ship, and grow.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <value.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>{value.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
              Our <span className="gradient-text">Journey</span>
            </h2>
          </motion.div>

          <div className="space-y-0">
            {milestones.map((milestone, i) => (
              <motion.div
                key={milestone.year}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-8 pb-12 last:pb-0"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full glass border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-400">{milestone.year}</span>
                  </div>
                  {i < milestones.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-blue-500/30 to-transparent mt-2" />
                  )}
                </div>
                <div className="pt-2 pb-4">
                  <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>{milestone.title}</h3>
                  <p className="text-slate-400">{milestone.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
              Be Part of the Ecosystem
            </h2>
            <p className="text-slate-400 mb-8">
              Join thousands waiting for early access to Africa&apos;s most advanced AI platforms.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Get in Touch
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
