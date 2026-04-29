import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { ALLOWED_CHECKS, runAllowedCheck } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { command?: keyof typeof ALLOWED_CHECKS; taskId?: string }
    if (!body.command || !(body.command in ALLOWED_CHECKS)) {
      return NextResponse.json({ error: 'Unsupported command. Allowed: test, lint, build, audit' }, { status: 400 })
    }
    const result = await runAllowedCheck(workspaceId, body.command, body.taskId)
    return NextResponse.json({ success: result.ok, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Check failed' }, { status: 500 })
  }
}
