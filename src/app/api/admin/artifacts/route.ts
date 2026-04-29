import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  listArtifacts,
  getArtifact,
  getArtifactCounts,
  deleteArtifact,
  createArtifact,
  type ArtifactType,
  type ArtifactStatus,
} from '@/lib/artifact-store'
import { verifyStorage } from '@/lib/storage-driver'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  const id = searchParams.get('id')
  if (id) {
    const artifact = await getArtifact(id)
    if (!artifact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ artifact })
  }

  if (searchParams.has('counts')) {
    const appSlug = searchParams.get('appSlug') ?? undefined
    const counts = await getArtifactCounts(appSlug)
    return NextResponse.json({ counts })
  }

  if (searchParams.has('storage-info')) {
    const storage = await verifyStorage()
    return NextResponse.json({
      storageDriver: storage.driver,
      storageRoot: storage.basePath,
      persistent: storage.persistent,
      configured: storage.configured,
      writable: storage.writable,
      requiredDriver: storage.requiredDriver,
      requiredRoot: storage.requiredRoot,
      requiredDirectories: storage.requiredDirectories,
      directories: storage.directories,
      missingSetup: storage.missingSetup,
      warning: storage.configured ? null : storage.error ?? storage.note,
    })
  }

  const result = await listArtifacts({
    appSlug: searchParams.get('appSlug') ?? undefined,
    type: (searchParams.get('type') ?? undefined) as ArtifactType | undefined,
    status: (searchParams.get('status') ?? undefined) as ArtifactStatus | undefined,
    limit: Math.min(parseInt(searchParams.get('limit') ?? '50') || 50, 200),
    offset: parseInt(searchParams.get('offset') ?? '0') || 0,
  })

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = body.type as ArtifactType | undefined
  if (!type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 })
  }

  const rawContentBase64 = body.contentBase64 as string | undefined
  const rawContentUrl = body.contentUrl as string | undefined

  let content: Buffer | undefined
  let contentUrl: string | undefined = rawContentUrl
  let mimeType = body.mimeType as string | undefined

  if (rawContentBase64 && typeof rawContentBase64 === 'string') {
    content = Buffer.from(rawContentBase64, 'base64')
  } else if (rawContentUrl && typeof rawContentUrl === 'string' && rawContentUrl.startsWith('data:')) {
    const match = rawContentUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      mimeType = mimeType ?? match[1]
      content = Buffer.from(match[2], 'base64')
      contentUrl = undefined
    }
  } else if (rawContentUrl && typeof rawContentUrl === 'string' && rawContentUrl.startsWith('http')) {
    const allowedCdnHostnames = [
      'oaidalleapi.blob.core.windows.net',
      'openai.com',
      'replicate.delivery',
      'pbxt.replicate.delivery',
      'api.together.xyz',
      'storage.googleapis.com',
      'lh3.googleusercontent.com',
    ]
    let fetchAllowed = false
    try {
      const parsed = new URL(rawContentUrl)
      if (parsed.protocol === 'https:') {
        fetchAllowed = allowedCdnHostnames.some(
          (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
        )
      }
    } catch {
      fetchAllowed = false
    }
    if (fetchAllowed) {
      try {
        const fetchRes = await fetch(rawContentUrl, { signal: AbortSignal.timeout(20_000) })
        if (fetchRes.ok) {
          const buf = Buffer.from(await fetchRes.arrayBuffer())
          const ct = fetchRes.headers.get('content-type') ?? undefined
          if (buf.length > 0) {
            content = buf
            mimeType = mimeType ?? ct
            contentUrl = undefined
          }
        }
      } catch {
        // createArtifact will reject unpersisted external URLs instead of claiming success.
      }
    }
  }

  try {
    const artifact = await createArtifact({
      appSlug: (body.appSlug as string) || 'workspace',
      type,
      subType: body.subType as string | undefined,
      title: body.title as string | undefined,
      description: body.description as string | undefined,
      provider: body.provider as string | undefined,
      model: body.model as string | undefined,
      traceId: body.traceId as string | undefined,
      mimeType,
      costUsdCents: typeof body.costUsdCents === 'number' ? body.costUsdCents : undefined,
      metadata: (body.metadata as Record<string, unknown>) ?? {},
      content,
      contentUrl,
    })
    return NextResponse.json({ artifact }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create artifact' },
      { status: 500 },
    )
  }
}

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
