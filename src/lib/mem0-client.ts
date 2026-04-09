/**
 * @module mem0-client
 * @description Mem0 integration for AmarktAI Network.
 *
 * Provides app-isolated persistent memory:
 *   - App-specific conversation memory
 *   - Admin preferences per app
 *   - Successful routing patterns
 *   - Recurring rules/preferences
 *
 * Requires MEM0_API_KEY env var. Degrades gracefully if unavailable.
 * All memory is app-isolated — no cross-app contamination.
 * Server-side only.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface Mem0Memory {
  id: string
  appSlug: string
  userId?: string
  content: string
  category: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface Mem0Status {
  available: boolean
  apiKeyConfigured: boolean
  error: string | null
}

// ── Configuration ───────────────────────────────────────────────────────────

const MEM0_API_URL = process.env.MEM0_API_URL || 'https://api.mem0.ai/v1'
const MEM0_TIMEOUT = 10_000

function getMem0ApiKey(): string | null {
  return process.env.MEM0_API_KEY || null
}

// ── Status ──────────────────────────────────────────────────────────────────

export function getMem0Status(): Mem0Status {
  const apiKey = getMem0ApiKey()
  return {
    available: !!apiKey,
    apiKeyConfigured: !!apiKey,
    error: apiKey ? null : 'MEM0_API_KEY not configured',
  }
}

// ── Memory Operations ───────────────────────────────────────────────────────

/**
 * Store a memory for an app. App-isolated by appSlug.
 */
export async function addMemory(
  appSlug: string,
  content: string,
  options?: { userId?: string; category?: string; metadata?: Record<string, unknown> },
): Promise<Mem0Memory | null> {
  const apiKey = getMem0ApiKey()
  if (!apiKey) return null

  try {
    const res = await fetch(`${MEM0_API_URL}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content }],
        user_id: `app_${appSlug}${options?.userId ? `_${options.userId}` : ''}`,
        metadata: {
          app_slug: appSlug,
          category: options?.category ?? 'general',
          ...options?.metadata,
        },
      }),
      signal: AbortSignal.timeout(MEM0_TIMEOUT),
    })

    if (!res.ok) return null

    const data = await res.json() as { results?: Array<{ id: string; memory: string }> }
    const first = data?.results?.[0]
    if (!first) return null

    return {
      id: first.id,
      appSlug,
      userId: options?.userId,
      content: first.memory ?? content,
      category: options?.category ?? 'general',
      metadata: options?.metadata ?? {},
      createdAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/**
 * Search memories for an app. App-isolated by appSlug.
 */
export async function searchMemories(
  appSlug: string,
  query: string,
  options?: { userId?: string; limit?: number },
): Promise<Mem0Memory[]> {
  const apiKey = getMem0ApiKey()
  if (!apiKey) return []

  try {
    const res = await fetch(`${MEM0_API_URL}/memories/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        user_id: `app_${appSlug}${options?.userId ? `_${options.userId}` : ''}`,
        limit: options?.limit ?? 10,
      }),
      signal: AbortSignal.timeout(MEM0_TIMEOUT),
    })

    if (!res.ok) return []

    const data = await res.json() as { results?: Array<{ id: string; memory: string; metadata?: Record<string, unknown> }> }
    return (data?.results ?? []).map(r => ({
      id: r.id,
      appSlug,
      content: r.memory,
      category: (r.metadata?.category as string) ?? 'general',
      metadata: r.metadata ?? {},
      createdAt: new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

/**
 * Get all memories for an app.
 */
export async function getAppMemories(appSlug: string): Promise<Mem0Memory[]> {
  const apiKey = getMem0ApiKey()
  if (!apiKey) return []

  try {
    const res = await fetch(`${MEM0_API_URL}/memories?user_id=app_${encodeURIComponent(appSlug)}`, {
      headers: { Authorization: `Token ${apiKey}` },
      signal: AbortSignal.timeout(MEM0_TIMEOUT),
    })

    if (!res.ok) return []

    const data = await res.json() as { results?: Array<{ id: string; memory: string; metadata?: Record<string, unknown> }> }
    return (data?.results ?? []).map(r => ({
      id: r.id,
      appSlug,
      content: r.memory,
      category: (r.metadata?.category as string) ?? 'general',
      metadata: r.metadata ?? {},
      createdAt: new Date().toISOString(),
    }))
  } catch {
    return []
  }
}
