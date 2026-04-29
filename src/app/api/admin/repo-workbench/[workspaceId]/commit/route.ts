import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { commitPatch } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { patchId?: string; message?: string; branchName?: string; confirm?: boolean }
    if (!body.confirm) return NextResponse.json({ error: 'confirm=true is required to commit changes' }, { status: 400 })
    if (!body.patchId) return NextResponse.json({ error: 'patchId is required' }, { status: 400 })
    if (!body.message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 })
    const result = await commitPatch(workspaceId, body.patchId, body.message, body.branchName)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Commit failed' }, { status: 500 })
  }
}
