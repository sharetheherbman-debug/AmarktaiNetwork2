import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { prisma } from '@/lib/prisma'
import { createArtifact } from '@/lib/artifact-store'
import { getStorageStatus, verifyStorage } from '@/lib/storage-driver'
import { MODEL_REGISTRY } from '@/lib/model-registry'
import { listGenXModels } from '@/lib/genx-client'
import { routeWorkspaceTask } from '@/lib/workspace-executor'

const execFileAsync = promisify(execFile)

export const REPO_EXCLUDES = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.cache',
  '.vercel',
])

const SECRET_FILE_PATTERNS = [
  /^\.env($|\.)/i,
  /(^|\/)\.env($|\.)/i,
  /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/i,
  /\.(pem|key|p12|pfx)$/i,
]

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico',
  'mp3', 'mp4', 'wav', 'ogg', 'flac', 'aac',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'tar', 'gz', 'rar', '7z', 'wasm', 'bin',
  'ttf', 'woff', 'woff2', 'eot', 'exe', 'dll', 'so',
])

const MAX_TEXT_FILE_BYTES = 512 * 1024
const MAX_TREE_ENTRIES = 1500

export type AgentMode =
  | 'repo_auditor'
  | 'frontend_fixer'
  | 'backend_fixer'
  | 'fullstack_builder'
  | 'deployment_engineer'
  | 'qa_agent'
  | 'security_reviewer'

export interface RepoModelChoice {
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

export const AGENT_MODES: Record<AgentMode, { label: string; capability: 'code_generation' | 'code'; prompt: string }> = {
  repo_auditor: {
    label: 'Repo Auditor',
    capability: 'code',
    prompt: 'Audit architecture, risks, incomplete flows, tests, build, deployment, security, and go-live blockers. Output phases and concrete fixes.',
  },
  frontend_fixer: {
    label: 'Frontend Fixer',
    capability: 'code_generation',
    prompt: 'Focus on React/Next UI, responsiveness, layout, console errors, state flow, and dead buttons. Output file-specific fixes and patches.',
  },
  backend_fixer: {
    label: 'Backend Fixer',
    capability: 'code_generation',
    prompt: 'Focus on API routes, database, auth/session, storage, provider integrations, and truthful status handling. Output backend fix plan and patches.',
  },
  fullstack_builder: {
    label: 'Fullstack Builder',
    capability: 'code_generation',
    prompt: 'Build complete end-to-end features across frontend, backend, persistence, tests, and verification. Output implementation plan and patches.',
  },
  deployment_engineer: {
    label: 'Deployment Engineer',
    capability: 'code',
    prompt: 'Focus on Docker, systemd, VPS, Nginx, env setup, build scripts, health checks, rollback, and deployment verification.',
  },
  qa_agent: {
    label: 'QA/Test Agent',
    capability: 'code',
    prompt: 'Focus on tests, lint, build, regression risks, failing checks, and concise fixes. Output test plan and remediation.',
  },
  security_reviewer: {
    label: 'Security Reviewer',
    capability: 'code',
    prompt: 'Focus on secrets, auth, unsafe shell, path traversal, dependency risk, data exposure, and permission boundaries. Output security findings and fixes.',
  },
}

export function parseGitHubRepoUrl(repoUrl: string): { owner: string; repo: string; remoteUrl: string } {
  let parsed: URL
  try {
    parsed = new URL(repoUrl.trim())
  } catch {
    throw new Error('Invalid GitHub URL')
  }
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com') {
    throw new Error('Only https://github.com/owner/repo URLs are supported')
  }
  const parts = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/')
  if (parts.length < 2) throw new Error('GitHub URL must include owner and repo')
  const owner = sanitizeName(parts[0], 'owner')
  const repo = sanitizeName(parts[1].replace(/\.git$/i, ''), 'repo')
  return { owner, repo, remoteUrl: `https://github.com/${owner}/${repo}.git` }
}

export function sanitizeName(value: string, label = 'value'): string {
  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) throw new Error(`Invalid ${label}`)
  return value
}

export function sanitizeBranchName(value: string): string {
  const branch = (value || 'main').trim()
  if (!branch || branch.includes('..') || branch.startsWith('/') || branch.endsWith('/')) {
    throw new Error('Invalid branch name')
  }
  if (!/^[a-zA-Z0-9/_@{}#.-]+$/.test(branch)) throw new Error('Invalid branch name')
  return branch
}

export function sanitizeLocalBranch(value: string): string {
  return sanitizeBranchName(value).replace(/[^a-zA-Z0-9/_@{}#.-]/g, '-')
}

export function getRepoStorageRoot(): string {
  const status = getStorageStatus()
  return path.resolve(status.basePath, 'repos')
}

export function workspaceDirectory(owner: string, repo: string, branch: string): string {
  const root = getRepoStorageRoot()
  const safeBranch = branch.replace(/[^a-zA-Z0-9_.-]+/g, '-')
  const target = path.resolve(root, `${owner}__${repo}__${safeBranch}`)
  assertInside(root, target)
  return target
}

export function assertInside(baseDir: string, targetPath: string): void {
  const base = path.resolve(baseDir)
  const target = path.resolve(targetPath)
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error('Path traversal blocked')
  }
}

export function resolveRepoPath(localPath: string, relativePath = ''): string {
  if (path.isAbsolute(relativePath) || relativePath.includes('\0')) throw new Error('Invalid path')
  const normalized = relativePath.replace(/\\/g, '/')
  if (normalized.split('/').some((part) => part === '..')) throw new Error('Path traversal blocked')
  const resolved = path.resolve(localPath, normalized)
  assertInside(localPath, resolved)
  return resolved
}

export function isSecretPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return SECRET_FILE_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function isBinaryPath(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return BINARY_EXTENSIONS.has(ext)
}

export async function getGitHubToken(): Promise<string | null> {
  try {
    const config = await prisma.gitHubConfig.findFirst({ orderBy: { id: 'desc' } })
    return config?.accessToken?.trim() || null
  } catch {
    return null
  }
}

async function runGit(cwd: string, args: string[], timeoutMs = 120_000, token?: string) {
  const safeArgs = token ? ['-c', `http.extraHeader=Authorization: Bearer ${token}`, ...args] : args
  try {
    const result = await execFileAsync('git', safeArgs, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
    })
    return {
      ok: true,
      stdout: scrubSecrets(result.stdout ?? ''),
      stderr: scrubSecrets(result.stderr ?? ''),
    }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string }
    return {
      ok: false,
      stdout: scrubSecrets(err.stdout ?? ''),
      stderr: scrubSecrets(err.stderr ?? err.message ?? 'git command failed'),
    }
  }
}

export function scrubSecrets(text: string): string {
  return text
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, '[redacted-github-token]')
    .replace(/(api[_-]?key|token|secret|password)=([^\s]+)/gi, '$1=[redacted]')
}

export async function importRepo(repoUrl: string, branchInput = 'main') {
  const storage = await verifyStorage()
  if (!storage.configured || !storage.writable) {
    throw new Error(`Repo storage is not ready: ${storage.error ?? storage.note}`)
  }

  const { owner, repo, remoteUrl } = parseGitHubRepoUrl(repoUrl)
  const branch = sanitizeBranchName(branchInput)
  const localPath = workspaceDirectory(owner, repo, branch)
  await fs.mkdir(path.dirname(localPath), { recursive: true })

  const token = await getGitHubToken()
  const gitDir = path.join(localPath, '.git')
  const exists = await pathExists(gitDir)
  let gitResult
  if (exists) {
    gitResult = await runGit(localPath, ['fetch', 'origin', branch, '--prune'], 180_000, token ?? undefined)
    if (gitResult.ok) {
      gitResult = await runGit(localPath, ['checkout', branch], 60_000, token ?? undefined)
    }
    if (gitResult.ok) {
      gitResult = await runGit(localPath, ['pull', '--ff-only', 'origin', branch], 180_000, token ?? undefined)
    }
  } else {
    gitResult = await runGit(path.dirname(localPath), ['clone', '--branch', branch, '--single-branch', remoteUrl, localPath], 240_000)
    if (!gitResult.ok && token) {
      gitResult = await runGit(path.dirname(localPath), ['clone', '--branch', branch, '--single-branch', remoteUrl, localPath], 240_000, token)
    }
  }

  if (!gitResult.ok) {
    throw new Error(`Git import failed: ${gitResult.stderr || gitResult.stdout}`)
  }

  const commit = await runGit(localPath, ['rev-parse', 'HEAD'], 30_000)
  const currentCommit = commit.ok ? commit.stdout.trim() : ''

  const workspace = await prisma.repoWorkspace.upsert({
    where: { owner_repo_branch: { owner, repo, branch } },
    update: {
      provider: 'github',
      remoteUrl,
      localPath,
      currentCommit,
      status: 'ready',
      lastSyncedAt: new Date(),
    },
    create: {
      provider: 'github',
      owner,
      repo,
      branch,
      remoteUrl,
      localPath,
      currentCommit,
      status: 'ready',
      lastSyncedAt: new Date(),
    },
  })

  return workspace
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

export async function getWorkspace(workspaceId: string) {
  const workspace = await prisma.repoWorkspace.findUnique({ where: { id: workspaceId } })
  if (!workspace) throw new Error('Repo workspace not found')
  assertInside(getRepoStorageRoot(), workspace.localPath)
  return workspace
}

export async function listRepoTree(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId)
  const entries: Array<{ path: string; type: 'file' | 'dir'; size: number }> = []

  async function walk(dir: string, prefix: string): Promise<void> {
    if (entries.length >= MAX_TREE_ENTRIES) return
    const children = await fs.readdir(dir, { withFileTypes: true })
    for (const child of children) {
      if (REPO_EXCLUDES.has(child.name)) continue
      const rel = prefix ? `${prefix}/${child.name}` : child.name
      if (isSecretPath(rel)) continue
      const full = resolveRepoPath(workspace.localPath, rel)
      if (child.isDirectory()) {
        entries.push({ path: rel, type: 'dir', size: 0 })
        await walk(full, rel)
      } else if (child.isFile() && !isBinaryPath(rel)) {
        const stat = await fs.stat(full)
        if (stat.size <= MAX_TEXT_FILE_BYTES) entries.push({ path: rel, type: 'file', size: stat.size })
      }
    }
  }

  await walk(workspace.localPath, '')
  return { workspace, entries, truncated: entries.length >= MAX_TREE_ENTRIES }
}

export async function readRepoFile(workspaceId: string, filePath: string) {
  const workspace = await getWorkspace(workspaceId)
  if (isSecretPath(filePath)) throw new Error('Secret/env files are not viewable in Repo Workbench')
  if (isBinaryPath(filePath)) throw new Error('Binary files cannot be opened in Repo Workbench')
  const full = resolveRepoPath(workspace.localPath, filePath)
  const stat = await fs.stat(full)
  if (!stat.isFile()) throw new Error('Path is not a file')
  if (stat.size > MAX_TEXT_FILE_BYTES) throw new Error('File is too large to display')
  const buf = await fs.readFile(full)
  if (buf.includes(0)) throw new Error('Binary file rejected')
  return { workspace, path: filePath, content: scrubSecrets(buf.toString('utf8')), size: stat.size }
}

export async function getRepoModelChoices() {
  const genx = await listGenXModels().catch(() => [])
  const genxChoices: RepoModelChoice[] = genx
    .filter((m) => m.capabilities.includes('code') || m.capabilities.includes('code_generation') || m.capabilities.includes('reasoning'))
    .map((m) => ({
      id: m.id,
      label: m.name || m.id,
      provider: m.provider ?? 'genx',
      source: 'genx',
      capabilityTags: m.capabilities,
      costTier: m.costTier,
      contextWindow: m.contextWindow,
      bestFor: bestForModel(m.id, m.costTier),
      available: true,
    }))

  const registryChoices: RepoModelChoice[] = MODEL_REGISTRY
    .filter((m) => m.enabled && (m.supports_code || m.supports_reasoning || m.primary_role === 'coding'))
    .map((m) => ({
      id: m.model_id,
      label: m.model_name,
      provider: m.provider,
      source: 'internal_registry',
      capabilityTags: [
        ...(m.supports_code ? ['code_generation'] : []),
        ...(m.supports_reasoning ? ['reasoning'] : []),
        ...(m.supports_tool_use ? ['tool_use'] : []),
      ],
      costTier: m.cost_tier,
      contextWindow: m.context_window,
      bestFor: bestForModel(m.model_id, m.cost_tier),
      available: m.health_status === 'healthy' || m.health_status === 'configured',
    }))

  const byId = new Map<string, RepoModelChoice>()
  for (const choice of [...genxChoices, ...registryChoices]) {
    if (!byId.has(choice.id)) byId.set(choice.id, choice)
  }
  const all = [...byId.values()].sort((a, b) => Number(b.available) - Number(a.available) || b.contextWindow - a.contextWindow)
  const fast = all.filter((m) => ['free', 'very_low', 'low'].includes(m.costTier) || /mini|nano|flash|lite|groq|qwen/i.test(m.id)).slice(0, 10)
  const balanced = all.filter((m) => ['low', 'medium'].includes(m.costTier) || /sonnet|gemini|gpt-5|grok/i.test(m.id)).slice(0, 10)
  const premium = all.filter((m) => ['high', 'premium'].includes(m.costTier) || /codex|opus|gpt-5\.4|gpt-5\.5|reasoning|multi-agent/i.test(m.id)).slice(0, 10)
  const recommended = [
    premium.find((m) => /codex|gpt|sonnet|opus|grok/i.test(m.id)) ?? premium[0],
    balanced[0],
    fast[0],
  ].filter((m): m is RepoModelChoice => !!m)

  return { recommended, fast, balanced, premium, all }
}

function bestForModel(modelId: string, costTier: string): string {
  if (/codex|opus|5\.5|5\.4|reasoning|multi-agent/i.test(modelId)) return 'Deep repo audits, large patches, complex debugging'
  if (/mini|nano|flash|lite|groq/i.test(modelId) || ['free', 'very_low', 'low'].includes(costTier)) return 'Fast audits, summaries, small changes'
  return 'Balanced planning, patch generation, and code review'
}

export function modelTierFor(modelId?: string): 'manual' | 'fast' | 'balanced' | 'premium' | 'recommended' {
  if (!modelId) return 'recommended'
  if (/nano|mini|flash|lite|groq|qwen/i.test(modelId)) return 'fast'
  if (/codex|opus|5\.5|5\.4|reasoning|multi-agent/i.test(modelId)) return 'premium'
  return 'balanced'
}

export async function summarizeRepo(workspaceId: string, depth: 'quick' | 'standard' | 'deep' = 'standard') {
  const { workspace, entries } = await listRepoTree(workspaceId)
  const important = entries
    .filter((e) => e.type === 'file')
    .filter((e) => /(^package\.json$|prisma\/schema\.prisma|next\.config|vite\.config|Dockerfile|docker-compose|README|\.github\/workflows|src\/app\/api|src\/pages\/api|src\/app\/admin|src\/components|\.env\.example)/i.test(e.path))
    .slice(0, depth === 'deep' ? 80 : depth === 'standard' ? 45 : 20)

  const files = []
  for (const entry of important) {
    try {
      const file = await readRepoFile(workspaceId, entry.path)
      files.push({ path: file.path, content: file.content.slice(0, depth === 'deep' ? 16000 : 8000) })
    } catch {
      // skip unreadable files
    }
  }

  return { workspace, tree: entries.slice(0, 300), files }
}

async function saveRepoArtifact(input: {
  workspaceId: string
  taskId?: string
  patchId?: string
  type: 'report' | 'code'
  subType: string
  title: string
  description: string
  content: string
  provider?: string
  model?: string
  traceId?: string
}) {
  return createArtifact({
    appSlug: 'repo-workbench',
    type: input.type,
    subType: input.subType,
    title: input.title,
    description: input.description,
    provider: input.provider ?? 'amarktai-coding-agent',
    model: input.model ?? '',
    traceId: input.traceId ?? '',
    mimeType: input.type === 'code' ? 'text/x-diff' : 'application/json',
    content: Buffer.from(input.content, 'utf8'),
    metadata: {
      repoWorkspaceId: input.workspaceId,
      repoTaskId: input.taskId ?? null,
      repoPatchId: input.patchId ?? null,
    },
  })
}

export async function runRepoAiTask(input: {
  workspaceId: string
  agentMode: AgentMode
  request: string
  kind: 'audit' | 'plan' | 'patch'
  depth?: 'quick' | 'standard' | 'deep'
  scope?: string
  modelId?: string
  taskId?: string
  files?: string[]
}) {
  const agent = AGENT_MODES[input.agentMode] ?? AGENT_MODES.repo_auditor
  const summary = await summarizeRepo(input.workspaceId, input.depth ?? 'standard')
  const selectedFiles = input.files?.length
    ? await Promise.all(input.files.slice(0, 12).map(async (filePath) => readRepoFile(input.workspaceId, filePath).catch(() => null)))
    : []
  const fileContexts = [
    ...summary.files,
    ...selectedFiles.filter((f): f is NonNullable<typeof f> => !!f).map((f) => ({ path: f.path, content: f.content })),
  ]

  const systemPrompt = `You are Amarktai Coding Agent in ${agent.label} mode.
${agent.prompt}

Rules:
- Do not invent successful commands, commits, pushes, or PRs.
- Do not expose secrets or .env values.
- Output valid JSON only.
- For patch tasks, output a unified diff in "diffText" and do not claim it was applied.
- Include selectedModel, capability, fallbackUsed, fallbackReason, verificationCommands, riskNotes, and affectedFiles.`

  const task = JSON.stringify({
    repo: `${summary.workspace.owner}/${summary.workspace.repo}`,
    branch: summary.workspace.branch,
    currentCommit: summary.workspace.currentCommit,
    kind: input.kind,
    scope: input.scope ?? 'auto',
    userRequest: input.request,
    tree: summary.tree,
    requiredOutput: input.kind === 'patch'
      ? '{ "summary": string, "diffText": string, "affectedFiles": string[], "riskNotes": string[], "verificationCommands": string[] }'
      : '{ "summary": string, "findings": array, "goLiveBlockers": array, "affectedFiles": string[], "riskNotes": string[], "verificationCommands": string[], "nextActions": array }',
  }, null, 2)

  const result = await routeWorkspaceTask({
    task,
    systemPrompt,
    fileContexts,
    capability: agent.capability,
    operationType: input.kind === 'plan' ? 'plan' : 'code',
    policyOverride: input.modelId ? 'fixed' : 'best',
    fixedModelOverride: input.modelId,
    maxTokens: input.kind === 'patch' ? 12000 : 8000,
  })

  if (!result.success || !result.output) {
    throw new Error(result.error ?? 'Coding agent did not return output')
  }

  const parsed = parseJsonOutput(result.output)
  return {
    result,
    parsed,
    selectedModelTier: modelTierFor(input.modelId),
  }
}

export function parseJsonOutput(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    return { summary: cleaned.slice(0, 4000), rawOutput: cleaned }
  }
}

export async function createAuditTask(workspaceId: string, agentMode: AgentMode, modelId: string | undefined, depth: 'quick' | 'standard' | 'deep') {
  const workspace = await getWorkspace(workspaceId)
  const task = await prisma.repoTask.create({
    data: {
      repoWorkspaceId: workspace.id,
      title: `${AGENT_MODES[agentMode]?.label ?? 'Repo Auditor'} audit`,
      userRequest: `Audit repo with ${depth} depth`,
      agentMode,
      selectedModel: modelId ?? '',
      selectedModelTier: modelTierFor(modelId),
      status: 'running',
    },
  })
  const ai = await runRepoAiTask({ workspaceId, agentMode, request: `Run a ${depth} repo audit`, kind: 'audit', depth, modelId, taskId: task.id })
  const artifact = await saveRepoArtifact({
    workspaceId,
    taskId: task.id,
    type: 'report',
    subType: 'repo_audit',
    title: `Repo audit: ${workspace.owner}/${workspace.repo}`,
    description: String(ai.parsed.summary ?? 'Repo audit report'),
    content: JSON.stringify(ai.parsed, null, 2),
    model: ai.result.resolvedModel,
    traceId: ai.result.traceId,
  })
  const updated = await prisma.repoTask.update({
    where: { id: task.id },
    data: {
      status: 'completed',
      planJson: JSON.stringify(ai.parsed),
      changedFilesJson: JSON.stringify(ai.parsed.affectedFiles ?? []),
      artifactIdsJson: JSON.stringify([artifact.id]),
    },
  })
  return { task: updated, artifact, audit: ai.parsed, execution: ai.result }
}

export async function createPlanTask(input: {
  workspaceId: string
  request: string
  scope: string
  agentMode: AgentMode
  modelId?: string
}) {
  const workspace = await getWorkspace(input.workspaceId)
  const task = await prisma.repoTask.create({
    data: {
      repoWorkspaceId: workspace.id,
      title: `${AGENT_MODES[input.agentMode]?.label ?? 'Coding Agent'} plan`,
      userRequest: input.request,
      agentMode: input.agentMode,
      selectedModel: input.modelId ?? '',
      selectedModelTier: modelTierFor(input.modelId),
      status: 'running',
    },
  })
  const ai = await runRepoAiTask({ ...input, kind: 'plan', taskId: task.id })
  const artifact = await saveRepoArtifact({
    workspaceId: input.workspaceId,
    taskId: task.id,
    type: 'report',
    subType: 'implementation_plan',
    title: `Implementation plan: ${workspace.owner}/${workspace.repo}`,
    description: String(ai.parsed.summary ?? input.request),
    content: JSON.stringify(ai.parsed, null, 2),
    model: ai.result.resolvedModel,
    traceId: ai.result.traceId,
  })
  const updated = await prisma.repoTask.update({
    where: { id: task.id },
    data: {
      status: 'completed',
      planJson: JSON.stringify(ai.parsed),
      changedFilesJson: JSON.stringify(ai.parsed.affectedFiles ?? []),
      artifactIdsJson: JSON.stringify([artifact.id]),
    },
  })
  return { task: updated, artifact, plan: ai.parsed, execution: ai.result }
}

export async function createPatchProposal(input: {
  workspaceId: string
  taskId?: string
  request: string
  files: string[]
  agentMode: AgentMode
  modelId?: string
}) {
  const workspace = await getWorkspace(input.workspaceId)
  const ai = await runRepoAiTask({ ...input, kind: 'patch', depth: 'standard' })
  const diffText = String(ai.parsed.diffText ?? ai.parsed.diff ?? '')
  if (!diffText.trim()) throw new Error('Coding agent did not produce a patch diff')
  const patch = await prisma.repoPatch.create({
    data: {
      repoWorkspaceId: workspace.id,
      repoTaskId: input.taskId || null,
      title: String(ai.parsed.summary ?? input.request).slice(0, 180),
      diffText,
      status: 'proposed',
      branchName: '',
    },
  })
  const artifact = await saveRepoArtifact({
    workspaceId: input.workspaceId,
    taskId: input.taskId,
    patchId: patch.id,
    type: 'code',
    subType: 'patch_diff',
    title: `Patch proposal: ${workspace.owner}/${workspace.repo}`,
    description: patch.title,
    content: diffText,
    model: ai.result.resolvedModel,
    traceId: ai.result.traceId,
  })
  const updated = await prisma.repoPatch.update({ where: { id: patch.id }, data: { artifactId: artifact.id } })
  return { patch: updated, artifact, proposal: ai.parsed, execution: ai.result }
}

export async function applyPatch(workspaceId: string, patchId: string) {
  const workspace = await getWorkspace(workspaceId)
  const patch = await prisma.repoPatch.findFirst({ where: { id: patchId, repoWorkspaceId: workspaceId } })
  if (!patch) throw new Error('Patch not found')
  if (patch.diffText.includes('\n--- a/.env') || patch.diffText.includes('\n+++ b/.env')) {
    throw new Error('Patches touching .env files require a separate explicit secrets workflow')
  }
  // execFile does not pipe stdin here; write the proposed diff to a storage log
  // file first, then pass the file path to git apply.
  const patchFile = path.resolve(getStorageStatus().basePath, 'logs', `repo-patch-${patch.id}.diff`)
  assertInside(path.resolve(getStorageStatus().basePath, 'logs'), patchFile)
  await fs.mkdir(path.dirname(patchFile), { recursive: true })
  await fs.writeFile(patchFile, patch.diffText, 'utf8')
  const verify = await runGit(workspace.localPath, ['apply', '--check', '--whitespace=fix', patchFile], 60_000)
  if (!verify.ok) {
    await prisma.repoPatch.update({ where: { id: patch.id }, data: { status: 'failed' } })
    throw new Error(`Patch check failed: ${verify.stderr || verify.stdout}`)
  }
  const applied = await runGit(workspace.localPath, ['apply', '--whitespace=fix', patchFile], 60_000)
  if (!applied.ok) {
    await prisma.repoPatch.update({ where: { id: patch.id }, data: { status: 'failed' } })
    throw new Error(`Patch apply failed: ${applied.stderr || applied.stdout}`)
  }
  const changed = await runGit(workspace.localPath, ['diff', '--name-only'], 30_000)
  const changedFiles = changed.stdout.split(/\r?\n/).filter(Boolean)
  const artifact = await saveRepoArtifact({
    workspaceId,
    patchId: patch.id,
    type: 'report',
    subType: 'patch_apply_log',
    title: `Patch applied: ${workspace.owner}/${workspace.repo}`,
    description: `${changedFiles.length} file(s) changed`,
    content: JSON.stringify({ patchId, changedFiles, appliedAt: new Date().toISOString() }, null, 2),
  })
  const updated = await prisma.repoPatch.update({ where: { id: patch.id }, data: { status: 'applied' } })
  return { patch: updated, changedFiles, artifact }
}

export const ALLOWED_CHECKS = {
  test: ['npm', ['test']],
  lint: ['npm', ['run', 'lint']],
  build: ['npm', ['run', 'build']],
  audit: ['npm', ['audit', '--audit-level=moderate']],
} as const

export async function runAllowedCheck(workspaceId: string, command: keyof typeof ALLOWED_CHECKS, taskId?: string) {
  const workspace = await getWorkspace(workspaceId)
  const spec = ALLOWED_CHECKS[command]
  if (!spec) throw new Error('Command is not allowed')
  const startedAt = Date.now()
  let output = ''
  let ok = false
  try {
    const result = await execFileAsync(spec[0], spec[1], {
      cwd: workspace.localPath,
      timeout: 180_000,
      maxBuffer: 1024 * 1024 * 12,
      windowsHide: true,
    })
    ok = true
    output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string }
    output = `${err.stdout ?? ''}\n${err.stderr ?? err.message ?? ''}`
  }
  output = scrubSecrets(output)
  const artifact = await saveRepoArtifact({
    workspaceId,
    taskId,
    type: 'report',
    subType: `${command}_output`,
    title: `Repo ${command}: ${workspace.owner}/${workspace.repo}`,
    description: ok ? `${command} completed` : `${command} failed`,
    content: JSON.stringify({ command, ok, durationMs: Date.now() - startedAt, output }, null, 2),
  })
  if (taskId) {
    await prisma.repoTask.update({
      where: { id: taskId },
      data: command === 'test'
        ? { testStatus: ok ? 'passed' : 'failed' }
        : command === 'build'
          ? { buildStatus: ok ? 'passed' : 'failed' }
          : {},
    }).catch(() => null)
  }
  return { ok, output, artifact, durationMs: Date.now() - startedAt }
}

export async function commitPatch(workspaceId: string, patchId: string, message: string, branchName?: string) {
  const workspace = await getWorkspace(workspaceId)
  const patch = await prisma.repoPatch.findFirst({ where: { id: patchId, repoWorkspaceId: workspaceId } })
  if (!patch) throw new Error('Patch not found')
  const branch = sanitizeLocalBranch(branchName || `repo-workbench/${patch.id.slice(0, 8)}`)
  const checkout = await runGit(workspace.localPath, ['checkout', '-B', branch], 60_000)
  if (!checkout.ok) throw new Error(`Branch creation failed: ${checkout.stderr}`)
  const add = await runGit(workspace.localPath, ['add', '--all'], 60_000)
  if (!add.ok) throw new Error(`git add failed: ${add.stderr}`)
  const diff = await runGit(workspace.localPath, ['diff', '--cached', '--name-only'], 30_000)
  const files = diff.stdout.split(/\r?\n/).filter(Boolean)
  if (files.length === 0) throw new Error('No changes staged for commit')
  const commit = await runGit(workspace.localPath, ['commit', '-m', message.slice(0, 200)], 120_000)
  if (!commit.ok) throw new Error(`git commit failed: ${commit.stderr || commit.stdout}`)
  const sha = await runGit(workspace.localPath, ['rev-parse', 'HEAD'], 30_000)
  const commitSha = sha.stdout.trim()
  const artifact = await saveRepoArtifact({
    workspaceId,
    patchId,
    type: 'report',
    subType: 'commit_report',
    title: `Commit: ${workspace.owner}/${workspace.repo}`,
    description: message,
    content: JSON.stringify({ branch, commitSha, files, message }, null, 2),
  })
  const updated = await prisma.repoPatch.update({
    where: { id: patch.id },
    data: { status: 'committed', branchName: branch, commitSha: commitSha || null },
  })
  return { patch: updated, branch, commitSha, files, artifact }
}

export async function pushWorkspaceBranch(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId)
  const token = await getGitHubToken()
  if (!token) throw new Error('GitHub token required for push')
  const branch = (await runGit(workspace.localPath, ['branch', '--show-current'], 30_000)).stdout.trim()
  if (!branch) throw new Error('No current branch to push')
  const push = await runGit(workspace.localPath, ['push', '-u', 'origin', branch], 180_000, token)
  if (!push.ok) throw new Error(`git push failed: ${push.stderr || push.stdout}`)
  const artifact = await saveRepoArtifact({
    workspaceId,
    type: 'report',
    subType: 'push_report',
    title: `Push: ${workspace.owner}/${workspace.repo}`,
    description: branch,
    content: JSON.stringify({ branch, remoteBranchUrl: `https://github.com/${workspace.owner}/${workspace.repo}/tree/${encodeURIComponent(branch)}`, pushedAt: new Date().toISOString() }, null, 2),
  })
  await prisma.repoPatch.updateMany({ where: { repoWorkspaceId: workspaceId, branchName: branch }, data: { status: 'pushed' } })
  return { branch, remoteBranchUrl: `https://github.com/${workspace.owner}/${workspace.repo}/tree/${encodeURIComponent(branch)}`, artifact }
}

export async function createWorkspacePr(workspaceId: string, title: string, body: string) {
  const workspace = await getWorkspace(workspaceId)
  const token = await getGitHubToken()
  if (!token) throw new Error('GitHub token required for PR creation')
  const branch = (await runGit(workspace.localPath, ['branch', '--show-current'], 30_000)).stdout.trim()
  if (!branch) throw new Error('No current branch for PR')
  const res = await fetch(`https://api.github.com/repos/${workspace.owner}/${workspace.repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, head: branch, base: workspace.branch, draft: true }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`GitHub PR creation failed: ${data?.message ?? res.status}`)
  const prUrl = String(data.html_url ?? '')
  const artifact = await saveRepoArtifact({
    workspaceId,
    type: 'report',
    subType: 'pr_report',
    title: `Pull request: ${workspace.owner}/${workspace.repo}`,
    description: title,
    content: JSON.stringify({ title, branch, base: workspace.branch, prUrl, createdAt: new Date().toISOString() }, null, 2),
  })
  await prisma.repoPatch.updateMany({ where: { repoWorkspaceId: workspaceId, branchName: branch }, data: { status: 'pr_created', prUrl } })
  return { prUrl, branch, artifact }
}
