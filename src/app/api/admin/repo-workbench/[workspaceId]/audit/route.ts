import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createAuditTask, type AgentMode } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { agentMode?: AgentMode; modelId?: string; depth?: 'quick' | 'standard' | 'deep' }
    const result = await createAuditTask(workspaceId, body.agentMode || 'repo_auditor', body.modelId, body.depth || 'standard')
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Audit failed' }, { status: 500 })
  }
}
