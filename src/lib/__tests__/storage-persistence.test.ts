import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    artifact: {
      create: vi.fn(async ({ data }) => ({
        id: 'artifact_test',
        ...data,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })),
    },
  },
}))

vi.mock('@/lib/event-bus', () => ({
  emitSystemEvent: vi.fn(),
}))

const originalEnv = { ...process.env }

async function makeTempStorageRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'amarktai-storage-'))
}

afterEach(async () => {
  process.env = { ...originalEnv }
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('VPS storage persistence policy', () => {
  it('uses local_vps and the required storage root by default', async () => {
    delete process.env.STORAGE_DRIVER
    delete process.env.STORAGE_ROOT
    vi.resetModules()

    const { getStorageStatus } = await import('@/lib/storage-driver')
    const status = getStorageStatus()

    expect(status.driver).toBe('local_vps')
    expect(status.basePath).toBe('/var/www/amarktai/storage')
    expect(status.persistent).toBe(true)
    expect(status.requiredDirectories).toEqual(['artifacts', 'uploads', 'repos', 'workspaces', 'logs'])
  })

  it('creates required directories and verifies write access', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { verifyStorage } = await import('@/lib/storage-driver')
    const health = await verifyStorage()

    expect(health.configured).toBe(true)
    expect(health.writable).toBe(true)
    expect(health.directories.map((dir) => dir.name)).toEqual(['artifacts', 'uploads', 'repos', 'workspaces', 'logs'])
    expect(health.directories.every((dir) => dir.exists && dir.writable)).toBe(true)
  })

  it('writes, reads, and deletes artifact files through local_vps storage', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { getStorageDriver } = await import('@/lib/storage-driver')
    const driver = getStorageDriver()
    const result = await driver.put('artifacts/test-app/document/test.txt', Buffer.from('persistent'), 'text/plain')

    expect(result.url).toBe('/api/artifacts/file/artifacts/test-app/document/test.txt')
    expect(await driver.exists(result.path)).toBe(true)
    expect((await driver.get(result.path))?.toString()).toBe('persistent')
    expect(await driver.delete(result.path)).toBe(true)
    expect(await driver.exists(result.path)).toBe(false)
  })

  it('createArtifact does not claim success until physical storage is verified', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { createArtifact } = await import('@/lib/artifact-store')
    const artifact = await createArtifact({
      appSlug: 'test-app',
      type: 'document',
      subType: 'storage-proof',
      content: Buffer.from('saved for restart'),
      mimeType: 'text/plain',
    })

    expect(artifact.storageDriver).toBe('local_vps')
    expect(artifact.storagePath).toMatch(/^artifacts\/test-app\/document\//)
    expect(artifact.storageUrl).toContain('/api/artifacts/file/artifacts/test-app/document/')
    expect(artifact.fileSizeBytes).toBe(Buffer.byteLength('saved for restart'))
  })
})
