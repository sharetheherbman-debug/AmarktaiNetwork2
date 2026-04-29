'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, CheckCircle, RefreshCw, XCircle } from 'lucide-react'

interface AuditCheck {
  id: string
  category: string
  name: string
  description: string
  status: 'pass' | 'fail' | 'warning' | 'not_checked'
  details: string
  critical: boolean
}

interface ReadinessReport {
  timestamp: string
  overallReady: boolean
  score: number
  totalChecks: number
  passed: number
  failed: number
  warnings: number
  criticalFailures: number
  checks: AuditCheck[]
  summary: string
}

export default function ReadinessPage() {
  const [report, setReport] = useState<ReadinessReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/readiness')
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setReport(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load readiness audit')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const critical = report?.checks.filter((check) => check.critical && check.status === 'fail') ?? []
  const warnings = report?.checks.filter((check) => check.status === 'warning') ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Go-live Readiness</h1>
            <p className="text-sm text-slate-500">Live audit results from backend checks. No manual overrides.</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400 hover:text-white disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {report && (
        <>
          <section className={`rounded-2xl border p-5 ${report.overallReady ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {report.overallReady ? <CheckCircle className="h-6 w-6 text-emerald-400" /> : <XCircle className="h-6 w-6 text-red-400" />}
                <div>
                  <p className="text-lg font-semibold text-white">{report.overallReady ? 'Critical checks pass' : 'Not go-live safe'}</p>
                  <p className="text-sm text-slate-400">{report.summary}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{report.score}/100</p>
                <p className="text-xs text-slate-500">{new Date(report.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Checks" value={report.totalChecks} />
            <Metric label="Passed" value={report.passed} tone="ok" />
            <Metric label="Failed" value={report.failed} tone={report.failed > 0 ? 'error' : 'ok'} />
            <Metric label="Warnings" value={report.warnings} tone={report.warnings > 0 ? 'warn' : 'ok'} />
          </section>

          {critical.length > 0 && (
            <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <h2 className="mb-3 text-sm font-semibold text-red-300">Critical blockers</h2>
              <div className="space-y-2">
                {critical.map((check) => <CheckRow key={check.id} check={check} />)}
              </div>
            </section>
          )}

          {warnings.length > 0 && (
            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h2 className="mb-3 text-sm font-semibold text-amber-300">Warnings</h2>
              <div className="space-y-2">
                {warnings.map((check) => <CheckRow key={check.id} check={check} />)}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">All Checks</h2>
            <div className="space-y-2">
              {report.checks.map((check) => <CheckRow key={check.id} check={check} />)}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'ok' | 'warn' | 'error' }) {
  const color = tone === 'ok' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : tone === 'error' ? 'text-red-400' : 'text-white'
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">{label}</p>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function CheckRow({ check }: { check: AuditCheck }) {
  const cfg = check.status === 'pass'
    ? { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/10' }
    : check.status === 'fail'
      ? { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/10' }
      : { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/10' }
  const Icon = cfg.icon
  return (
    <div className={`rounded-xl border p-3 ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-white">{check.name}</p>
            {check.critical && <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">critical</span>}
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">{check.category}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{check.details || check.description}</p>
        </div>
      </div>
    </div>
  )
}
