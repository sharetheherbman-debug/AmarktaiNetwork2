'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  FileCode2,
  FolderGit2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react'

type AgentMode = 'repo_auditor' | 'frontend_fixer' | 'backend_fixer' | 'fullstack_builder' | 'deployment_engineer' | 'qa_agent' | 'security_reviewer'

interface ModelChoice {
  id: string
  label: string
  provider: string
  source: string
  capabilityTags: string[]
  costTier: string
  contextWindow: number
  bestFor: string
  available: boolean
}

interface Workspace {
  id: string
  owner: string
  repo: string
  branch: string
  remoteUrl: string
  localPath: string
  currentCommit: string
  status: string
  lastSyncedAt: string | null
  tasks?: Array<{ id: string; title: string; status: string; testStatus: string; buildStatus: string; updatedAt: string; artifactIdsJson: string }>
  patches?: Array<{ id: string; title: string; status: string; branchName: string; commitSha: string | null; prUrl: string | null; artifactId: string | null; updatedAt: string }>
}

interface TreeEntry {
  path: string
  type: 'file' | 'dir'
  size: number
}

const AGENTS: Array<{ id: AgentMode; label: string; hint: string }> = [
  { id: 'repo_auditor', label: 'Repo Auditor', hint: 'Architecture, risks, blockers' },
  { id: 'frontend_fixer', label: 'Frontend Fixer', hint: 'React, layout, dead UI' },
  { id: 'backend_fixer', label: 'Backend Fixer', hint: 'API, DB, auth, storage' },
  { id: 'fullstack_builder', label: 'Fullstack Builder', hint: 'End-to-end features' },
  { id: 'deployment_engineer', label: 'Deployment Engineer', hint: 'Docker, VPS, health checks' },
  { id: 'qa_agent', label: 'QA/Test Agent', hint: 'Tests, lint, regression' },
  { id: 'security_reviewer', label: 'Security Reviewer', hint: 'Secrets, traversal, unsafe ops' },
]

export default function RepoWorkbenchPage() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/amarktainetwork-blip/Amarktai-Network2.git')
  const [branch, setBranch] = useState('main')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [githubConnected, setGithubConnected] = useState(false)
  const [models, setModels] = useState<Record<string, ModelChoice[]>>({ recommended: [], fast: [], balanced: [], premium: [], all: [] })
  const [modelTab, setModelTab] = useState<'recommended' | 'fast' | 'balanced' | 'premium' | 'all'>('recommended')
  const [modelId, setModelId] = useState('')
  const [agentMode, setAgentMode] = useState<AgentMode>('repo_auditor')
  const [tree, setTree] = useState<TreeEntry[]>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [request, setRequest] = useState('Audit this repo and identify the safest next fixes.')
  const [lastTaskId, setLastTaskId] = useState('')
  const [lastPatchId, setLastPatchId] = useState('')
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null)
  const [diffText, setDiffText] = useState('')
  const [status, setStatus] = useState('ready')
  const [error, setError] = useState('')
  const [commitMessage, setCommitMessage] = useState('Add Repo Workbench coding agent bootstrap')
  const [workBranch, setWorkBranch] = useState('feature/repo-workbench-coding-agents')

  const selectedFiles = useMemo(() => selectedFile ? [selectedFile] : [], [selectedFile])
  const currentPatch = workspace?.patches?.[0]
  const currentTask = workspace?.tasks?.[0]

  const load = useCallback(async () => {
    const [repoRes, modelRes] = await Promise.all([
      fetch('/api/admin/repo-workbench/repos'),
      fetch('/api/admin/repo-workbench/models'),
    ])
    if (repoRes.ok) {
      const data = await repoRes.json()
      setGithubConnected(!!data.github?.connected)
      setWorkspaces(data.workspaces ?? [])
      if (!workspace && data.workspaces?.[0]) setWorkspace(data.workspaces[0])
    }
    if (modelRes.ok) {
      const data = await modelRes.json()
      setModels(data)
      const first = data.recommended?.[0] ?? data.balanced?.[0] ?? data.all?.[0]
      if (first && !modelId) setModelId(first.id)
    }
  }, [modelId, workspace])

  useEffect(() => { load() }, [load])

  const loadTree = useCallback(async (workspaceId = workspace?.id) => {
    if (!workspaceId) return
    const res = await fetch(`/api/admin/repo-workbench/${workspaceId}/tree`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Failed to load tree')
    setWorkspace(data.workspace)
    setTree(data.tree ?? [])
  }, [workspace?.id])

  useEffect(() => { if (workspace?.id) loadTree(workspace.id).catch(() => null) }, [workspace?.id, loadTree])

  async function run(label: string, fn: () => Promise<void>) {
    setStatus(label)
    setError('')
    try {
      await fn()
      setStatus('completed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
      setStatus('failed')
    }
  }

  async function importWorkspace() {
    await run('importing', async () => {
      const res = await fetch('/api/admin/repo-workbench/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Import failed')
      setWorkspace(data.workspace)
      await loadTree(data.workspaceId)
    })
  }

  async function openFile(path: string) {
    if (!workspace) return
    await run('opening file', async () => {
      const res = await fetch(`/api/admin/repo-workbench/${workspace.id}/file?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'File rejected')
      setSelectedFile(path)
      setFileContent(data.content)
    })
  }

  async function audit() {
    if (!workspace) return
    await run('auditing', async () => {
      const res = await post(`/api/admin/repo-workbench/${workspace.id}/audit`, { agentMode, modelId, depth: 'standard' })
      setPanel(res.audit)
      setLastTaskId(res.task?.id ?? '')
    })
  }

  async function plan() {
    if (!workspace) return
    await run('planning', async () => {
      const res = await post(`/api/admin/repo-workbench/${workspace.id}/plan`, { request, scope: 'auto', agentMode, modelId })
      setPanel(res.plan)
      setLastTaskId(res.task?.id ?? '')
    })
  }

  async function patch() {
    if (!workspace) return
    await run('generating patch', async () => {
      const res = await post(`/api/admin/repo-workbench/${workspace.id}/patch`, { taskId: lastTaskId || undefined, request, files: selectedFiles, agentMode, modelId })
      setPanel(res.proposal)
      setDiffText(res.patch?.diffText ?? '')
      setLastPatchId(res.patch?.id ?? '')
    })
  }

  async function check(command: 'test' | 'lint' | 'build' | 'audit') {
    if (!workspace) return
    await run(`running ${command}`, async () => {
      const res = await post(`/api/admin/repo-workbench/${workspace.id}/run-check`, { command, taskId: lastTaskId || undefined })
      setPanel({ command, success: res.success, output: res.output, artifactId: res.artifact?.id })
    })
  }

  async function applyPatch() {
    if (!workspace || !lastPatchId) return
    await run('applying patch', async () => {
      const res = await post(`/api/admin/repo-workbench/${workspace.id}/apply-patch`, { patchId: lastPatchId, confirm: true })
      setPanel({ applied: true, changedFiles: res.changedFiles, artifactId: res.artifact?.id })
    })
  }

  async function commit() {
    if (!workspace || !lastPatchId) return
    await run('committing', async () => {
      const res = await post(`/api/admin/repo-workbench/${workspace.id}/commit`, { patchId: lastPatchId, message: commitMessage, branchName: workBranch, confirm: true })
      setPanel({ committed: true, branch: res.branch, commitSha: res.commitSha, files: res.files, artifactId: res.artifact?.id })
    })
  }

  async function push() {
    if (!workspace) return
    await run('pushing', async () => {
      const res = await post(`/api/admin/repo-workbench/${workspace.id}/push`, { confirm: true })
      setPanel({ pushed: true, branch: res.branch, remoteBranchUrl: res.remoteBranchUrl, artifactId: res.artifact?.id })
    })
  }

  async function pr() {
    if (!workspace) return
    await run('creating PR', async () => {
      const res = await post(`/api/admin/repo-workbench/${workspace.id}/pr`, { title: commitMessage, body: request, confirm: true })
      setPanel({ prCreated: true, prUrl: res.prUrl, artifactId: res.artifact?.id })
    })
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Repo Workbench</h1>
          <p className="mt-1 text-sm text-slate-500">Controlled repo import, audit, patch, checks, commit, push, and PR flow for Amarktai Coding Agent.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:text-white">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <FolderGit2 className="h-4 w-4 text-cyan-400" /> Import or Sync Repo
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
            <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" placeholder="https://github.com/owner/repo" />
            <input value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" placeholder="main" />
            <button onClick={importWorkspace} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Import</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <StatusPill ok={githubConnected} label={githubConnected ? 'GitHub token connected' : 'Public import available, token required for push/PR'} />
            <StatusPill ok={status === 'completed' || status === 'ready'} label={`Status: ${status}`} />
          </div>
          {workspaces.length > 0 && (
            <select value={workspace?.id ?? ''} onChange={(e) => setWorkspace(workspaces.find((w) => w.id === e.target.value) ?? null)} className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.owner}/{w.repo} @ {w.branch}</option>)}
            </select>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Self-repair Status
          </div>
          <Info label="Repo connected" value={workspace ? 'Yes' : 'No'} />
          <Info label="Current branch" value={workspace?.branch ?? 'None'} />
          <Info label="Last audit" value={currentTask?.title ?? 'None'} />
          <Info label="Last test" value={currentTask?.testStatus || 'Not run'} />
          <Info label="Last build" value={currentTask?.buildStatus || 'Not run'} />
          <Info label="Pending patch" value={currentPatch?.status === 'proposed' ? currentPatch.id : 'None'} />
          <Info label="Last commit/push" value={currentPatch?.commitSha ? currentPatch.commitSha.slice(0, 8) : currentPatch?.status ?? 'None'} />
          <p className="mt-3 text-xs text-slate-500">Next recommended action: {workspace ? 'Run audit, review plan, then generate a patch.' : 'Import a repo.'}</p>
        </div>
      </section>

      {workspace && (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-3 text-xs md:grid-cols-4">
            <Info label="Workspace" value={`${workspace.owner}/${workspace.repo}`} />
            <Info label="Commit" value={workspace.currentCommit ? workspace.currentCommit.slice(0, 12) : 'Unknown'} />
            <Info label="Local path" value={workspace.localPath} />
            <Info label="Last synced" value={workspace.lastSyncedAt ? new Date(workspace.lastSyncedAt).toLocaleString() : 'Never'} />
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel title="Model Selector" icon={Sparkles}>
            <div className="mb-2 grid grid-cols-5 gap-1">
              {(['recommended', 'fast', 'balanced', 'premium', 'all'] as const).map((tab) => (
                <button key={tab} onClick={() => setModelTab(tab)} className={`rounded-md px-2 py-1 text-[10px] ${modelTab === tab ? 'bg-cyan-500 text-slate-950' : 'bg-white/5 text-slate-400'}`}>{tab}</button>
              ))}
            </div>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white">
              {(models[modelTab] ?? []).map((m) => <option key={m.id} value={m.id}>{m.label} - {m.costTier}</option>)}
            </select>
            <p className="mt-2 text-xs text-slate-500">{(models.all ?? []).find((m) => m.id === modelId)?.bestFor ?? 'Choose a coding/reasoning model.'}</p>
          </Panel>

          <Panel title="Coding Agent" icon={GitBranch}>
            <div className="space-y-2">
              {AGENTS.map((agent) => (
                <button key={agent.id} onClick={() => setAgentMode(agent.id)} className={`w-full rounded-lg border px-3 py-2 text-left ${agentMode === agent.id ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/10 bg-white/[0.02]'}`}>
                  <span className="block text-sm text-white">{agent.label}</span>
                  <span className="text-xs text-slate-500">{agent.hint}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="File Tree" icon={FileCode2}>
            <div className="max-h-[520px] overflow-auto rounded-lg border border-white/10 bg-black/20">
              {tree.filter((e) => e.type === 'file').slice(0, 350).map((entry) => (
                <button key={entry.path} onClick={() => openFile(entry.path)} className={`block w-full truncate px-3 py-1.5 text-left text-xs hover:bg-white/5 ${selectedFile === entry.path ? 'bg-cyan-400/10 text-cyan-200' : 'text-slate-400'}`}>
                  {entry.path}
                </button>
              ))}
              {tree.length === 0 && <p className="p-3 text-xs text-slate-500">Import a repo to browse files.</p>}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="File Viewer" icon={FileCode2}>
            <div className="mb-2 text-xs text-slate-500">{selectedFile || 'No file selected'}</div>
            <pre className="max-h-[360px] overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-slate-300">{fileContent || 'Select a safe text file to preview it.'}</pre>
          </Panel>

          <Panel title="Ask Amarktai Coding Agent" icon={Sparkles}>
            <textarea value={request} onChange={(e) => setRequest(e.target.value)} rows={4} className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white outline-none" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Action onClick={audit} disabled={!workspace} icon={ShieldCheck} label="Audit" />
              <Action onClick={plan} disabled={!workspace} icon={Sparkles} label="Plan" />
              <Action onClick={patch} disabled={!workspace} icon={FileCode2} label="Generate Patch" />
              <Action onClick={applyPatch} disabled={!workspace || !lastPatchId} icon={CheckCircle} label="Apply Patch" danger />
            </div>
          </Panel>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Audit / Plan Result" icon={AlertCircle}>
              <pre className="max-h-[360px] overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-300">{panel ? JSON.stringify(panel, null, 2) : 'Results will appear here and save as artifacts.'}</pre>
            </Panel>
            <Panel title="Patch Diff" icon={FileCode2}>
              <pre className="max-h-[360px] overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-300">{diffText || currentPatch?.title || 'Patch proposal will appear here.'}</pre>
            </Panel>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Checks" icon={Play}>
              <div className="flex flex-wrap gap-2">
                {(['test', 'lint', 'build', 'audit'] as const).map((cmd) => <Action key={cmd} onClick={() => check(cmd)} disabled={!workspace} icon={Play} label={cmd} />)}
              </div>
              <p className="mt-3 text-xs text-slate-500">Only npm test, npm run lint, npm run build, and npm audit --audit-level=moderate are allowed.</p>
            </Panel>
            <Panel title="Commit / Push / PR" icon={GitCommit}>
              <input value={workBranch} onChange={(e) => setWorkBranch(e.target.value)} className="mb-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" placeholder="feature/branch-name" />
              <input value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} className="mb-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" placeholder="Commit message" />
              <div className="flex flex-wrap gap-2">
                <Action onClick={commit} disabled={!workspace || !lastPatchId} icon={GitCommit} label="Commit" danger />
                <Action onClick={push} disabled={!workspace || !githubConnected} icon={UploadCloud} label="Push" danger />
                <Action onClick={pr} disabled={!workspace || !githubConnected} icon={GitPullRequest} label="Draft PR" danger />
              </div>
              {!githubConnected && <p className="mt-3 text-xs text-amber-300">GitHub token required for push and PR. Public clone/audit still works.</p>}
            </Panel>
          </section>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">{error}</div>}
        </div>
      </section>
    </div>
  )
}

async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
}

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-cyan-400" /> {title}
      </div>
      {children}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">{label}</p>
      <p className="truncate text-xs text-slate-300" title={value}>{value}</p>
    </div>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`rounded-full px-2 py-1 ${ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{label}</span>
}

function Action({ onClick, disabled, icon: Icon, label, danger }: { onClick: () => void; disabled?: boolean; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${danger ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-white/10 text-white hover:bg-white/15'}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}
