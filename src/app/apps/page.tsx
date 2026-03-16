'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  Search, Filter, Star, ArrowRight, Globe, TrendingUp, BookOpen, Briefcase,
  Heart, Users, Shield, Camera, Lock, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

type AppStatus = 'live' | 'invite_only' | 'in_development' | 'coming_soon' | 'concept'
type AccessType = 'public' | 'invite_only' | 'internal'

interface AppEntry {
  id: number
  name: string
  slug: string
  category: string
  categoryKey: string
  status: AppStatus
  accessType: AccessType
  featured: boolean
  icon: React.ElementType
  iconGradient: string
  iconColor: string
  shortDescription: string
  longDescription: string
  primaryUrl?: string
  hostingScope: string
  tags: string[]
}

const allApps: AppEntry[] = [
  {
    id: 1,
    name: 'Amarktai Crypto',
    slug: 'amarktai-crypto',
    category: 'Finance & AI',
    categoryKey: 'finance',
    status: 'invite_only',
    accessType: 'invite_only',
    featured: true,
    icon: TrendingUp,
    iconGradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
    shortDescription: 'Advanced cryptocurrency intelligence platform with real-time AI signals and portfolio analytics.',
    longDescription:
      'Amarktai Crypto is an institutional-grade cryptocurrency intelligence platform. Our proprietary AI models analyse on-chain data, social sentiment, order book dynamics, and macroeconomic signals to deliver high-confidence trading insights. Features include real-time signal alerts, portfolio risk analysis, automated rebalancing strategies, and an AI-powered research assistant.',
    primaryUrl: 'https://crypto.amarktai.com',
    hostingScope: 'subdomain',
    tags: ['Crypto', 'AI Signals', 'Portfolio', 'Real-time'],
  },
  {
    id: 2,
    name: 'Amarktai Forex',
    slug: 'amarktai-forex',
    category: 'Finance & AI',
    categoryKey: 'finance',
    status: 'invite_only',
    accessType: 'invite_only',
    featured: true,
    icon: Globe,
    iconGradient: 'from-emerald-500/20 to-cyan-500/20',
    iconColor: 'text-emerald-400',
    shortDescription: 'Institutional-grade forex analysis powered by proprietary AI models and market intelligence.',
    longDescription:
      'Amarktai Forex brings institutional-level market intelligence to retail and professional traders. Our AI engine processes millions of data points per second — news sentiment, technical patterns, interbank flows, and economic indicators — to surface high-probability trade setups with defined risk parameters.',
    primaryUrl: 'https://forex.amarktai.com',
    hostingScope: 'subdomain',
    tags: ['Forex', 'AI Analysis', 'Trading', 'Risk Management'],
  },
  {
    id: 3,
    name: 'Faith Haven',
    slug: 'faith-haven',
    category: 'Community',
    categoryKey: 'community',
    status: 'in_development',
    accessType: 'public',
    featured: false,
    icon: Heart,
    iconGradient: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-400',
    shortDescription: 'A digital space for faith communities to connect, grow, and build meaningful relationships.',
    longDescription:
      'Faith Haven is a purpose-built digital community platform for faith organisations and individuals. Features include live streaming for services, community groups, devotional content, prayer request management, event coordination, and a giving platform. AI features include personalised spiritual content recommendations and community health analytics.',
    primaryUrl: 'https://faithhaven.co.za',
    hostingScope: 'external_domain',
    tags: ['Community', 'Live Streaming', 'Events', 'PWA'],
  },
  {
    id: 4,
    name: 'Learn Digital',
    slug: 'learn-digital',
    category: 'Education',
    categoryKey: 'education',
    status: 'in_development',
    accessType: 'public',
    featured: false,
    icon: BookOpen,
    iconGradient: 'from-amber-500/20 to-yellow-500/20',
    iconColor: 'text-amber-400',
    shortDescription: 'Adaptive digital learning platform designed for the next generation of technology professionals.',
    longDescription:
      'Learn Digital is an AI-powered education platform focused on digital technology skills for African learners. The platform features adaptive learning paths that adjust to individual progress, project-based curriculum, peer collaboration tools, mentorship matching, and career placement support.',
    primaryUrl: 'https://learndigital.co.za',
    hostingScope: 'external_domain',
    tags: ['Education', 'AI Learning', 'Skills', 'Certification'],
  },
  {
    id: 5,
    name: 'Jobs SA',
    slug: 'jobs-sa',
    category: 'Employment',
    categoryKey: 'employment',
    status: 'coming_soon',
    accessType: 'public',
    featured: false,
    icon: Briefcase,
    iconGradient: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
    shortDescription: 'South Africa-focused intelligent job matching platform connecting talent with opportunity.',
    longDescription:
      'Jobs SA is a next-generation employment platform designed specifically for the South African market. Our AI matching engine goes beyond keyword matching — it analyses skills, culture fit, career trajectory, and growth potential to connect the right people with the right opportunities.',
    hostingScope: 'external_domain',
    tags: ['Jobs', 'AI Matching', 'South Africa', 'Career'],
  },
  {
    id: 6,
    name: 'Kinship',
    slug: 'kinship',
    category: 'Social',
    categoryKey: 'social',
    status: 'in_development',
    accessType: 'public',
    featured: false,
    icon: Users,
    iconGradient: 'from-pink-500/20 to-rose-500/20',
    iconColor: 'text-pink-400',
    shortDescription: 'Community-driven platform fostering meaningful connections and shared experiences.',
    longDescription:
      'Kinship is a social platform built around meaningful connection rather than engagement metrics. Using AI to surface genuine compatibility and shared interests, Kinship creates small, intimate community spaces where real relationships form.',
    hostingScope: 'external_domain',
    tags: ['Social', 'Community', 'AI Matching', 'Connections'],
  },
  {
    id: 7,
    name: 'Amarktai Secure',
    slug: 'amarktai-secure',
    category: 'Security',
    categoryKey: 'security',
    status: 'in_development',
    accessType: 'invite_only',
    featured: false,
    icon: Shield,
    iconGradient: 'from-slate-500/20 to-blue-500/20',
    iconColor: 'text-slate-300',
    shortDescription: 'Enterprise-grade cybersecurity intelligence and threat monitoring for the African digital economy.',
    longDescription:
      'Amarktai Secure provides continuous threat intelligence, vulnerability scanning, and security posture management for businesses operating across Africa. Powered by AI-driven anomaly detection, it surfaces actionable threats before they escalate into incidents.',
    primaryUrl: 'https://secure.amarktai.com',
    hostingScope: 'subdomain',
    tags: ['Security', 'Threat Intel', 'AI Detection', 'Enterprise'],
  },
  {
    id: 8,
    name: 'Crowd Lens',
    slug: 'crowd-lens',
    category: 'Media & Insights',
    categoryKey: 'media',
    status: 'coming_soon',
    accessType: 'public',
    featured: false,
    icon: Camera,
    iconGradient: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
    shortDescription: 'AI-powered crowd-sourced media intelligence platform for real-time African market sentiment.',
    longDescription:
      'Crowd Lens aggregates and analyses real-time social signals, user-submitted reports, and media streams to produce actionable sentiment and trend intelligence. Designed for researchers, journalists, and market analysts seeking ground-truth data on African markets.',
    hostingScope: 'external_domain',
    tags: ['Media', 'Sentiment', 'Crowd-sourced', 'Market Intel'],
  },
]

const categories = [
  { key: 'all', label: 'All Apps' },
  { key: 'finance', label: 'Finance' },
  { key: 'community', label: 'Community' },
  { key: 'education', label: 'Education' },
  { key: 'employment', label: 'Employment' },
  { key: 'social', label: 'Social' },
  { key: 'security', label: 'Security' },
  { key: 'media', label: 'Media' },
]

function AppCTA({ app }: { app: AppEntry }) {
  if (app.accessType === 'invite_only' || app.status === 'invite_only') {
    return (
      <Link
        href="/contact"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
      >
        <Star className="w-3 h-3 fill-blue-400" />
        Request Invitation
      </Link>
    )
  }
  if (app.status === 'coming_soon' || app.status === 'concept') {
    return (
      <Link
        href="/contact"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium"
      >
        Join Waitlist
        <ArrowRight className="w-3 h-3" />
      </Link>
    )
  }
  if (app.primaryUrl) {
    return (
      <a
        href={app.primaryUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
      >
        <ExternalLink className="w-3 h-3" />
        Visit App
      </a>
    )
  }
  return (
    <Link
      href="/contact"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium"
    >
      Learn More
      <ArrowRight className="w-3 h-3" />
    </Link>
  )
}

function AppBadge({ app }: { app: AppEntry }) {
  if (app.accessType === 'invite_only' || app.status === 'invite_only') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs rounded-full">
        <Lock className="w-2.5 h-2.5" /> Private Beta
      </span>
    )
  }
  return null
}

export default function AppsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedApp, setExpandedApp] = useState<number | null>(null)

  const filtered = allApps.filter((app) => {
    const matchesCategory = selectedCategory === 'all' || app.categoryKey === selectedCategory
    const matchesSearch =
      !searchQuery ||
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.iconGradient} flex items-center justify-center`}>
                      <app.icon className={`w-5 h-5 ${app.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{app.category}</p>
                      <h3 className="font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>{app.name}</h3>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={app.status} />
                    <AppBadge app={app} />
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-400 leading-relaxed">
                  {expandedApp === app.id ? app.longDescription : app.shortDescription}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {app.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-white/5 rounded-full text-xs text-slate-500">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <AppCTA app={app} />
                  <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
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

      {/* Invite-only CTA */}
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
              Amarktai Crypto, Forex, and Secure are available by invitation only. Contact us to apply for early access to our flagship platforms.
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
