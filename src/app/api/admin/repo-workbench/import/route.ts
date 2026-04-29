import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { importRepo } from '@/lib/repo-workbench'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as { repoUrl?: string; branch?: string }
    if (!body.repoUrl) return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 })
    const workspace = await importRepo(body.repoUrl, body.branch || 'main')
    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      currentCommit: workspace.currentCommit,
      localPath: workspace.localPath,
      workspace,
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Repo import failed' }, { status: 400 })
  }
}
