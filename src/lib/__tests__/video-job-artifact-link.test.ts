import { describe, expect, it, vi } from 'vitest'

const findFirst = vi.fn()
const findUnique = vi.fn()
const createArtifact = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    artifact: { findFirst },
    videoGenerationJob: {
      findUnique,
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/brain', () => ({
  getVaultApiKey: vi.fn(),
}))

vi.mock('@/lib/webhook-manager', () => ({
  dispatchEvent: vi.fn(),
}))

vi.mock('@/lib/artifact-store', () => ({
  createArtifact,
}))

describe('/api/brain/video-generate/[jobId] artifact linkage', () => {
  it('persists a completed video job result as an artifact', async () => {
    findFirst.mockResolvedValue(null)
    findUnique.mockResolvedValue({
      id: 'video_job_1',
      appSlug: 'demo-app',
      provider: 'replicate',
      modelId: 'wan-video',
      prompt: 'cinematic product reveal',
      status: 'succeeded',
      providerJobId: 'provider_job_1',
      resultUrl: 'https://replicate.delivery/output.mp4',
      resultMeta: null,
      errorMessage: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:05.000Z'),
    })
    createArtifact.mockResolvedValue({ id: 'artifact_video_1' })

    const { GET } = await import('@/app/api/brain/video-generate/[jobId]/route')
    const response = await GET(new Request('http://test.local/api/brain/video-generate/video_job_1'), {
      params: Promise.resolve({ jobId: 'video_job_1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.artifactId).toBe('artifact_video_1')
    expect(createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      appSlug: 'demo-app',
      type: 'video',
      subType: 'video_generation',
      traceId: 'video-job-video_job_1',
      contentUrl: 'https://replicate.delivery/output.mp4',
      metadata: expect.objectContaining({ jobId: 'video_job_1' }),
    }))
  })
})
