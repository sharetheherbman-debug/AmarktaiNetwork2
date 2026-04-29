import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createPlanTask, type AgentMode } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { request?: string; scope?: string; agentMode?: AgentMode; modelId?: string }
    if (!body.request?.trim()) return NextResponse.json({ error: 'request is required' }, { status: 400 })
    const result = await createPlanTask({
      workspaceId,
      request: body.request,
      scope: body.scope || 'auto',
      agentMode: body.agentMode || 'fullstack_builder',
      modelId: body.modelId,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Plan failed' }, { status: 500 })
  }
}
