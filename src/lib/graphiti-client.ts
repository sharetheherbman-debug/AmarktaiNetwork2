/**
 * @module graphiti-client
 * @description Graphiti integration for AmarktAI Network.
 *
 * Provides app-isolated knowledge graph:
 *   - App feature relationships
 *   - Source relationships and provenance
 *   - Knowledge provenance tracking
 *   - App capability mapping over time
 *   - Religion/source relationship tracking
 *
 * Requires GRAPHITI_API_URL env var. Degrades gracefully if unavailable.
 * All graph data is app-isolated — no cross-app contamination.
 * Server-side only.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string
  type: string
  name: string
  appSlug: string
  properties: Record<string, unknown>
}

export interface GraphEdge {
  id: string
  sourceId: string
  targetId: string
  relation: string
  appSlug: string
  properties: Record<string, unknown>
}

export interface GraphitiStatus {
  available: boolean
  configured: boolean
  error: string | null
}

// ── Configuration ───────────────────────────────────────────────────────────

const GRAPHITI_API_URL = process.env.GRAPHITI_API_URL || ''
const GRAPHITI_TIMEOUT = 10_000

function getGraphitiApiKey(): string | null {
  return process.env.GRAPHITI_API_KEY || null
}

function isConfigured(): boolean {
  return !!GRAPHITI_API_URL && !!getGraphitiApiKey()
}

// ── Status ──────────────────────────────────────────────────────────────────

export function getGraphitiStatus(): GraphitiStatus {
  if (!GRAPHITI_API_URL) {
    return { available: false, configured: false, error: 'GRAPHITI_API_URL not configured' }
  }
  const apiKey = getGraphitiApiKey()
  return {
    available: !!apiKey,
    configured: !!apiKey,
    error: apiKey ? null : 'GRAPHITI_API_KEY not configured',
  }
}

// ── Node Operations ─────────────────────────────────────────────────────────

/**
 * Add a knowledge node for an app.
 */
export async function addNode(
  appSlug: string,
  type: string,
  name: string,
  properties?: Record<string, unknown>,
): Promise<GraphNode | null> {
  if (!isConfigured()) return null

  try {
    const res = await fetch(`${GRAPHITI_API_URL}/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getGraphitiApiKey()}`,
      },
      body: JSON.stringify({
        type,
        name,
        group_id: appSlug,
        properties: { app_slug: appSlug, ...properties },
      }),
      signal: AbortSignal.timeout(GRAPHITI_TIMEOUT),
    })

    if (!res.ok) return null

    const data = await res.json() as { id?: string }
    return {
      id: data?.id ?? `node_${Date.now()}`,
      type,
      name,
      appSlug,
      properties: properties ?? {},
    }
  } catch {
    return null
  }
}

/**
 * Add a relationship edge between two nodes, scoped to an app.
 */
export async function addEdge(
  appSlug: string,
  sourceId: string,
  targetId: string,
  relation: string,
  properties?: Record<string, unknown>,
): Promise<GraphEdge | null> {
  if (!isConfigured()) return null

  try {
    const res = await fetch(`${GRAPHITI_API_URL}/edges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getGraphitiApiKey()}`,
      },
      body: JSON.stringify({
        source_id: sourceId,
        target_id: targetId,
        relation,
        group_id: appSlug,
        properties: { app_slug: appSlug, ...properties },
      }),
      signal: AbortSignal.timeout(GRAPHITI_TIMEOUT),
    })

    if (!res.ok) return null

    const data = await res.json() as { id?: string }
    return {
      id: data?.id ?? `edge_${Date.now()}`,
      sourceId,
      targetId,
      relation,
      appSlug,
      properties: properties ?? {},
    }
  } catch {
    return null
  }
}

/**
 * Search knowledge graph for an app.
 */
export async function searchGraph(
  appSlug: string,
  query: string,
  options?: { limit?: number },
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  if (!isConfigured()) return { nodes: [], edges: [] }

  try {
    const res = await fetch(`${GRAPHITI_API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getGraphitiApiKey()}`,
      },
      body: JSON.stringify({
        query,
        group_id: appSlug,
        limit: options?.limit ?? 20,
      }),
      signal: AbortSignal.timeout(GRAPHITI_TIMEOUT),
    })

    if (!res.ok) return { nodes: [], edges: [] }

    const data = await res.json() as {
      nodes?: Array<{ id: string; type: string; name: string; properties?: Record<string, unknown> }>
      edges?: Array<{ id: string; source_id: string; target_id: string; relation: string; properties?: Record<string, unknown> }>
    }

    return {
      nodes: (data?.nodes ?? []).map(n => ({
        id: n.id,
        type: n.type,
        name: n.name,
        appSlug,
        properties: n.properties ?? {},
      })),
      edges: (data?.edges ?? []).map(e => ({
        id: e.id,
        sourceId: e.source_id,
        targetId: e.target_id,
        relation: e.relation,
        appSlug,
        properties: e.properties ?? {},
      })),
    }
  } catch {
    return { nodes: [], edges: [] }
  }
}
