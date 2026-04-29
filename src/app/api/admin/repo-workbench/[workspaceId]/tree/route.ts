import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listRepoTree } from '@/lib/repo-workbench'

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const { workspace, entries, truncated } = await listRepoTree(workspaceId)
    return NextResponse.json({ workspace, tree: entries, truncated })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load tree' }, { status: 400 })
  }
}
