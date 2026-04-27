import { NextResponse, NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { getFileContent } from '@/lib/github-integration'

/**
 * GET /api/admin/github/file
 *   ?repo=owner/repo
 *   &branch=main
 *   &path=src/index.ts
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const repo   = searchParams.get('repo')
  const branch = searchParams.get('branch') ?? 'main'
  const path   = searchParams.get('path')

  if (!repo || !path) {
    return NextResponse.json({ error: 'repo and path query params are required' }, { status: 400 })
  }

  try {
    const result = await getFileContent(repo, branch, path)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch file' },
      { status: 500 },
    )
  }
}
