/**
 * GitHub Integration — AmarktAI Network
 *
 * Admin-only GitHub integration for the Developer Workspace.
 * Allows admins to:
 *  - Store a GitHub personal access token securely
 *  - Link playground projects to GitHub repos
 *  - Create branches, commit files, and push to GitHub
 *  - Track all push actions in an audit log
 *
 * Auth uses a stored Personal Access Token (PAT), NOT OAuth.
 * This is intentional for a single-admin system.
 *
 * Server-side only.
 */

import { prisma } from '@/lib/prisma'

// ── Input Validation ──────────────────────────────────────────────────────────

/**
 * Validate a GitHub repo "owner/repo" identifier.
 * Only allows alphanumeric characters, hyphens, underscores, periods, and
 * exactly one forward slash separating owner from repo name.
 * Throws an error if the value is invalid.
 */
function assertValidRepoFullName(value: string): void {
  // owner/repo — each segment: letters, digits, -, _, .
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value)) {
    throw new Error(`Invalid repo identifier: "${value}". Expected format: owner/repo`)
  }
}

/**
 * Validate a branch name.
 * Allows alphanumeric chars, /, -, _, . but rejects .. and leading/trailing slashes.
 */
function assertValidBranch(value: string): void {
  if (!value || value.includes('..') || value.startsWith('/') || value.endsWith('/')) {
    throw new Error(`Invalid branch name: "${value}"`)
  }
  if (!/^[a-zA-Z0-9/_\-.*@{}#]+$/.test(value)) {
    throw new Error(`Branch name contains invalid characters: "${value}"`)
  }
}

/**
 * Validate a file path used in GitHub Contents API calls.
 * Rejects directory traversal sequences and absolute-path indicators.
 */
function assertValidFilePath(value: string): void {
  if (!value) throw new Error('File path must not be empty')
  if (value.includes('..')) throw new Error(`Path traversal sequences are not allowed in file path: "${value}"`)
  if (value.startsWith('/')) throw new Error(`File path must be relative (no leading slash): "${value}"`)
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface GitHubConfigData {
  id: number
  username: string
  accessTokenMasked: string   // only last 4 chars shown
  defaultOwner: string
  configured: boolean
  lastValidatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface GitHubRepo {
  full_name: string
  name: string
  private: boolean
  html_url: string
  default_branch: string
  description: string | null
}

export interface GitHubPushInput {
  projectId: number
  repoFullName: string         // e.g. "owner/repo"
  branch: string               // e.g. "amarktai/playground-export"
  commitMessage: string
  files: Array<{
    path: string               // path in repo, e.g. "projects/my-project/prompt.md"
    content: string            // UTF-8 text content
  }>
}

export interface GitHubPushResult {
  success: boolean
  commitSha: string | null
  commitUrl: string | null
  branch: string
  filesChanged: number
  error: string | null
  pushedAt: string
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  try {
    const config = await prisma.gitHubConfig.findFirst({
      orderBy: { id: 'desc' },
    })
    return config?.accessToken ?? null
  } catch {
    return null
  }
}

async function githubFetch(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = `https://api.github.com${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })

  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  return { ok: res.ok, status: res.status, body }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getGitHubConfig(): Promise<GitHubConfigData | null> {
  try {
    const row = await prisma.gitHubConfig.findFirst({
      orderBy: { id: 'desc' },
    })
    if (!row) return null

    return {
      id: row.id,
      username: row.username,
      accessTokenMasked: row.accessToken
        ? `••••••••••••${row.accessToken.slice(-4)}`
        : '(not set)',
      defaultOwner: row.defaultOwner,
      configured: !!row.accessToken,
      lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  } catch {
    return null
  }
}

export async function saveGitHubConfig(input: {
  username: string
  accessToken: string
  defaultOwner: string
}): Promise<GitHubConfigData> {
  // Upsert: one global GitHub config for the admin
  const existing = await prisma.gitHubConfig.findFirst({ orderBy: { id: 'desc' } })

  const row = existing
    ? await prisma.gitHubConfig.update({
        where: { id: existing.id },
        data: { ...input, updatedAt: new Date() },
      })
    : await prisma.gitHubConfig.create({ data: input })

  return {
    id: row.id,
    username: row.username,
    accessTokenMasked: `••••••••••••${row.accessToken.slice(-4)}`,
    defaultOwner: row.defaultOwner,
    configured: true,
    lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Validate the stored GitHub token by calling /user.
 * Returns the authenticated username on success, or null on failure.
 */
export async function validateGitHubToken(): Promise<{
  valid: boolean
  username: string | null
  error: string | null
}> {
  const token = await getAccessToken()
  if (!token) return { valid: false, username: null, error: 'No token configured' }

  try {
    const { ok, body } = await githubFetch('/user', token)
    if (!ok) return { valid: false, username: null, error: 'Token invalid or expired' }

    const user = body as { login: string }

    // Update lastValidatedAt
    await prisma.gitHubConfig.updateMany({
      data: { lastValidatedAt: new Date(), username: user.login },
    })

    return { valid: true, username: user.login, error: null }
  } catch (e) {
    return { valid: false, username: null, error: String(e) }
  }
}

/**
 * List repos accessible with the configured token.
 */
export async function listGitHubRepos(page = 1): Promise<{
  repos: GitHubRepo[]
  error: string | null
}> {
  const token = await getAccessToken()
  if (!token) return { repos: [], error: 'GitHub not configured' }

  try {
    const { ok, body } = await githubFetch(
      `/user/repos?per_page=50&page=${page}&sort=updated`,
      token,
    )
    if (!ok) return { repos: [], error: 'Failed to list repos' }
    return { repos: body as GitHubRepo[], error: null }
  } catch (e) {
    return { repos: [], error: String(e) }
  }
}

/**
 * Push playground project files to a GitHub repo.
 *
 * Flow:
 *  1. Get current HEAD SHA for the base branch
 *  2. Create a new branch (or use existing)
 *  3. Create a tree with all file blobs
 *  4. Create a commit pointing to the new tree
 *  5. Update the branch reference
 */
export async function pushProjectToGitHub(
  input: GitHubPushInput,
): Promise<GitHubPushResult> {
  const token = await getAccessToken()
  const pushedAt = new Date().toISOString()

  if (!token) {
    return { success: false, commitSha: null, commitUrl: null, branch: input.branch, filesChanged: 0, error: 'GitHub token not configured', pushedAt }
  }

  const [owner, repo] = input.repoFullName.split('/')
  if (!owner || !repo) {
    return { success: false, commitSha: null, commitUrl: null, branch: input.branch, filesChanged: 0, error: 'Invalid repo format (expected owner/repo)', pushedAt }
  }

  try {
    // 1. Get default branch HEAD SHA
    const repoInfo = await githubFetch(`/repos/${owner}/${repo}`, token)
    if (!repoInfo.ok) {
      return { success: false, commitSha: null, commitUrl: null, branch: input.branch, filesChanged: 0, error: 'Could not access repo', pushedAt }
    }
    const defaultBranch = (repoInfo.body as { default_branch: string }).default_branch

    const defaultRefRes = await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, token)
    if (!defaultRefRes.ok) {
      return { success: false, commitSha: null, commitUrl: null, branch: input.branch, filesChanged: 0, error: 'Could not get default branch ref', pushedAt }
    }
    const defaultBaseSha = ((defaultRefRes.body as { object: { sha: string } }).object).sha

    // Use target branch as base when it already exists, otherwise base from default branch.
    const existingBranch = await githubFetch(
      `/repos/${owner}/${repo}/git/refs/heads/${input.branch}`,
      token,
    )
    const baseSha = existingBranch.ok
      ? ((existingBranch.body as { object: { sha: string } }).object).sha
      : defaultBaseSha

    const commitResInfo = await githubFetch(`/repos/${owner}/${repo}/git/commits/${baseSha}`, token)
    if (!commitResInfo.ok) {
      return { success: false, commitSha: null, commitUrl: null, branch: input.branch, filesChanged: 0, error: 'Could not resolve base commit', pushedAt }
    }
    const baseTreeSha = (commitResInfo.body as { tree: { sha: string } }).tree.sha

    // 2. Create blobs for each file
    const treeItems = await Promise.all(input.files.map(async (f) => {
      const blobRes = await githubFetch(`/repos/${owner}/${repo}/git/blobs`, token, {
        method: 'POST',
        body: JSON.stringify({ content: f.content, encoding: 'utf-8' }),
      })
      const blobSha = (blobRes.body as { sha: string }).sha
      return {
        path: f.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blobSha,
      }
    }))

    // 3. Create tree
    const treeRes = await githubFetch(`/repos/${owner}/${repo}/git/trees`, token, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    })
    if (!treeRes.ok) {
      return { success: false, commitSha: null, commitUrl: null, branch: input.branch, filesChanged: 0, error: 'Failed to create git tree', pushedAt }
    }
    const treeSha = (treeRes.body as { sha: string }).sha

    // 4. Create commit
    const commitRes = await githubFetch(`/repos/${owner}/${repo}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify({
        message: input.commitMessage,
        tree: treeSha,
        parents: [baseSha],
      }),
    })
    if (!commitRes.ok) {
      return { success: false, commitSha: null, commitUrl: null, branch: input.branch, filesChanged: 0, error: 'Failed to create commit', pushedAt }
    }
    const commitSha = (commitRes.body as { sha: string }).sha

    // 5. Create or update the target branch
    const branchRef = `refs/heads/${input.branch}`
    if (existingBranch.ok) {
      const updateRef = await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${input.branch}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commitSha, force: false }),
      })
      if (!updateRef.ok) {
        return {
          success: false,
          commitSha: null,
          commitUrl: null,
          branch: input.branch,
          filesChanged: 0,
          error: 'Failed to update target branch ref',
          pushedAt,
        }
      }
    } else {
      const createRef = await githubFetch(`/repos/${owner}/${repo}/git/refs`, token, {
        method: 'POST',
        body: JSON.stringify({ ref: branchRef, sha: commitSha }),
      })
      if (!createRef.ok) {
        return {
          success: false,
          commitSha: null,
          commitUrl: null,
          branch: input.branch,
          filesChanged: 0,
          error: 'Failed to create target branch ref',
          pushedAt,
        }
      }
    }

    // Update project lastPushedAt
    try {
      await prisma.playgroundProject.update({
        where: { id: input.projectId },
        data: {
          githubRepo: input.repoFullName,
          githubBranch: input.branch,
          lastPushedAt: new Date(),
        },
      })
    } catch { /* project update failure is non-fatal */ }

    // Audit log
    try {
      await prisma.gitHubPushLog.create({
        data: {
          projectId: input.projectId,
          repoFullName: input.repoFullName,
          branch: input.branch,
          commitSha,
          commitMessage: input.commitMessage,
          filesChanged: input.files.length,
          success: true,
          error: null,
          pushedAt: new Date(),
        },
      })
    } catch { /* audit log failure is non-fatal */ }

    const commitUrl = `https://github.com/${owner}/${repo}/commit/${commitSha}`
    return { success: true, commitSha, commitUrl, branch: input.branch, filesChanged: input.files.length, error: null, pushedAt }
  } catch (e) {
    const errorMsg = String(e)

    // Log failure
    try {
      await prisma.gitHubPushLog.create({
        data: {
          projectId: input.projectId,
          repoFullName: input.repoFullName,
          branch: input.branch,
          commitSha: null,
          commitMessage: input.commitMessage,
          filesChanged: 0,
          success: false,
          error: errorMsg,
          pushedAt: new Date(),
        },
      })
    } catch { /* non-fatal */ }

    return { success: false, commitSha: null, commitUrl: null, branch: input.branch, filesChanged: 0, error: errorMsg, pushedAt }
  }
}

/**
 * Returns the last N push log entries for display in the dashboard.
 */
export async function getGitHubPushLog(limit = 20): Promise<{
  id: number
  projectId: number
  repoFullName: string
  branch: string
  commitSha: string | null
  commitUrl: string | null
  commitMessage: string
  filesChanged: number
  success: boolean
  error: string | null
  pushedAt: string
}[]> {
  try {
    const rows = await prisma.gitHubPushLog.findMany({
      orderBy: { pushedAt: 'desc' },
      take: limit,
    })
    return rows.map(r => ({
      id: r.id,
      projectId: r.projectId,
      repoFullName: r.repoFullName,
      branch: r.branch,
      commitSha: r.commitSha,
      commitUrl: r.commitSha
        ? `https://github.com/${r.repoFullName}/commit/${r.commitSha}`
        : null,
      commitMessage: r.commitMessage,
      filesChanged: r.filesChanged,
      success: r.success,
      error: r.error,
      pushedAt: r.pushedAt.toISOString(),
    }))
  } catch {
    return []
  }
}

// ── Branch Operations ────────────────────────────────────────────────────────

export interface GitHubBranch {
  name: string
  sha: string
  isDefault: boolean
}

/**
 * List all branches for a repo.
 */
export async function listBranches(repoFullName: string): Promise<{
  branches: GitHubBranch[]
  defaultBranch: string | null
  error: string | null
}> {
  const token = await getAccessToken()
  if (!token) return { branches: [], defaultBranch: null, error: 'GitHub not configured' }

  try {
    assertValidRepoFullName(repoFullName)
  } catch (e) {
    return { branches: [], defaultBranch: null, error: String(e) }
  }

  const [owner, repo] = repoFullName.split('/')

  try {
    // Get default branch from repo info
    const repoInfo = await githubFetch(`/repos/${owner}/${repo}`, token)
    const defaultBranch = repoInfo.ok
      ? (repoInfo.body as { default_branch?: string }).default_branch ?? null
      : null

    // Fetch branches
    const { ok, body } = await githubFetch(
      `/repos/${owner}/${repo}/branches?per_page=100`,
      token,
    )
    if (!ok) return { branches: [], defaultBranch, error: 'Failed to list branches' }

    const raw = body as Array<{ name: string; commit: { sha: string } }>
    const branches: GitHubBranch[] = raw.map((b) => ({
      name: b.name,
      sha: b.commit.sha,
      isDefault: b.name === defaultBranch,
    }))
    return { branches, defaultBranch, error: null }
  } catch (e) {
    return { branches: [], defaultBranch: null, error: String(e) }
  }
}

// ── File Tree ────────────────────────────────────────────────────────────────

export interface GitHubTreeEntry {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

/**
 * Fetch the file tree for a repo/branch.
 * Uses the Git Trees API (recursive) so the full tree is returned in one call.
 */
export async function getFileTree(
  repoFullName: string,
  branch: string,
  recursive = true,
): Promise<{ tree: GitHubTreeEntry[]; truncated: boolean; error: string | null }> {
  const token = await getAccessToken()
  if (!token) return { tree: [], truncated: false, error: 'GitHub not configured' }

  try {
    assertValidRepoFullName(repoFullName)
    assertValidBranch(branch)
  } catch (e) {
    return { tree: [], truncated: false, error: String(e) }
  }

  const [owner, repo] = repoFullName.split('/')

  try {
    // Resolve the branch to its tree SHA
    const refRes = await githubFetch(
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      token,
    )
    if (!refRes.ok) return { tree: [], truncated: false, error: `Branch "${branch}" not found` }
    const commitSha = (refRes.body as { object: { sha: string } }).object.sha

    const commitRes = await githubFetch(
      `/repos/${owner}/${repo}/git/commits/${commitSha}`,
      token,
    )
    if (!commitRes.ok) return { tree: [], truncated: false, error: 'Failed to resolve commit' }
    const treeSha = (commitRes.body as { tree: { sha: string } }).tree.sha

    const treeRes = await githubFetch(
      `/repos/${owner}/${repo}/git/trees/${treeSha}${recursive ? '?recursive=1' : ''}`,
      token,
    )
    if (!treeRes.ok) return { tree: [], truncated: false, error: 'Failed to fetch file tree' }

    const data = treeRes.body as {
      tree: Array<{ path?: string; type?: string; sha?: string; size?: number; url?: string }>
      truncated?: boolean
    }

    const tree: GitHubTreeEntry[] = (data.tree ?? [])
      .filter((e) => e.path && e.type && e.sha)
      .map((e) => ({
        path: e.path!,
        type: e.type as 'blob' | 'tree',
        sha: e.sha!,
        size: e.size,
        url: e.url ?? `https://github.com/${owner}/${repo}/blob/${branch}/${e.path}`,
      }))

    return { tree, truncated: data.truncated ?? false, error: null }
  } catch (e) {
    return { tree: [], truncated: false, error: String(e) }
  }
}

// ── File Content ─────────────────────────────────────────────────────────────

export interface GitHubFileContent {
  path: string
  content: string
  sha: string
  encoding: 'utf-8' | 'base64'
  size: number
}

/**
 * Fetch the decoded content of a single file in a repo.
 */
export async function getFileContent(
  repoFullName: string,
  branch: string,
  filePath: string,
): Promise<{ file: GitHubFileContent | null; error: string | null }> {
  const token = await getAccessToken()
  if (!token) return { file: null, error: 'GitHub not configured' }

  try {
    assertValidRepoFullName(repoFullName)
    assertValidBranch(branch)
    assertValidFilePath(filePath)
  } catch (e) {
    return { file: null, error: String(e) }
  }

  const [owner, repo] = repoFullName.split('/')

  try {
    const { ok, body } = await githubFetch(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`,
      token,
    )
    if (!ok) return { file: null, error: `File "${filePath}" not found on branch "${branch}"` }

    const raw = body as {
      path?: string
      content?: string
      sha?: string
      size?: number
      encoding?: string
    }

    if (!raw.content || !raw.sha) return { file: null, error: 'Unexpected response from GitHub contents API' }

    // GitHub returns content base64-encoded with newlines; decode to UTF-8
    const decoded = Buffer.from(raw.content.replace(/\n/g, ''), 'base64').toString('utf-8')

    return {
      file: {
        path: raw.path ?? filePath,
        content: decoded,
        sha: raw.sha,
        encoding: 'utf-8',
        size: raw.size ?? decoded.length,
      },
      error: null,
    }
  } catch (e) {
    return { file: null, error: String(e) }
  }
}

// ── Pull Request ─────────────────────────────────────────────────────────────

export interface GitHubPRInput {
  repoFullName: string
  head: string          // source branch
  base: string          // target branch (e.g. 'main')
  title: string
  body?: string
  draft?: boolean
}

export interface GitHubPRResult {
  success: boolean
  prNumber: number | null
  prUrl: string | null
  error: string | null
}

/**
 * Create a pull request in a GitHub repo.
 */
export async function createPullRequest(input: GitHubPRInput): Promise<GitHubPRResult> {
  const token = await getAccessToken()
  if (!token) return { success: false, prNumber: null, prUrl: null, error: 'GitHub not configured' }

  try {
    assertValidRepoFullName(input.repoFullName)
    assertValidBranch(input.head)
    assertValidBranch(input.base)
  } catch (e) {
    return { success: false, prNumber: null, prUrl: null, error: String(e) }
  }

  const [owner, repo] = input.repoFullName.split('/')

  try {
    const { ok, body } = await githubFetch(`/repos/${owner}/${repo}/pulls`, token, {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        head: input.head,
        base: input.base,
        body: input.body ?? '',
        draft: input.draft ?? false,
      }),
    })

    if (!ok) {
      const err = (body as { message?: string }).message ?? 'Failed to create pull request'
      return { success: false, prNumber: null, prUrl: null, error: err }
    }

    const pr = body as { number: number; html_url: string }
    return { success: true, prNumber: pr.number, prUrl: pr.html_url, error: null }
  } catch (e) {
    return { success: false, prNumber: null, prUrl: null, error: String(e) }
  }
}

// ── Deploy via GitHub Actions ────────────────────────────────────────────────

export interface GitHubDeployInput {
  repoFullName: string
  workflowId: string      // workflow file name, e.g. 'deploy.yml'
  branch?: string         // default: repo default branch
  inputs?: Record<string, string>  // workflow_dispatch inputs
}

export interface GitHubDeployResult {
  success: boolean
  runUrl: string | null
  error: string | null
  triggeredAt: string
}

/**
 * Trigger a GitHub Actions workflow via workflow_dispatch event.
 * This fires the deploy pipeline and returns immediately.
 * Callers can poll /api/admin/github/deploy/status for run results.
 */
export async function triggerDeploy(input: GitHubDeployInput): Promise<GitHubDeployResult> {
  const token = await getAccessToken()
  const triggeredAt = new Date().toISOString()

  if (!token) {
    return { success: false, runUrl: null, error: 'GitHub not configured', triggeredAt }
  }

  try {
    assertValidRepoFullName(input.repoFullName)
    if (input.branch) assertValidBranch(input.branch)
  } catch (e) {
    return { success: false, runUrl: null, error: String(e), triggeredAt }
  }

  const [owner, repo] = input.repoFullName.split('/')

  // Resolve the target branch (use repo default if not specified)
  let targetBranch = input.branch
  if (!targetBranch) {
    const repoInfo = await githubFetch(`/repos/${owner}/${repo}`, token)
    targetBranch = repoInfo.ok
      ? (repoInfo.body as { default_branch?: string }).default_branch ?? 'main'
      : 'main'
  }

  try {
    const { ok, status, body } = await githubFetch(
      `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(input.workflowId)}/dispatches`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          ref: targetBranch,
          inputs: input.inputs ?? {},
        }),
      },
    )

    if (!ok) {
      const msg = (body as { message?: string }).message
      return { success: false, runUrl: null, error: msg ?? `GitHub Actions dispatch failed (HTTP ${status})`, triggeredAt }
    }

    // workflow_dispatch returns 204 No Content on success
    const runListUrl = `https://github.com/${owner}/${repo}/actions`
    return { success: true, runUrl: runListUrl, error: null, triggeredAt }
  } catch (e) {
    return { success: false, runUrl: null, error: String(e), triggeredAt }
  }
}

/**
 * List recent workflow runs for a workflow file.
 */
export async function listWorkflowRuns(
  repoFullName: string,
  workflowId: string,
  limit = 10,
): Promise<{
  runs: Array<{
    id: number
    status: string
    conclusion: string | null
    headBranch: string
    runNumber: number
    htmlUrl: string
    createdAt: string
    updatedAt: string
  }>
  error: string | null
}> {
  const token = await getAccessToken()
  if (!token) return { runs: [], error: 'GitHub not configured' }

  try {
    assertValidRepoFullName(repoFullName)
  } catch (e) {
    return { runs: [], error: String(e) }
  }

  const [owner, repo] = repoFullName.split('/')

  try {
    const { ok, body } = await githubFetch(
      `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowId)}/runs?per_page=${limit}`,
      token,
    )
    if (!ok) return { runs: [], error: 'Failed to list workflow runs' }

    const data = body as {
      workflow_runs?: Array<{
        id: number
        status: string
        conclusion: string | null
        head_branch: string
        run_number: number
        html_url: string
        created_at: string
        updated_at: string
      }>
    }

    const runs = (data.workflow_runs ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      conclusion: r.conclusion,
      headBranch: r.head_branch,
      runNumber: r.run_number,
      htmlUrl: r.html_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    return { runs, error: null }
  } catch (e) {
    return { runs: [], error: String(e) }
  }
}
