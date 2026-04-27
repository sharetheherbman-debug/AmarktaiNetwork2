import { NextResponse, NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { triggerDeploy, listWorkflowRuns } from '@/lib/github-integration'

/**
 * POST /api/admin/github/deploy — trigger a GitHub Actions workflow_dispatch deploy.
 *
 * Body:
 *   repoFullName  string  — e.g. "owner/repo"
 *   workflowId    string  — workflow file name, e.g. "deploy.yml"
 *   branch        string? — target branch (default: repo default)
 *   inputs        object? — workflow_dispatch input key/values
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { repoFullName, workflowId, branch, inputs } = body

    if (!repoFullName || !workflowId) {
      return NextResponse.json(
        { error: 'repoFullName and workflowId are required' },
        { status: 400 },
      )
    }

    const result = await triggerDeploy({
      repoFullName,
      workflowId,
      branch: branch ?? undefined,
      inputs: inputs ?? {},
    })

    return NextResponse.json(result, { status: result.success ? 202 : 422 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to trigger deploy' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/admin/github/deploy
 *   ?repo=owner/repo
 *   &workflowId=deploy.yml
 *   &limit=10
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const repo       = searchParams.get('repo')
  const workflowId = searchParams.get('workflowId') ?? 'deploy.yml'
  const limit      = parseInt(searchParams.get('limit') ?? '10', 10)

  if (!repo) {
    return NextResponse.json({ error: 'repo query param is required (e.g. owner/repo)' }, { status: 400 })
  }

  try {
    const result = await listWorkflowRuns(repo, workflowId, limit)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch deploy status' },
      { status: 500 },
    )
  }
}
