import Link from 'next/link'
import { Zap, Twitter, Linkedin, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#060816]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <span className="gradient-text-blue-cyan">Amarktai</span>
                <span className="text-slate-400 ml-1 font-light">Network</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Designing and developing AI systems, applications, and intelligent automation platforms for the modern world.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="p-2 glass rounded-lg text-slate-400 hover:text-white transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 glass rounded-lg text-slate-400 hover:text-white transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 glass rounded-lg text-slate-400 hover:text-white transition-colors">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>Company</h4>
            <ul className="space-y-2">
              {[
                { href: '/about', label: 'About' },
                { href: '/apps', label: 'Apps' },
                { href: '/contact', label: 'Contact' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Apps */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>Ecosystem</h4>
            <ul className="space-y-2">
              {[
                'Amarktai Crypto',
                'Amarktai Forex',
                'Faith Haven',
                'Learn Digital',
                'Jobs SA',
              ].map((app) => (
                <li key={app}>
                  <span className="text-sm text-slate-500">{app}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Amarktai Network. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span className="text-xs text-slate-600">Privacy Policy</span>
            <span className="text-xs text-slate-600">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
