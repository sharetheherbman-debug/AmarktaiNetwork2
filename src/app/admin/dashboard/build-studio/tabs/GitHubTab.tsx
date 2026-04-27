'use client'

/**
 * GitHubTab — GitHub Workspace inside Build Studio.
 *
 * Features:
 *   - Connect and validate GitHub PAT
 *   - List repos and branches
 *   - Push files to a repo/branch
 *   - Create pull requests
 *   - Trigger GitHub Actions deploy (workflow_dispatch)
 *   - View recent deploy status
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, CheckCircle, AlertCircle, ExternalLink,
  FolderGit2, RefreshCw, Rocket, GitPullRequest, Play,
  GitBranch,
} from 'lucide-react'

interface RepoInfo {
  name: string
  fullName: string
  url: string
  defaultBranch: string
}
interface BranchInfo { name: string; sha: string; isDefault: boolean }
interface GitHubStatus { connected: boolean; user?: string; repos?: RepoInfo[]; error?: string }
interface RawRepoInfo {
  name?: string
  fullName?: string
  full_name?: string
  url?: string
  html_url?: string
  defaultBranch?: string
  default_branch?: string
}
interface DeployRun {
  id: number
  status: string
  conclusion: string | null
  headBranch: string
  runNumber: number
  htmlUrl: string
  createdAt: string
}

type ActivePanel = 'push' | 'pr' | 'deploy'

export default function GitHubTab() {
  const [status, setStatus] = useState<GitHubStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>('push')

  // Push state
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<{ success: boolean; commitUrl?: string; error?: string } | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [branch, setBranch] = useState<string>('build-studio/output')
  const [exportNotes, setExportNotes] = useState<string>('# Workspace Export\n\nGenerated from Amarktai Workspace.\n')

  // PR state
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [prHead, setPrHead] = useState<string>('')
  const [prBase, setPrBase] = useState<string>('main')
  const [prTitle, setPrTitle] = useState<string>('')
  const [prBody, setPrBody] = useState<string>('')
  const [prDraft, setPrDraft] = useState(false)
  const [creatingPr, setCreatingPr] = useState(false)
  const [prResult, setPrResult] = useState<{ success: boolean; prUrl?: string; error?: string } | null>(null)

  // Deploy state
  const [deployRepo, setDeployRepo] = useState<string>('')
  const [workflowId, setWorkflowId] = useState<string>('deploy.yml')
  const [deployBranch, setDeployBranch] = useState<string>('')
  const [deploying, setDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{ success: boolean; runUrl?: string; error?: string } | null>(null)
  const [deployRuns, setDeployRuns] = useState<DeployRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [valRes, repoRes] = await Promise.all([
        fetch('/api/admin/github/validate'),
        fetch('/api/admin/github/repos'),
      ])
      const valData = valRes.ok ? await valRes.json() : { valid: false }
      const repoData = repoRes.ok ? await repoRes.json() : { repos: [] }
      const repos: RepoInfo[] = Array.isArray(repoData.repos)
        ? repoData.repos.map((r: RawRepoInfo) => ({
            name: r.name ?? '',
            fullName: r.fullName ?? r.full_name ?? '',
            url: r.url ?? r.html_url ?? '',
            defaultBranch: r.defaultBranch ?? r.default_branch ?? 'main',
          }))
        : []

      setStatus({ connected: valData.valid ?? false, user: valData.username ?? valData.user ?? '', repos, error: valData.error })
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to check GitHub') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Load branches when a repo is selected for PR
  const loadBranches = useCallback(async (repo: string) => {
    if (!repo) { setBranches([]); return }
    setLoadingBranches(true)
    try {
      const res = await fetch(`/api/admin/github/branches?repo=${encodeURIComponent(repo)}`)
      if (res.ok) {
        const data = await res.json()
        setBranches(Array.isArray(data.branches) ? data.branches : [])
        const def = data.defaultBranch as string | null
        if (def) setPrBase(def)
      }
    } catch { /* non-fatal */ } finally { setLoadingBranches(false) }
  }, [])

  useEffect(() => {
    if (activePanel === 'pr' && selectedRepo) loadBranches(selectedRepo)
  }, [activePanel, selectedRepo, loadBranches])

  // Load deploy runs
  const loadDeployRuns = useCallback(async () => {
    const repo = deployRepo || selectedRepo
    if (!repo) return
    setLoadingRuns(true)
    try {
      const res = await fetch(`/api/admin/github/deploy?repo=${encodeURIComponent(repo)}&workflowId=${encodeURIComponent(workflowId)}`)
      if (res.ok) {
        const data = await res.json()
        setDeployRuns(Array.isArray(data.runs) ? data.runs : [])
      }
    } catch { /* non-fatal */ } finally { setLoadingRuns(false) }
  }, [deployRepo, selectedRepo, workflowId])

  useEffect(() => {
    if (activePanel === 'deploy') loadDeployRuns()
  }, [activePanel, loadDeployRuns])

  const pushToGitHub = useCallback(async () => {
    if (!selectedRepo) return
    setPushing(true); setPushResult(null)
    try {
      const res = await fetch('/api/admin/github/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 0, repoFullName: selectedRepo, branch,
          commitMessage: `Workspace export — ${new Date().toISOString()}`,
          files: [{ path: `workspace/exports/workspace-export-${Date.now()}.md`, content: exportNotes }],
        }),
      })
      const data = await res.json().catch(() => ({ success: false, error: 'Invalid response' }))
      setPushResult(res.ok ? data : { success: false, error: data.error ?? `Push failed: HTTP ${res.status}` })
    } catch (e) { setPushResult({ success: false, error: e instanceof Error ? e.message : 'Push failed' }) } finally { setPushing(false) }
  }, [selectedRepo, branch, exportNotes])

  const submitPR = useCallback(async () => {
    if (!selectedRepo || !prHead || !prBase || !prTitle) return
    setCreatingPr(true); setPrResult(null)
    try {
      const res = await fetch('/api/admin/github/pr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: selectedRepo, head: prHead, base: prBase, title: prTitle, description: prBody, draft: prDraft }),
      })
      const data = await res.json().catch(() => ({ success: false }))
      setPrResult({ success: data.success, prUrl: data.prUrl ?? undefined, error: data.error ?? undefined })
    } catch (e) { setPrResult({ success: false, error: e instanceof Error ? e.message : 'PR creation failed' }) } finally { setCreatingPr(false) }
  }, [selectedRepo, prHead, prBase, prTitle, prBody, prDraft])

  const triggerDeploy = useCallback(async () => {
    const repo = deployRepo || selectedRepo
    if (!repo || !workflowId) return
    setDeploying(true); setDeployResult(null)
    try {
      const res = await fetch('/api/admin/github/deploy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: repo, workflowId, branch: deployBranch || undefined }),
      })
      const data = await res.json().catch(() => ({ success: false }))
      setDeployResult({ success: data.success, runUrl: data.runUrl ?? undefined, error: data.error ?? undefined })
      if (data.success) setTimeout(() => loadDeployRuns(), 2000)
    } catch (e) { setDeployResult({ success: false, error: e instanceof Error ? e.message : 'Deploy failed' }) } finally { setDeploying(false) }
  }, [deployRepo, selectedRepo, workflowId, deployBranch, loadDeployRuns])

  if (loading) {
    return <div className="flex items-center gap-2 py-16 justify-center text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Checking GitHub connection…</div>
  }

  const panelBtnClass = (panel: ActivePanel) =>
    `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${activePanel === panel ? 'border-blue-400/40 bg-blue-400/10 text-white' : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white'}`

  return (
    <div className="space-y-5">
      <div className="text-sm text-slate-400">
        Full GitHub Workspace — push files, create pull requests, and trigger deploys from the dashboard.
      </div>

      {error && <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-300 text-sm"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}</div>}

      {/* Connection status */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2">
          {status?.connected ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
          <span className="text-sm font-medium text-white">{status?.connected ? 'GitHub Connected' : 'GitHub Not Connected'}</span>
          {status?.user && <span className="text-xs text-slate-500">({status.user})</span>}
          <button onClick={load} className="ml-auto text-xs text-slate-500 hover:text-white"><RefreshCw className="w-3 h-3" /></button>
        </div>
        {!status?.connected && (
          <div className="mt-2 text-xs text-slate-400">Configure your GitHub PAT at <span className="text-blue-400">Admin → Integrations → GitHub</span> to enable workspace integration.</div>
        )}
      </div>

      {status?.connected && (
        <>
          {/* Shared repo selector */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Repository</div>
            <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40">
              <option value="">Select repository…</option>
              {status.repos?.map((r) => <option key={r.fullName} value={r.fullName}>{r.fullName}</option>)}
            </select>
          </div>

          {/* Panel tabs */}
          <div className="flex gap-2">
            <button className={panelBtnClass('push')} onClick={() => setActivePanel('push')}><FolderGit2 className="w-3 h-3" />Push Files</button>
            <button className={panelBtnClass('pr')} onClick={() => setActivePanel('pr')}><GitPullRequest className="w-3 h-3" />Pull Request</button>
            <button className={panelBtnClass('deploy')} onClick={() => setActivePanel('deploy')}><Rocket className="w-3 h-3" />Deploy</button>
          </div>

          {/* Push panel */}
          {activePanel === 'push' && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-4">
              <div className="text-sm font-medium text-white">Push Files to Repository</div>
              <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch name (e.g. feature/my-branch)"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40" />
              <textarea value={exportNotes} onChange={(e) => setExportNotes(e.target.value)} rows={6} placeholder="File content to commit"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40" />
              <button onClick={pushToGitHub} disabled={pushing || !selectedRepo}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-40 transition-colors">
                {pushing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderGit2 className="w-3 h-3" />}
                {pushing ? 'Pushing…' : 'Push to GitHub'}
              </button>
              {pushResult && (
                <div className={`text-xs rounded-lg p-3 ${pushResult.success ? 'bg-emerald-500/5 text-emerald-300' : 'bg-red-500/5 text-red-300'}`}>
                  {pushResult.success
                    ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Pushed successfully{pushResult.commitUrl && <a href={pushResult.commitUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-400 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View commit</a>}</span>
                    : <span>{pushResult.error ?? 'Push failed'}</span>}
                </div>
              )}
            </div>
          )}

          {/* PR panel */}
          {activePanel === 'pr' && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-4">
              <div className="text-sm font-medium text-white flex items-center gap-2"><GitPullRequest className="w-4 h-4 text-blue-400" />Create Pull Request</div>
              {loadingBranches && <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" />Loading branches…</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Head branch (source)</label>
                  <div className="relative">
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    <select value={prHead} onChange={(e) => setPrHead(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40">
                      <option value="">Select source branch…</option>
                      {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Base branch (target)</label>
                  <div className="relative">
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    <select value={prBase} onChange={(e) => setPrBase(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40">
                      {branches.map((b) => <option key={b.name} value={b.name}>{b.name}{b.isDefault ? ' (default)' : ''}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <input value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder="Pull request title"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40" />
              <textarea value={prBody} onChange={(e) => setPrBody(e.target.value)} rows={4} placeholder="Pull request description (optional)"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40" />
              <div className="flex items-center gap-2">
                <input id="pr-draft" type="checkbox" checked={prDraft} onChange={(e) => setPrDraft(e.target.checked)} className="rounded" />
                <label htmlFor="pr-draft" className="text-xs text-slate-400">Create as draft PR</label>
              </div>
              <button onClick={submitPR} disabled={creatingPr || !selectedRepo || !prHead || !prTitle}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium disabled:opacity-40 transition-colors">
                {creatingPr ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitPullRequest className="w-3 h-3" />}
                {creatingPr ? 'Creating PR…' : 'Create Pull Request'}
              </button>
              {prResult && (
                <div className={`text-xs rounded-lg p-3 ${prResult.success ? 'bg-emerald-500/5 text-emerald-300' : 'bg-red-500/5 text-red-300'}`}>
                  {prResult.success
                    ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> PR created{prResult.prUrl && <a href={prResult.prUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-400 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View PR</a>}</span>
                    : <span>{prResult.error ?? 'PR creation failed'}</span>}
                </div>
              )}
            </div>
          )}

          {/* Deploy panel */}
          {activePanel === 'deploy' && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-4">
              <div className="text-sm font-medium text-white flex items-center gap-2"><Rocket className="w-4 h-4 text-emerald-400" />Trigger GitHub Actions Deploy</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[11px] text-slate-500">Override repo (optional)</label>
                  <input value={deployRepo} onChange={(e) => setDeployRepo(e.target.value)} placeholder={selectedRepo || 'owner/repo'}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Workflow file</label>
                  <input value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} placeholder="deploy.yml"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Branch (optional)</label>
                  <input value={deployBranch} onChange={(e) => setDeployBranch(e.target.value)} placeholder="main"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={triggerDeploy} disabled={deploying || (!deployRepo && !selectedRepo) || !workflowId}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium disabled:opacity-40 transition-colors">
                  {deploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  {deploying ? 'Triggering…' : 'Trigger Deploy'}
                </button>
                <button onClick={loadDeployRuns} disabled={loadingRuns} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] text-xs text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
                  <RefreshCw className={`w-3 h-3 ${loadingRuns ? 'animate-spin' : ''}`} />Refresh
                </button>
              </div>
              {deployResult && (
                <div className={`text-xs rounded-lg p-3 ${deployResult.success ? 'bg-emerald-500/5 text-emerald-300' : 'bg-red-500/5 text-red-300'}`}>
                  {deployResult.success
                    ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Deploy triggered{deployResult.runUrl && <a href={deployResult.runUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-400 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View runs</a>}</span>
                    : <span>{deployResult.error ?? 'Deploy trigger failed'}</span>}
                </div>
              )}
              {/* Recent runs */}
              {deployRuns.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">Recent Workflow Runs</div>
                  {deployRuns.map((run) => (
                    <a key={run.id} href={run.htmlUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.04] transition-colors group">
                      <div className="flex items-center gap-2 text-xs">
                        <StatusDot status={run.status} conclusion={run.conclusion} />
                        <span className="text-slate-300">#{run.runNumber}</span>
                        <span className="text-slate-500">{run.headBranch}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                        {new Date(run.createdAt).toLocaleString()}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatusDot({ status, conclusion }: { status: string; conclusion: string | null }) {
  const cls =
    conclusion === 'success' ? 'bg-emerald-400' :
    conclusion === 'failure' || conclusion === 'cancelled' ? 'bg-red-400' :
    status === 'in_progress' ? 'bg-yellow-400 animate-pulse' :
    status === 'queued' ? 'bg-slate-400' : 'bg-slate-500'
  return <span className={`w-2 h-2 rounded-full shrink-0 ${cls}`} />
}

