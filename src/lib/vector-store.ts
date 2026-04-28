/**
 * Vector Store — AmarktAI Network
 *
 * Qdrant-backed vector database for semantic search, RAG, and memory.
 *
 * Supports per-app isolation:
 *   - Each app's data is stored in its own namespace (via payload filter)
 *   - No cross-app leakage in search results
 *   - Source tracking for grounded responses
 *
 * When QDRANT_URL is not configured, operations degrade gracefully to
 * no-ops so the rest of the platform keeps working without Qdrant.
 *
 * Server-side only.
 */

import { QdrantClient } from '@qdrant/js-client-rest'
import { getServiceKey, getServiceConfigField } from './service-vault'

// ── Singleton ────────────────────────────────────────────────────────────────

let _client: QdrantClient | null = null

/**
 * Returns the shared Qdrant client, or `null` if QDRANT_URL is not set.
 * Resolves URL/key from the DB vault first, then env var fallback.
 */
export async function getQdrantClientAsync(): Promise<QdrantClient | null> {
  const url = await getServiceConfigField('qdrant', 'url', 'QDRANT_URL')
  if (!url) return null
  const apiKey = await getServiceKey('qdrant', 'QDRANT_API_KEY')
  // Recreate client if config has changed
  _client = new QdrantClient({ url, apiKey: apiKey ?? undefined })
  return _client
}

/**
 * Returns the shared Qdrant client, or `null` if QDRANT_URL is not set.
 * Sync version — reads env var only (used for sync callers).
 * Prefer getQdrantClientAsync() in async contexts.
 */
export function getQdrantClient(): QdrantClient | null {
  if (_client) return _client
  const url = process.env.QDRANT_URL
  if (!url) return null
  _client = new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  })
  return _client
}

// ── Collection management ───────────────────────────────────────────────────

const DEFAULT_COLLECTION = 'amarktai_memory'
const APP_KNOWLEDGE_COLLECTION = 'amarktai_app_knowledge'
const VECTOR_SIZE = 1536 // OpenAI text-embedding-3-large default

/**
 * Ensure the default collection exists.
 */
export async function ensureCollection(
  name = DEFAULT_COLLECTION,
  vectorSize = VECTOR_SIZE,
): Promise<boolean> {
  const client = await getQdrantClientAsync()
  if (!client) return false
  try {
    const collections = await client.getCollections()
    const exists = collections.collections.some((c) => c.name === name)
    if (!exists) {
      await client.createCollection(name, {
        vectors: { size: vectorSize, distance: 'Cosine' },
      })
    }
    return true
  } catch {
    return false
  }
}

/**
 * Ensure the per-app knowledge collection exists with payload indexing for app isolation.
 */
export async function ensureAppKnowledgeCollection(): Promise<boolean> {
  const client = await getQdrantClientAsync()
  if (!client) return false
  try {
    const collections = await client.getCollections()
    const exists = collections.collections.some((c) => c.name === APP_KNOWLEDGE_COLLECTION)
    if (!exists) {
      await client.createCollection(APP_KNOWLEDGE_COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      })
      // Create payload index for app isolation
      await client.createPayloadIndex(APP_KNOWLEDGE_COLLECTION, {
        field_name: 'app_slug',
        field_schema: 'keyword',
      })
    }
    return true
  } catch {
    return false
  }
}

// ── Upsert / Search ─────────────────────────────────────────────────────────

export interface VectorPoint {
  id: string
  vector: number[]
  payload: Record<string, unknown>
}

/**
 * Upsert vector points into the collection.
 */
export async function upsertVectors(
  points: VectorPoint[],
  collection = DEFAULT_COLLECTION,
): Promise<boolean> {
  const client = await getQdrantClientAsync()
  if (!client) return false
  try {
    await client.upsert(collection, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    })
    return true
  } catch {
    return false
  }
}

export interface SearchResult {
  id: string | number
  score: number
  payload: Record<string, unknown>
}

/**
 * Search for the nearest vectors.
 */
export async function searchVectors(
  vector: number[],
  limit = 10,
  collection = DEFAULT_COLLECTION,
  filter?: Record<string, unknown>,
): Promise<SearchResult[]> {
  const client = await getQdrantClientAsync()
  if (!client) return []
  try {
    const results = await client.search(collection, {
      vector,
      limit,
      filter: filter as never,
      with_payload: true,
    })
    return results.map((r) => ({
      id: r.id,
      score: r.score,
      payload: (r.payload ?? {}) as Record<string, unknown>,
    }))
  } catch {
    return []
  }
}

// ── Per-App Isolated Operations ─────────────────────────────────────────────

/**
 * Upsert knowledge vectors for a specific app. Each point is tagged with app_slug
 * for strict app isolation.
 */
export async function upsertAppKnowledge(
  appSlug: string,
  points: VectorPoint[],
): Promise<boolean> {
  const taggedPoints = points.map(p => ({
    ...p,
    payload: {
      ...p.payload,
      app_slug: appSlug,
    },
  }))
  return upsertVectors(taggedPoints, APP_KNOWLEDGE_COLLECTION)
}

/**
 * Search knowledge for a specific app only. Enforces app isolation via filter.
 * No cross-app leakage.
 */
export async function searchAppKnowledge(
  appSlug: string,
  vector: number[],
  limit = 10,
): Promise<SearchResult[]> {
  return searchVectors(vector, limit, APP_KNOWLEDGE_COLLECTION, {
    must: [{ key: 'app_slug', match: { value: appSlug } }],
  })
}

/**
 * Delete all knowledge vectors for a specific app.
 */
export async function deleteAppKnowledge(appSlug: string): Promise<boolean> {
  const client = await getQdrantClientAsync()
  if (!client) return false
  try {
    await client.delete(APP_KNOWLEDGE_COLLECTION, {
      filter: {
        must: [{ key: 'app_slug', match: { value: appSlug } }],
      },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Returns true when Qdrant is connected and responding.
 */
export async function isQdrantHealthy(): Promise<boolean> {
  const client = await getQdrantClientAsync()
  if (!client) return false
  try {
    await client.getCollections()
    return true
  } catch {
    return false
  }
}
