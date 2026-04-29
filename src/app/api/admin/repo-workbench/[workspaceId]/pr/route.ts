import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createWorkspacePr } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { title?: string; body?: string; confirm?: boolean }
    if (!body.confirm) return NextResponse.json({ error: 'confirm=true is required to create a PR' }, { status: 400 })
    if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })
    const result = await createWorkspacePr(workspaceId, body.title, body.body || '')
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, setupRequired: true, error: err instanceof Error ? err.message : 'PR creation failed' }, { status: 500 })
  }
}
