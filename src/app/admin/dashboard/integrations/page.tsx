'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Plug, X, Loader2, CheckCircle, AlertCircle, Clock, Copy } from 'lucide-react'
import { format } from 'date-fns'

interface Integration {
  id: number
  productId: number
  integrationToken: string
  heartbeatEnabled: boolean
  metricsEnabled: boolean
  eventsEnabled: boolean
  lastHeartbeatAt: string | null
  healthStatus: string
  createdAt: string
  product: { id: number; name: string; slug: string }
}

interface Product {
  id: number
  name: string
  slug: string
  integration: null | { id: number }
}

const healthIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <CheckCircle className="w-4 h-4 text-emerald-400" />
    case 'unhealthy': return <AlertCircle className="w-4 h-4 text-red-400" />
    default: return <Clock className="w-4 h-4 text-slate-400" />
  }
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ productId: 0, heartbeatEnabled: true, metricsEnabled: true, eventsEnabled: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/integrations').then(r => r.json()),
      fetch('/api/admin/products').then(r => r.json()),
    ]).then(([ints, prods]) => {
      setIntegrations(Array.isArray(ints) ? ints : [])
      setProducts(Array.isArray(prods) ? prods : [])
      setLoading(false)
    })
  }, [])

  const availableProducts = products.filter(p => !p.integration)

  const copyToken = (id: number, token: string) => {
    navigator.clipboard.writeText(token)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.productId) { setError('Select a product'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const data = await fetch('/api/admin/integrations').then(r => r.json())
        setIntegrations(Array.isArray(data) ? data : [])
        const prods = await fetch('/api/admin/products').then(r => r.json())
        setProducts(Array.isArray(prods) ? prods : [])
        setModalOpen(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this integration? The token will stop working.')) return
    await fetch(`/api/admin/integrations/${id}`, { method: 'DELETE' })
    setIntegrations(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Integrations</h1>
          <p className="text-sm text-slate-400 mt-1">Connect apps to the monitoring system</p>
        </div>
        <button
          onClick={() => { setForm({ productId: 0, heartbeatEnabled: true, metricsEnabled: true, eventsEnabled: true }); setError(''); setModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New Integration
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : integrations.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Plug className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No integrations yet. Connect an app to start monitoring.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration, i) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {healthIcon(integration.healthStatus)}
                  <div>
                    <p className="font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>{integration.product.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {integration.lastHeartbeatAt
                        ? `Last heartbeat: ${format(new Date(integration.lastHeartbeatAt), 'MMM d, HH:mm')}`
                        : 'No heartbeat received yet'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(integration.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4 p-3 bg-black/20 rounded-lg flex items-center gap-2">
                <code className="text-xs text-cyan-400 font-mono flex-1 truncate">{integration.integrationToken}</code>
                <button
                  onClick={() => copyToken(integration.id, integration.integrationToken)}
                  className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
                >
                  {copiedId === integration.id ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="mt-3 flex gap-3">
                {[
                  { key: 'heartbeatEnabled', label: 'Heartbeat', value: integration.heartbeatEnabled },
                  { key: 'metricsEnabled', label: 'Metrics', value: integration.metricsEnabled },
                  { key: 'eventsEnabled', label: 'Events', value: integration.eventsEnabled },
                ].map((toggle) => (
                  <div key={toggle.key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${toggle.value ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${toggle.value ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    {toggle.label}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[#0B1020] border border-white/10 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>New Integration</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Product *</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm(p => ({ ...p, productId: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
                >
                  <option value={0}>Select a product...</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {[
                  { key: 'heartbeatEnabled', label: 'Enable Heartbeat' },
                  { key: 'metricsEnabled', label: 'Enable Metrics' },
                  { key: 'eventsEnabled', label: 'Enable Events' },
                ].map((toggle) => (
                  <label key={toggle.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[toggle.key as keyof typeof form] as boolean}
                      onChange={(e) => setForm(p => ({ ...p, [toggle.key]: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-300">{toggle.label}</span>
                  </label>
                ))}
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 glass text-slate-400 text-sm rounded-xl hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
