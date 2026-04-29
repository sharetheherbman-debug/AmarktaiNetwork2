import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  createMusic,
  createMusicJob,
  listMusicJobs,
  generateLyrics,
  getMusicArtifactAsync,
  getMusicArtifactsByAppAsync,
  getAllMusicArtifactsAsync,
  getMusicStudioStatusAsync,
  getMusicStudioSummaryAsync,
  validateMusicRequest,
  AVAILABLE_GENRES,
  AVAILABLE_VOCAL_STYLES,
  type MusicCreationRequest,
} from '@/lib/music-studio'

/**
 * GET /api/admin/music-studio
 *
 * Query params:
 *   id       - get a single artifact by ID
 *   appSlug  - filter artifacts by app
 *   summary  - return summary stats only
 *   status   - return music studio status (vault-aware async check)
 *   genres   - return available genres
 *   styles   - return available vocal styles
 *   limit    - max results (default 20)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const appSlug = searchParams.get('appSlug')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100)

  if (searchParams.has('status')) {
    // Use vault-aware async check so keys configured via Admin UI are discovered
    return NextResponse.json({ status: await getMusicStudioStatusAsync() })
  }

  if (searchParams.has('summary')) {
    return NextResponse.json({ summary: await getMusicStudioSummaryAsync() })
  }

  if (searchParams.has('genres')) {
    return NextResponse.json({ genres: AVAILABLE_GENRES })
  }

  if (searchParams.has('styles')) {
    return NextResponse.json({ styles: AVAILABLE_VOCAL_STYLES })
  }

  if (searchParams.has('jobs')) {
    // List async music generation jobs
    const jobs = await listMusicJobs(appSlug ?? undefined, limit)
    return NextResponse.json({ jobs, count: jobs.length })
  }

  if (id) {
    const artifact = await getMusicArtifactAsync(id)
    if (!artifact) {
      return NextResponse.json({ error: `Artifact not found: ${id}` }, { status: 404 })
    }
    return NextResponse.json({ artifact })
  }

  const artifacts = appSlug
    ? await getMusicArtifactsByAppAsync(appSlug, limit)
    : await getAllMusicArtifactsAsync(limit)

  // Use vault-aware async status for the artifact listing response too
  const status = await getMusicStudioStatusAsync()
  return NextResponse.json({
    artifacts,
    count: artifacts.length,
    status,
  })
}

/**
 * POST /api/admin/music-studio
 *
 * Body:
 *   action: 'create' | 'create_async' | 'lyrics_only'
 *   request: MusicCreationRequest
 *
 * create_async — returns a job record immediately; poll /jobs/[jobId] for status.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action?: string; request?: Partial<MusicCreationRequest> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action = 'create', request: req } = body
  if (!req) {
    return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
  }

  // Require genre OR genres
  const hasGenre = req.genre || (req.genres && req.genres.length > 0)
  if (!req.theme || !hasGenre || !req.vocalStyle || !req.appSlug) {
    return NextResponse.json(
      { error: 'Required fields: theme, genre (or genres[]), vocalStyle, appSlug' },
      { status: 400 },
    )
  }

  // Derive legacy genre from genres[] if only genres[] is provided
  if (!req.genre && req.genres && req.genres.length > 0) {
    req.genre = req.genres[0]
  }

  const musicRequest = req as MusicCreationRequest

  // Validate genre/mood limits before any processing
  try {
    validateMusicRequest(musicRequest)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    )
  }

  try {
    if (action === 'lyrics_only') {
      const lyrics = await generateLyrics(musicRequest)
      return NextResponse.json({ lyrics })
    }

    if (action === 'create_async') {
      const job = await createMusicJob(musicRequest)
      return NextResponse.json({ job }, { status: 202 })
    }

    // action === 'create' (default — synchronous)
    const result = await createMusic(musicRequest)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Music studio error' },
      { status: 500 },
    )
  }
}
