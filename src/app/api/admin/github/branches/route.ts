import { NextResponse, NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { listBranches } from '@/lib/github-integration'

/** GET /api/admin/github/branches?repo=owner/repo — list branches for a repo */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const repo = new URL(req.url).searchParams.get('repo')
  if (!repo) {
    return NextResponse.json({ error: 'repo query param is required (e.g. owner/repo)' }, { status: 400 })
  }

  try {
    const result = await listBranches(repo)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list branches' },
      { status: 500 },
    )
  }
}
