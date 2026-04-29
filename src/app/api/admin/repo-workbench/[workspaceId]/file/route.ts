import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readRepoFile } from '@/lib/repo-workbench'

export async function GET(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const filePath = new URL(req.url).searchParams.get('path') || ''
    if (!filePath) return NextResponse.json({ error: 'path is required' }, { status: 400 })
    const file = await readRepoFile(workspaceId, filePath)
    return NextResponse.json(file)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to read file' }, { status: 400 })
  }
}
