'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Mail, MessageSquare, Building2, User, ArrowRight, CheckCircle, Loader2, Zap, Star } from 'lucide-react'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function ContactPage() {
  const [contactState, setContactState] = useState<FormState>('idle')
  const [waitlistState, setWaitlistState] = useState<FormState>('idle')
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    companyOrProject: '',
    message: '',
  })
  const [waitlistForm, setWaitlistForm] = useState({
    name: '',
    email: '',
    interest: '',
  })

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setContactState('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      if (res.ok) {
        setContactState('success')
        setContactForm({ name: '', email: '', companyOrProject: '', message: '' })
      } else {
        setContactState('error')
      }
    } catch {
      setContactState('error')
    }
  }

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaitlistState('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistForm),
      })
      if (res.ok) {
        setWaitlistState('success')
        setWaitlistForm({ name: '', email: '', interest: '' })
      } else {
        setWaitlistState('error')
      }
    } catch {
      setWaitlistState('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#060816]">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-xs text-blue-400 mb-6 border border-blue-500/20">
              <MessageSquare className="w-3 h-3" />
              Get in Touch
            </div>
            <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
              Let&apos;s <span className="gradient-text">Build Together</span>
            </h1>
            <p className="text-xl text-slate-400">
              Whether you&apos;re interested in our platforms, want to collaborate, or have a project in mind — we want to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact + Waitlist */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Send a Message</h2>
                <p className="text-xs text-slate-400">We respond within 24 hours</p>
              </div>
            </div>

            {contactState === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-12 gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>Message Sent!</h3>
                <p className="text-slate-400 text-sm">We&apos;ll get back to you within 24 hours.</p>
                <button
                  onClick={() => setContactState('idle')}
                  className="mt-4 text-sm text-blue-400 hover:text-blue-300"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Email *
                    </label>
                    <input
                      required
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> Company / Project
                  </label>
                  <input
                    type="text"
                    value={contactForm.companyOrProject}
                    onChange={(e) => setContactForm(p => ({ ...p, companyOrProject: e.target.value }))}
                    placeholder="Your company or project name"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={contactForm.message}
                    onChange={(e) => setContactForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us about your project, question, or how we can help..."
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                  />
                </div>
                {contactState === 'error' && (
                  <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
                )}
                <button
                  type="submit"
                  disabled={contactState === 'loading'}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {contactState === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send Message
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>

          {/* Waitlist + Info */}
          <div className="space-y-6">
            {/* Waitlist */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Join the Waitlist</h2>
                  <p className="text-xs text-slate-400">Get early access to our platforms</p>
                </div>
              </div>

              {waitlistState === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-8 gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white">You&apos;re on the list!</h3>
                  <p className="text-slate-400 text-sm">We&apos;ll notify you when your access is ready.</p>
                  <button
                    onClick={() => setWaitlistState('idle')}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Add another email
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                  <input
                    required
                    type="text"
                    value={waitlistForm.name}
                    onChange={(e) => setWaitlistForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                  <input
                    required
                    type="email"
                    value={waitlistForm.email}
                    onChange={(e) => setWaitlistForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                  <select
                    value={waitlistForm.interest}
                    onChange={(e) => setWaitlistForm(p => ({ ...p, interest: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 transition-colors"
                  >
                    <option value="">Interested in... (optional)</option>
                    <option value="crypto">Amarktai Crypto</option>
                    <option value="forex">Amarktai Forex</option>
                    <option value="faith-haven">Faith Haven</option>
                    <option value="learn-digital">Learn Digital</option>
                    <option value="jobs-sa">Jobs SA</option>
                    <option value="all">All Platforms</option>
                  </select>
                  {waitlistState === 'error' && (
                    <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
                  )}
                  <button
                    type="submit"
                    disabled={waitlistState === 'loading'}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 glass border border-blue-500/30 text-blue-400 font-semibold rounded-xl hover:bg-blue-500/10 transition-all disabled:opacity-50"
                  >
                    {waitlistState === 'loading' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Join Waitlist
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>What to expect</h3>
              {[
                { icon: Zap, text: 'Response within 24 hours for all inquiries' },
                { icon: Star, text: 'Priority invitation consideration for early applicants' },
                { icon: CheckCircle, text: 'No spam — only relevant platform updates' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm text-slate-400">{item.text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
