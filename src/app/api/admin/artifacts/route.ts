import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  listArtifacts,
  getArtifact,
  getArtifactCounts,
  deleteArtifact,
  type ArtifactType,
  type ArtifactStatus,
} from '@/lib/artifact-store'

/**
 * GET /api/admin/artifacts
 *
 * Query params:
 *   id       — get single artifact
 *   appSlug  — filter by app
 *   type     — filter by type
 *   status   — filter by status
 *   counts   — return counts only
 *   limit    — max results (default 50)
 *   offset   — pagination offset
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  // Single artifact
  const id = searchParams.get('id')
  if (id) {
    const artifact = await getArtifact(id)
    if (!artifact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ artifact })
  }

  // Counts only
  if (searchParams.has('counts')) {
    const appSlug = searchParams.get('appSlug') ?? undefined
    const counts = await getArtifactCounts(appSlug)
    return NextResponse.json({ counts })
  }

  // List with filters
  const result = await listArtifacts({
    appSlug: searchParams.get('appSlug') ?? undefined,
    type: (searchParams.get('type') ?? undefined) as ArtifactType | undefined,
    status: (searchParams.get('status') ?? undefined) as ArtifactStatus | undefined,
    limit: Math.min(parseInt(searchParams.get('limit') ?? '50') || 50, 200),
    offset: parseInt(searchParams.get('offset') ?? '0') || 0,
  })

  return NextResponse.json(result)
}

/**
 * DELETE /api/admin/artifacts
 *
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Artifact id required' }, { status: 400 })
  }

  const deleted = await deleteArtifact(body.id)
  if (!deleted) {
    return NextResponse.json({ error: 'Not found or delete failed' }, { status: 404 })
  }

  return NextResponse.json({ deleted: true })
}
