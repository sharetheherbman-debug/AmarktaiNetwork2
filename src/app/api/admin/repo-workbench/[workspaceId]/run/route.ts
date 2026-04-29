import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runMagicPipeline, type QualityTier } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { instruction?: string; quality?: QualityTier }
    if (!body.instruction?.trim()) return NextResponse.json({ error: 'instruction is required' }, { status: 400 })
    const quality: QualityTier = (['best', 'good', 'balanced', 'cheap'] as const).includes(body.quality as QualityTier)
      ? (body.quality as QualityTier)
      : 'balanced'
    const result = await runMagicPipeline({ workspaceId, instruction: body.instruction.trim(), quality })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Run failed' }, { status: 500 })
  }
}
