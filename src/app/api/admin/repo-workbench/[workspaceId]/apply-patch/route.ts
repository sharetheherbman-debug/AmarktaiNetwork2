import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { applyPatch } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { patchId?: string; confirm?: boolean }
    if (!body.confirm) return NextResponse.json({ error: 'confirm=true is required to apply a patch' }, { status: 400 })
    if (!body.patchId) return NextResponse.json({ error: 'patchId is required' }, { status: 400 })
    const result = await applyPatch(workspaceId, body.patchId)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Patch apply failed' }, { status: 500 })
  }
}
