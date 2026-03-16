'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import StatusBadge from '@/components/ui/StatusBadge'
import { Search, Filter, Star, ArrowRight, Globe, TrendingUp, BookOpen, Briefcase, Heart, Users, Brain, Smartphone } from 'lucide-react'
import Link from 'next/link'

const allApps = [
  {
    id: 1,
    name: 'Amarktai Crypto',
    slug: 'amarktai-crypto',
    category: 'Finance & AI',
    categoryKey: 'finance',
    status: 'invite_only',
    featured: true,
    icon: TrendingUp,
    iconColor: 'from-blue-500/20 to-cyan-500/20',
    iconTextColor: 'text-blue-400',
    shortDescription: 'Advanced cryptocurrency intelligence platform with real-time AI signals and portfolio analytics.',
    longDescription: 'Amarktai Crypto is an institutional-grade cryptocurrency intelligence platform. Our proprietary AI models analyze on-chain data, social sentiment, order book dynamics, and macroeconomic signals to deliver high-confidence trading insights. Features include real-time signal alerts, portfolio risk analysis, automated rebalancing strategies, and an AI-powered research assistant.',
    tags: ['Crypto', 'AI Signals', 'Portfolio', 'Real-time'],
  },
  {
    id: 2,
    name: 'Amarktai Forex',
    slug: 'amarktai-forex',
    category: 'Finance & AI',
    categoryKey: 'finance',
    status: 'invite_only',
    featured: true,
    icon: Globe,
    iconColor: 'from-emerald-500/20 to-cyan-500/20',
    iconTextColor: 'text-emerald-400',
    shortDescription: 'Institutional-grade forex analysis powered by proprietary AI models and market intelligence.',
    longDescription: 'Amarktai Forex brings institutional-level market intelligence to retail and professional traders. Our AI engine processes millions of data points per second — news sentiment, technical patterns, interbank flows, and economic indicators — to surface high-probability trade setups with defined risk parameters.',
    tags: ['Forex', 'AI Analysis', 'Trading', 'Risk Management'],
  },
  {
    id: 3,
    name: 'Faith Haven',
    slug: 'faith-haven',
    category: 'Community',
    categoryKey: 'community',
    status: 'in_development',
    featured: false,
    icon: Heart,
    iconColor: 'from-rose-500/20 to-pink-500/20',
    iconTextColor: 'text-rose-400',
    shortDescription: 'A digital space for faith communities to connect, grow, and build meaningful relationships.',
    longDescription: 'Faith Haven is a purpose-built digital community platform for faith organizations and individuals. Features include live streaming for services, community groups, devotional content, prayer request management, event coordination, and a giving platform. AI features include personalized spiritual content recommendations and community health analytics.',
    tags: ['Community', 'Live Streaming', 'Events', 'PWA'],
  },
  {
    id: 4,
    name: 'Learn Digital',
    slug: 'learn-digital',
    category: 'Education',
    categoryKey: 'education',
    status: 'in_development',
    featured: false,
    icon: BookOpen,
    iconColor: 'from-amber-500/20 to-yellow-500/20',
    iconTextColor: 'text-amber-400',
    shortDescription: 'Adaptive digital learning platform designed for the next generation of technology professionals.',
    longDescription: 'Learn Digital is an AI-powered education platform focused on digital technology skills for African learners. The platform features adaptive learning paths that adjust to individual progress, project-based curriculum, peer collaboration tools, mentorship matching, and career placement support. AI drives personalized content delivery and competency assessment.',
    tags: ['Education', 'AI Learning', 'Skills', 'Certification'],
  },
  {
    id: 5,
    name: 'Jobs SA',
    slug: 'jobs-sa',
    category: 'Employment',
    categoryKey: 'employment',
    status: 'coming_soon',
    featured: false,
    icon: Briefcase,
    iconColor: 'from-violet-500/20 to-purple-500/20',
    iconTextColor: 'text-violet-400',
    shortDescription: 'South Africa-focused intelligent job matching platform connecting talent with opportunity.',
    longDescription: 'Jobs SA is a next-generation employment platform designed specifically for the South African market. Our AI matching engine goes beyond keyword matching — it analyzes skills, culture fit, career trajectory, and growth potential to connect the right people with the right opportunities. Features include AI resume optimization, interview preparation, and salary intelligence.',
    tags: ['Jobs', 'AI Matching', 'South Africa', 'Career'],
  },
  {
    id: 6,
    name: 'Kinship',
    slug: 'kinship',
    category: 'Social',
    categoryKey: 'social',
    status: 'in_development',
    featured: false,
    icon: Users,
    iconColor: 'from-pink-500/20 to-rose-500/20',
    iconTextColor: 'text-pink-400',
    shortDescription: 'Community-driven platform fostering meaningful connections and shared experiences.',
    longDescription: 'Kinship is a social platform built around meaningful connection rather than engagement metrics. Using AI to surface genuine compatibility and shared interests, Kinship creates small, intimate community spaces where real relationships form. No algorithmic manipulation — just authentic human connection powered by intelligent matching.',
    tags: ['Social', 'Community', 'AI Matching', 'Connections'],
  },
  {
    id: 7,
    name: 'Amarktai Intelligence',
    slug: 'amarktai-intelligence',
    category: 'AI Platform',
    categoryKey: 'ai',
    status: 'concept',
    featured: false,
    icon: Brain,
    iconColor: 'from-blue-500/20 to-purple-500/20',
    iconTextColor: 'text-blue-400',
    shortDescription: 'The unified AI intelligence layer powering all Amarktai Network applications.',
    longDescription: 'Amarktai Intelligence is the backbone AI platform that powers every application in our ecosystem. It provides unified model serving, real-time inference APIs, model training infrastructure, and intelligence orchestration. Third-party developers will eventually access this layer to build AI-powered applications.',
    tags: ['AI', 'Platform', 'API', 'Infrastructure'],
  },
  {
    id: 8,
    name: 'Amarktai Pay',
    slug: 'amarktai-pay',
    category: 'Fintech',
    categoryKey: 'finance',
    status: 'concept',
    featured: false,
    icon: Smartphone,
    iconColor: 'from-emerald-500/20 to-teal-500/20',
    iconTextColor: 'text-emerald-400',
    shortDescription: 'Borderless digital payments and financial services for African markets.',
    longDescription: 'Amarktai Pay is a fintech platform designed for seamless, low-cost cross-border payments across Africa. Built on modern payment rails with AI fraud detection, the platform enables individuals and businesses to send, receive, and manage money across borders without traditional banking friction.',
    tags: ['Payments', 'Fintech', 'Africa', 'Cross-border'],
  },
]

const categories = [
  { key: 'all', label: 'All Apps' },
  { key: 'finance', label: 'Finance' },
  { key: 'community', label: 'Community' },
  { key: 'education', label: 'Education' },
  { key: 'employment', label: 'Employment' },
  { key: 'social', label: 'Social' },
  { key: 'ai', label: 'AI Platform' },
]

export default function AppsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedApp, setExpandedApp] = useState<number | null>(null)

  const filtered = allApps.filter((app) => {
    const matchesCategory = selectedCategory === 'all' || app.categoryKey === selectedCategory
    const matchesSearch = !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#060816]">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-xs text-blue-400 mb-6 border border-blue-500/20">
              <Globe className="w-3 h-3" />
              The Ecosystem
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'Space Grotesk' }}>
              The <span className="gradient-text">Amarktai</span> Ecosystem
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Eight intelligent platforms, one unified vision. Explore the applications shaping Africa&apos;s digital future.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 glass rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 border border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-400" />
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat.key
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'glass text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Apps Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-6 flex flex-col gap-4 group cursor-pointer"
                onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.iconColor} flex items-center justify-center`}>
                      <app.icon className={`w-5 h-5 ${app.iconTextColor}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{app.category}</p>
                      <h3 className="font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>{app.name}</h3>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                {/* Description */}
                <p className="text-sm text-slate-400 leading-relaxed">
                  {expandedApp === app.id ? app.longDescription : app.shortDescription}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {app.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-white/5 rounded-full text-xs text-slate-500">{tag}</span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  {app.status === 'invite_only' ? (
                    <Link
                      href="/contact"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      <Star className="w-3 h-3 fill-blue-400" />
                      Request Invitation
                    </Link>
                  ) : app.status === 'coming_soon' || app.status === 'concept' ? (
                    <Link
                      href="/contact"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium"
                    >
                      Join Waitlist
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-xs text-emerald-400 font-medium">Coming Soon</span>
                  )}
                  <button className="text-xs text-slate-500 hover:text-slate-300">
                    {expandedApp === app.id ? 'Less info' : 'Learn more'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-400">No applications found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* Waitlist CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-10"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Space Grotesk' }}>
              Early Access Available
            </h2>
            <p className="text-slate-400 mb-8">
              Amarktai Crypto and Forex are available by invitation. Contact us to apply for early access to our flagship AI platforms.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Apply for Invitation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
