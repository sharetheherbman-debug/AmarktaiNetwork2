import { NextResponse, NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { getFileTree } from '@/lib/github-integration'

/**
 * GET /api/admin/github/tree
 *   ?repo=owner/repo
 *   &branch=main
 *   &recursive=true   (optional, default true)
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const repo      = searchParams.get('repo')
  const branch    = searchParams.get('branch') ?? 'main'
  const recursive = searchParams.get('recursive') !== 'false'

  if (!repo) {
    return NextResponse.json({ error: 'repo query param is required (e.g. owner/repo)' }, { status: 400 })
  }

  try {
    const result = await getFileTree(repo, branch, recursive)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch file tree' },
      { status: 500 },
    )
  }
}
