'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Loader2,
  RotateCcw,
  Sparkles,
  UploadCloud,
  XCircle,
} from 'lucide-react'

// Git convention: subject line ≤ 72 characters
const MAX_COMMIT_MESSAGE_LENGTH = 72

type Quality = 'best' | 'good' | 'balanced' | 'cheap'

interface Workspace {
  id: string
  owner: string
  repo: string
  branch: string
  status: string
  lastSyncedAt: string | null
}

interface ChangeEntry {
  file: string
  description: string
}

interface RunResult {
  taskId: string
  patchId: string | null
  summary: string
  changes: ChangeEntry[]
  filesAffected: string[]
  risks: string[]
  nextSteps: string[]
  diffText: string
  model: string
  logs: string[]
}

const QUALITY_OPTIONS: Array<{ id: Quality; label: string; hint: string }> = [
  { id: 'best', label: 'Best', hint: 'Most powerful' },
  { id: 'good', label: 'Good', hint: 'High quality' },
  { id: 'balanced', label: 'Balanced', hint: 'Default' },
  { id: 'cheap', label: 'Cheap', hint: 'Fast & light' },
]

export default function RepoWorkbenchPage() {
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [githubConnected, setGithubConnected] = useState(false)
  const [quality, setQuality] = useState<Quality>('balanced')
  const [instruction, setInstruction] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [workBranch, setWorkBranch] = useState('feature/ai-workbench')
  const [status, setStatus] = useState<'idle' | 'importing' | 'running' | 'committing' | 'pushing' | 'pr' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [logsOpen, setLogsOpen] = useState(false)
  const [actionResult, setActionResult] = useState<{ label: string; detail: string } | null>(null)

  const isBusy = status === 'importing' || status === 'running' || status === 'committing' || status === 'pushing' || status === 'pr'

  const loadRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/repo-workbench/repos')
      if (!res.ok) return
      const data = await res.json()
      setGithubConnected(!!data.github?.connected)
      const list: Workspace[] = data.workspaces ?? []
      setWorkspaces(list)
      if (!workspace && list[0]) {
        setWorkspace(list[0])
        setRepoUrl(`https://github.com/${list[0].owner}/${list[0].repo}`)
        setBranch(list[0].branch)
      }
    } catch {
      // ignore
    }
  }, [workspace])

  useEffect(() => { loadRepos() }, [loadRepos])

  async function importRepo() {
    if (!repoUrl.trim()) return
    setStatus('importing')
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/repo-workbench/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim(), branch: branch.trim() || 'main' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Import failed')
      await loadRepos()
      setWorkspace(data.workspace)
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStatus('error')
    }
  }

  async function runAI() {
    if (!workspace || !instruction.trim()) return
    setStatus('running')
    setError('')
    setResult(null)
    setActionResult(null)
    try {
      const res = await fetch(`/api/admin/repo-workbench/${workspace.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: instruction.trim(), quality }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'AI run failed')
      setResult(data as RunResult)
      if (data.summary) setCommitMessage(String(data.summary).slice(0, MAX_COMMIT_MESSAGE_LENGTH))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI run failed')
      setStatus('error')
    }
  }

  async function commitChanges() {
    if (!workspace || !result?.patchId) return
    setStatus('committing')
    setError('')
    try {
      const res = await fetch(`/api/admin/repo-workbench/${workspace.id}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId: result.patchId, message: commitMessage || 'AI workbench changes', branchName: workBranch, confirm: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Commit failed')
      setActionResult({ label: 'Committed', detail: `Branch: ${data.branch} · ${data.files?.length ?? 0} file(s)` })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed')
      setStatus('error')
    }
  }

  async function pushChanges() {
    if (!workspace) return
    setStatus('pushing')
    setError('')
    try {
      const res = await fetch(`/api/admin/repo-workbench/${workspace.id}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Push failed')
      setActionResult({ label: 'Pushed', detail: data.remoteBranchUrl ? `View branch: ${data.remoteBranchUrl}` : `Branch: ${data.branch}` })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed')
      setStatus('error')
    }
  }

  async function createPR() {
    if (!workspace) return
    setStatus('pr')
    setError('')
    try {
      const res = await fetch(`/api/admin/repo-workbench/${workspace.id}/pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: commitMessage || 'AI workbench changes', body: instruction, confirm: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'PR creation failed')
      setActionResult({ label: 'PR Created', detail: data.prUrl ?? '' })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PR failed')
      setStatus('error')
    }
  }

  function resetAll() {
    setResult(null)
    setError('')
    setStatus('idle')
    setActionResult(null)
  }

  const repoLabel = workspace ? `${workspace.owner}/${workspace.repo} @ ${workspace.branch}` : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Sparkles className="h-6 w-6 text-cyan-400" />
            AI Coding Agent
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Powered by GenX — Import a repo, type an instruction, hit Run.</p>
        </div>
        {(result || error) && (
          <button onClick={resetAll} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:text-white">
            <RotateCcw className="h-3.5 w-3.5" /> New run
          </button>
        )}
      </div>

      {/* Step 1: Repo Import */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">1 · Import Repo</p>
        <div className="flex gap-2">
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && importRepo()}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
            placeholder="https://github.com/owner/repo"
          />
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            placeholder="main"
          />
          <button
            onClick={importRepo}
            disabled={isBusy || !repoUrl.trim()}
            className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'importing' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
          </button>
        </div>

        {workspaces.length > 1 && (
          <select
            value={workspace?.id ?? ''}
            onChange={(e) => {
              const w = workspaces.find((x) => x.id === e.target.value) ?? null
              setWorkspace(w)
              if (w) { setRepoUrl(`https://github.com/${w.owner}/${w.repo}`); setBranch(w.branch) }
            }}
            className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.owner}/{w.repo} @ {w.branch}</option>)}
          </select>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {repoLabel
            ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300"><CheckCircle className="h-3 w-3" />{repoLabel}</span>
            : <span className="rounded-full bg-slate-700/40 px-2.5 py-1 text-slate-500">No repo imported</span>
          }
          {githubConnected
            ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">GitHub token connected</span>
            : <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-400">No token — push/PR disabled</span>
          }
        </div>
      </section>

      {/* Step 2: Quality + Instruction */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">2 · Instruction</p>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {QUALITY_OPTIONS.map((q) => (
            <button
              key={q.id}
              onClick={() => setQuality(q.id)}
              className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${
                quality === q.id
                  ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-300'
              }`}
            >
              <span className="block text-sm font-semibold">{q.label}</span>
              <span className="block text-[11px] text-slate-500">{q.hint}</span>
            </button>
          ))}
        </div>

        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={4}
          disabled={isBusy}
          className="w-full resize-none rounded-lg border border-white/10 bg-black/20 p-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/40 disabled:opacity-60"
          placeholder="Tell the AI what you want to do with this repo…"
        />

        <button
          onClick={runAI}
          disabled={isBusy || !workspace || !instruction.trim()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-base font-bold text-white shadow-lg shadow-cyan-900/30 hover:from-cyan-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
        >
          {status === 'running' ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Running AI…</>
          ) : (
            <><Sparkles className="h-5 w-5" /> RUN AI</>
          )}
        </button>

        {status === 'running' && (
          <p className="mt-2 text-center text-xs animate-pulse text-slate-500">
            Auditing repo · Planning fixes · Generating patch…
          </p>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Step 3: Results */}
      {result && (
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">3 · Results</p>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-2 text-xs font-semibold text-cyan-400">Summary</p>
            <p className="text-sm leading-relaxed text-slate-200">{result.summary || 'No summary returned.'}</p>
            {result.model && <p className="mt-2 text-xs text-slate-600">Model: {result.model}</p>}
          </div>

          {result.changes.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-3 text-xs font-semibold text-cyan-400">Changes</p>
              <ul className="space-y-2">
                {result.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0 rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">{c.file}</span>
                    <span className="text-slate-400">{c.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.filesAffected.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-3 text-xs font-semibold text-cyan-400">Files Affected</p>
              <div className="flex flex-wrap gap-1.5">
                {result.filesAffected.map((f, i) => (
                  <span key={i} className="rounded bg-white/5 px-2 py-1 font-mono text-[11px] text-slate-300">{f}</span>
                ))}
              </div>
            </div>
          )}

          {result.risks.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="mb-2 text-xs font-semibold text-amber-400">Risks</p>
              <ul className="space-y-1">
                {result.risks.map((r, i) => <li key={i} className="text-sm text-amber-200">· {r}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Step 4: Actions */}
      {result && (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">4 · Actions</p>

          <div className="mb-4 space-y-2">
            <input
              value={workBranch}
              onChange={(e) => setWorkBranch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="feature/branch-name"
            />
            <input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="Commit message"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionBtn
              onClick={commitChanges}
              disabled={isBusy || !result.patchId}
              icon={GitCommit}
              label={status === 'committing' ? 'Committing…' : 'Commit'}
              spinning={status === 'committing'}
            />
            <ActionBtn
              onClick={pushChanges}
              disabled={isBusy || !githubConnected}
              icon={UploadCloud}
              label={status === 'pushing' ? 'Pushing…' : 'Push'}
              spinning={status === 'pushing'}
              tip={!githubConnected ? 'GitHub token required' : undefined}
            />
            <ActionBtn
              onClick={createPR}
              disabled={isBusy || !githubConnected}
              icon={GitPullRequest}
              label={status === 'pr' ? 'Creating PR…' : 'Create PR'}
              spinning={status === 'pr'}
              tip={!githubConnected ? 'GitHub token required' : undefined}
            />
          </div>

          {!githubConnected && (
            <p className="mt-3 text-xs text-amber-400">Push and PR require a GitHub token. Configure it in Settings → Integrations.</p>
          )}

          {actionResult && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">{actionResult.label}</p>
                {actionResult.detail && (
                  actionResult.detail.startsWith('https://')
                    ? <a href={actionResult.detail} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 underline">{actionResult.detail}</a>
                    : <p className="text-xs text-emerald-400">{actionResult.detail}</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Logs (collapsed) */}
      {result && result.logs.length > 0 && (
        <section>
          <button
            onClick={() => setLogsOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-400 hover:text-slate-300"
          >
            <span className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5" /> Run Logs ({result.logs.length} lines)</span>
            {logsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {logsOpen && (
            <pre className="mt-1 max-h-60 overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-[11px] leading-relaxed text-slate-400">
              {result.logs.join('\n')}
            </pre>
          )}
        </section>
      )}
    </div>
  )
}

function ActionBtn({
  onClick,
  disabled,
  icon: Icon,
  label,
  spinning,
  tip,
}: {
  onClick: () => void
  disabled?: boolean
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  spinning?: boolean
  tip?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tip}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {spinning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  )
}
