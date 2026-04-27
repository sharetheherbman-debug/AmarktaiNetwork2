import { NextResponse, NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { createPullRequest } from '@/lib/github-integration'

/** POST /api/admin/github/pr — create a pull request */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { repoFullName, head, base, title, description, draft } = body

    if (!repoFullName || !head || !base || !title) {
      return NextResponse.json(
        { error: 'repoFullName, head, base, and title are required' },
        { status: 400 },
      )
    }

    const result = await createPullRequest({
      repoFullName,
      head,
      base,
      title,
      body: description ?? '',
      draft: draft ?? false,
    })

    return NextResponse.json(result, { status: result.success ? 201 : 422 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create pull request' },
      { status: 500 },
    )
  }
}
