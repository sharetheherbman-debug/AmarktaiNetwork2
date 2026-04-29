import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { pushWorkspaceBranch } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { confirm?: boolean }
    if (!body.confirm) return NextResponse.json({ error: 'confirm=true is required to push changes' }, { status: 400 })
    const result = await pushWorkspaceBranch(workspaceId)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, setupRequired: true, error: err instanceof Error ? err.message : 'Push failed' }, { status: 500 })
  }
}
