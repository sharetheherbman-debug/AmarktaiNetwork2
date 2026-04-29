import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getMusicJob, cancelMusicJob, retryMusicJob } from '@/lib/music-studio'

/**
 * GET /api/admin/music-studio/jobs/[jobId]
 *
 * Poll the status of an async music generation job.
 *
 * Returns MusicJobRecord on success, or 404 if not found.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await params
  const job = await getMusicJob(jobId)
  if (!job) {
    return NextResponse.json({ error: `Job not found: ${jobId}` }, { status: 404 })
  }

  return NextResponse.json({ job })
}

/**
 * DELETE /api/admin/music-studio/jobs/[jobId]
 *
 * Cancel a pending or processing music generation job.
 *
 * Returns { cancelled: true } on success, 404 if not found,
 * or 409 if the job is already in a terminal state.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await params
  const job = await getMusicJob(jobId)
  if (!job) {
    return NextResponse.json({ error: `Job not found: ${jobId}` }, { status: 404 })
  }

  const cancelled = await cancelMusicJob(jobId)
  if (!cancelled) {
    return NextResponse.json(
      { error: `Job ${jobId} is already in terminal state: ${job.status}` },
      { status: 409 },
    )
  }

  return NextResponse.json({ cancelled: true, jobId })
}

/**
 * POST /api/admin/music-studio/jobs/[jobId]
 *
 * Retry a failed or cancelled music generation job.
 * Creates a new job with the same parameters.
 *
 * Body: { action: 'retry' }
 *
 * Returns the new MusicJobRecord, or 404/409 as appropriate.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await params
  let body: { action?: string } = {}
  try {
    body = await request.json()
  } catch { /* no body */ }

  if (body.action !== 'retry') {
    return NextResponse.json(
      { error: 'Invalid action. Use { action: "retry" }.' },
      { status: 400 },
    )
  }

  const job = await getMusicJob(jobId)
  if (!job) {
    return NextResponse.json({ error: `Job not found: ${jobId}` }, { status: 404 })
  }

  const newJob = await retryMusicJob(jobId)
  if (!newJob) {
    return NextResponse.json(
      { error: `Job ${jobId} cannot be retried from status: ${job.status}` },
      { status: 409 },
    )
  }

  return NextResponse.json({ job: newJob }, { status: 201 })
}
