'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import NetworkCanvas from '@/components/NetworkCanvas'
import {
  Send, CheckCircle, Loader2, ArrowRight, Zap,
  Mail, MessageSquare, Network, Globe, Users, Building2, ChevronDown,
  Headphones, AlertCircle,
} from 'lucide-react'
import { getAppNames } from '@/lib/apps'

type FormState = 'idle' | 'loading' | 'success' | 'error'

const REASONS = [
  { value: 'partnership',       label: 'Partnership',        icon: Building2 },
  { value: 'integration',      label: 'Integration',        icon: Network },
  { value: 'early-access',     label: 'Early Access',       icon: Zap },
  { value: 'technical-support', label: 'Technical Support',  icon: Headphones },
  { value: 'general',          label: 'General Inquiry',    icon: MessageSquare },
]

const PLATFORMS = getAppNames()

const inputCls = `w-full px-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600
  focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-blue-500/20 transition-all duration-200 font-[inherit]`

const selectCls = `${inputCls} cursor-pointer appearance-none`

export default function ContactPage() {
  const [state, setState] = useState<FormState>('idle')
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    reason: '',
    platform: '',
    message: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const isWaitlist = form.reason === 'early-access'
  const reasonLabel = REASONS.find(r => r.value === form.reason)?.label ?? form.reason

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')
    try {
      if (isWaitlist) {
        const res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, interest: form.platform || 'All Platforms' }),
        })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            companyOrProject: form.company,
            message: `[${reasonLabel}]\n\n${form.message}`,
          }),
        })
        if (!res.ok) throw new Error()
      }
      setState('success')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#050816]">
      <Header />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative pt-36 pb-14 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <NetworkCanvas className="opacity-25" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[100px]" />
          <div className="absolute inset-0 grid-bg opacity-15" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs text-blue-400 font-medium"
          >
            <Mail className="w-3 h-3" /> Let&apos;s Connect
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.8 }}
            className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-5 tracking-tight"
          >
            <span className="gradient-text">Connect</span>{' '}
            <span className="text-white">with Us</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed"
          >
            Partnership, integration, early access, or just a conversation —
            every message gets a thoughtful reply.
          </motion.p>
        </div>
      </section>

      {/* ── Form ─────────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 pb-32">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <AnimatePresence mode="wait">
              {state === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card rounded-3xl p-12 sm:p-16 text-center relative overflow-hidden border border-emerald-500/15"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-transparent to-cyan-600/5 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                  <div className="relative z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6"
                    >
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                    <h2 className="font-heading text-2xl font-bold text-white mb-3">
                      {isWaitlist ? "You\u2019re on the List" : 'Message Sent'}
                    </h2>
                    <p className="text-slate-400 mb-8 max-w-md mx-auto">
                      {isWaitlist
                        ? "We\u2019ll notify you when early access opens. Keep an eye on your inbox."
                        : 'We typically respond within 24 hours. Looking forward to connecting.'}
                    </p>
                    <button
                      onClick={() => { setState('idle'); setForm({ name: '', email: '', company: '', reason: '', platform: '', message: '' }) }}
                      className="btn-ghost text-sm"
                    >
                      Send another message
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="glass-card rounded-3xl p-8 sm:p-10 relative overflow-hidden border border-blue-500/12"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.03] via-transparent to-violet-600/[0.03] pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

                  <div className="relative z-10">
                    <div className="mb-8">
                      <h2 className="font-heading text-xl font-bold text-white mb-1">Send us a message</h2>
                      <p className="text-sm text-slate-500">Every enquiry receives a response within 24 hours.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Name + Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-500">Full Name *</label>
                          <input required type="text" value={form.name} onChange={set('name')} placeholder="Your name" className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-500">Email Address *</label>
                          <input required type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" className={inputCls} />
                        </div>
                      </div>

                      {/* Company */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Company <span className="text-slate-700">(optional)</span></label>
                        <input type="text" value={form.company} onChange={set('company')} placeholder="e.g. Acme Corp, My Startup" className={inputCls} />
                      </div>

                      {/* Reason dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Reason for contacting *</label>
                        <div className="relative">
                          <select required value={form.reason} onChange={set('reason')} className={selectCls}>
                            <option value="" disabled className="bg-[#0A1020]">Select a reason...</option>
                            {REASONS.map(r => (
                              <option key={r.value} value={r.value} className="bg-[#0A1020]">{r.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                      </div>

                      {/* Platform interest — only for early access */}
                      <AnimatePresence>
                        {isWaitlist && (
                          <motion.div
                            key="platform-selector"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-1.5 overflow-hidden"
                          >
                            <label className="text-xs font-medium text-slate-500">Platform of Interest *</label>
                            <div className="relative">
                              <select required={isWaitlist} value={form.platform} onChange={set('platform')} className={selectCls}>
                                <option value="" disabled className="bg-[#0A1020]">Select a platform...</option>
                                {PLATFORMS.map(p => (
                                  <option key={p} value={p} className="bg-[#0A1020]">{p}</option>
                                ))}
                                <option value="All Platforms" className="bg-[#0A1020]">All Platforms</option>
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Message */}
                      <AnimatePresence>
                        {!isWaitlist && (
                          <motion.div
                            key="message-field"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1.5"
                          >
                            <label className="text-xs font-medium text-slate-500">Message *</label>
                            <textarea
                              required={!isWaitlist}
                              rows={5}
                              value={form.message}
                              onChange={set('message')}
                              placeholder="Tell us what you're working on or looking for..."
                              className={`${inputCls} resize-none`}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Error */}
                      <AnimatePresence>
                        {state === 'error' && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex items-start gap-3 text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3"
                          >
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>Something went wrong. Please check your connection and try again.</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        type="submit"
                        disabled={state === 'loading'}
                        className="btn-primary w-full justify-center disabled:opacity-50 text-sm"
                      >
                        {state === 'loading' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isWaitlist ? (
                          <><Users className="w-4 h-4 relative z-10" /> Join Waitlist</>
                        ) : (
                          <>Send Message <ArrowRight className="w-4 h-4 relative z-10" /></>
                        )}
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Contact info strip ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              { icon: Send, label: 'Response Time', desc: 'Within 24 hours', color: 'text-blue-400' },
              { icon: Globe, label: 'Global Coverage', desc: 'Serving worldwide', color: 'text-cyan-400' },
              { icon: Zap, label: 'AI-Powered', desc: 'Smart message routing', color: 'text-violet-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3.5 glass rounded-xl border border-white/[0.06] hover:border-white/10 transition-colors">
                <div className={`w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                  <p className="text-[10px] text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
