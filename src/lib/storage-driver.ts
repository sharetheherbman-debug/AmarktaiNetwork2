/**
 * @module storage-driver
 * @description Pluggable storage abstraction for the Amarktai Network.
 *
 * Production policy:
 *   STORAGE_DRIVER=local_vps
 *   STORAGE_ROOT=/var/www/amarktai/storage
 *
 * Required persistent directories:
 *   artifacts, uploads, repos, workspaces, logs
 */

import fs from 'fs/promises'
import path from 'path'

export const REQUIRED_STORAGE_DRIVER = 'local_vps'
export const DEFAULT_STORAGE_ROOT = '/var/www/amarktai/storage'
export const REQUIRED_STORAGE_DIRS = ['artifacts', 'uploads', 'repos', 'workspaces', 'logs'] as const

export interface StoragePutResult {
  url: string
  path: string
  sizeBytes: number
}

export interface StorageDriver {
  name: string
  put(key: string, data: Buffer, contentType: string): Promise<StoragePutResult>
  get(key: string): Promise<Buffer | null>
  delete(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  getUrl(key: string): Promise<string>
  ensureDirectories?(): Promise<void>
}

export interface StorageStatus {
  driver: string
  configured: boolean
  persistent: boolean
  basePath: string
  requiredDriver: string
  requiredRoot: string
  requiredDirectories: readonly string[]
  missingSetup: string[]
  note: string
}

export interface StorageHealth extends StorageStatus {
  writable: boolean
  directories: Array<{ name: string; path: string; exists: boolean; writable: boolean }>
  error: string | null
}

function getStorageRoot(): string {
  return process.env.STORAGE_ROOT?.trim() || DEFAULT_STORAGE_ROOT
}

function encodeStorageKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}

function assertInsideBase(basePath: string, key: string): string {
  const base = path.resolve(basePath)
  const resolved = path.resolve(base, key)
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error('Path traversal detected')
  }
  return resolved
}

class VpsLocalStorageDriver implements StorageDriver {
  name = 'local_vps'

  private get basePath(): string {
    return getStorageRoot()
  }

  private resolvePath(key: string): string {
    return assertInsideBase(this.basePath, key)
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<StoragePutResult> {
    await this.ensureDirectories()
    const filePath = this.resolvePath(key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, data)
    const exists = await this.exists(key)
    if (!exists) throw new Error(`Storage write verification failed for ${key}`)
    return { url: `/api/artifacts/file/${encodeStorageKey(key)}`, path: key, sizeBytes: data.length }
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolvePath(key))
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await fs.unlink(this.resolvePath(key))
      return true
    } catch {
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(key))
      return true
    } catch {
      return false
    }
  }

  async getUrl(key: string): Promise<string> {
    return `/api/artifacts/file/${encodeStorageKey(key)}`
  }

  async ensureDirectories(): Promise<void> {
    for (const sub of REQUIRED_STORAGE_DIRS) {
      await fs.mkdir(path.join(this.basePath, sub), { recursive: true })
    }
  }
}

const LOCAL_BASE_DIR = process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), '.storage')

class LocalStorageDriver implements StorageDriver {
  name = 'local'

  private resolvePath(key: string): string {
    const sanitized = key.replace(/\.\./g, '').replace(/^\/+/, '')
    return assertInsideBase(LOCAL_BASE_DIR, sanitized)
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<StoragePutResult> {
    const filePath = this.resolvePath(key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, data)
    return { url: `/api/artifacts/file/${encodeStorageKey(key)}`, path: key, sizeBytes: data.length }
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolvePath(key))
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await fs.unlink(this.resolvePath(key))
      return true
    } catch {
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(key))
      return true
    } catch {
      return false
    }
  }

  async getUrl(key: string): Promise<string> {
    return `/api/artifacts/file/${encodeStorageKey(key)}`
  }
}

class S3StorageDriver implements StorageDriver {
  name = 's3'

  async put(): Promise<StoragePutResult> {
    throw new Error('S3 storage is not enabled for this deployment. Use STORAGE_DRIVER=local_vps.')
  }

  async get(): Promise<Buffer | null> {
    return null
  }

  async delete(): Promise<boolean> {
    return false
  }

  async exists(): Promise<boolean> {
    return false
  }

  async getUrl(key: string): Promise<string> {
    return key
  }
}

class R2StorageDriver implements StorageDriver {
  name = 'r2'

  async put(): Promise<StoragePutResult> {
    throw new Error('R2 storage is not enabled for this deployment. Use STORAGE_DRIVER=local_vps.')
  }

  async get(): Promise<Buffer | null> {
    return null
  }

  async delete(): Promise<boolean> {
    return false
  }

  async exists(): Promise<boolean> {
    return false
  }

  async getUrl(key: string): Promise<string> {
    return key
  }
}

let _cachedDriver: StorageDriver | null = null

export function getStorageDriver(): StorageDriver {
  if (_cachedDriver) return _cachedDriver

  const driverName = (process.env.STORAGE_DRIVER ?? REQUIRED_STORAGE_DRIVER).toLowerCase()
  switch (driverName) {
    case 'local_vps':
      _cachedDriver = new VpsLocalStorageDriver()
      break
    case 's3':
      _cachedDriver = new S3StorageDriver()
      break
    case 'r2':
      _cachedDriver = new R2StorageDriver()
      break
    default:
      _cachedDriver = new LocalStorageDriver()
  }

  return _cachedDriver
}

export function getStorageStatus(): StorageStatus {
  const driverName = (process.env.STORAGE_DRIVER ?? REQUIRED_STORAGE_DRIVER).toLowerCase()
  const root = getStorageRoot()
  const missingSetup: string[] = []
  if (driverName !== REQUIRED_STORAGE_DRIVER) {
    missingSetup.push(`Set STORAGE_DRIVER=${REQUIRED_STORAGE_DRIVER}`)
  }
  if (root !== DEFAULT_STORAGE_ROOT && process.env.NODE_ENV === 'production') {
    missingSetup.push(`Set STORAGE_ROOT=${DEFAULT_STORAGE_ROOT}`)
  }

  const baseStatus = {
    requiredDriver: REQUIRED_STORAGE_DRIVER,
    requiredRoot: DEFAULT_STORAGE_ROOT,
    requiredDirectories: REQUIRED_STORAGE_DIRS,
    missingSetup,
  }

  if (driverName === 'local_vps') {
    return {
      ...baseStatus,
      driver: 'local_vps',
      configured: missingSetup.length === 0,
      persistent: true,
      basePath: root,
      note: `VPS local storage active at ${root}. Artifacts are persistent only when this path is mounted across redeployments.`,
    }
  }

  if (driverName === 's3') {
    return {
      ...baseStatus,
      driver: 's3',
      configured: false,
      persistent: !!(process.env.S3_BUCKET && process.env.AWS_ACCESS_KEY_ID),
      basePath: process.env.S3_BUCKET ?? '',
      note: 'S3 is not the required production storage driver for this deployment. Set STORAGE_DRIVER=local_vps.',
    }
  }

  if (driverName === 'r2') {
    return {
      ...baseStatus,
      driver: 'r2',
      configured: false,
      persistent: !!process.env.R2_PUBLIC_URL,
      basePath: process.env.R2_PUBLIC_URL ?? '',
      note: 'R2 is not the required production storage driver for this deployment. Set STORAGE_DRIVER=local_vps.',
    }
  }

  return {
    ...baseStatus,
    driver: 'local',
    configured: false,
    persistent: false,
    basePath: LOCAL_BASE_DIR,
    note: 'Local file storage is ephemeral. Set STORAGE_DRIVER=local_vps and STORAGE_ROOT=/var/www/amarktai/storage.',
  }
}

export async function verifyStorage(): Promise<StorageHealth> {
  const status = getStorageStatus()
  const directories: StorageHealth['directories'] = []
  let error: string | null = null

  if (status.driver !== REQUIRED_STORAGE_DRIVER) {
    return { ...status, writable: false, directories, error: status.note }
  }

  try {
    const driver = getStorageDriver()
    await driver.ensureDirectories?.()
    for (const name of REQUIRED_STORAGE_DIRS) {
      const dirPath = path.join(status.basePath, name)
      let exists = false
      let writable = false
      try {
        await fs.mkdir(dirPath, { recursive: true })
        await fs.access(dirPath)
        exists = true
        const probePath = path.join(dirPath, `.amarktai-write-test-${process.pid}`)
        await fs.writeFile(probePath, 'ok')
        await fs.unlink(probePath)
        writable = true
      } catch {
        writable = false
      }
      directories.push({ name, path: dirPath, exists, writable })
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Storage verification failed'
  }

  const writable = directories.length === REQUIRED_STORAGE_DIRS.length && directories.every((dir) => dir.exists && dir.writable)
  return {
    ...status,
    configured: status.configured && writable,
    writable,
    directories,
    error,
  }
}
