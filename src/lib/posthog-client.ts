/**
 * @module posthog-client
 * @description PostHog analytics integration for AmarktAI Network.
 *
 * Provides truthful usage analytics:
 *   - App request volume
 *   - Provider/model usage
 *   - Cost/performance visibility
 *   - Feature usage tracking
 *   - Request outcome truth
 *   - Admin observability
 *
 * Requires POSTHOG_API_KEY env var. Degrades gracefully if unavailable.
 * All analytics shown must be true — no fake dashboards.
 * Server-side only.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface PostHogEvent {
  event: string
  distinctId: string
  properties?: Record<string, unknown>
  timestamp?: string
}

export interface PostHogStatus {
  available: boolean
  apiKeyConfigured: boolean
  host: string | null
  error: string | null
}

export interface AppUsageMetrics {
  appSlug: string
  totalRequests: number
  successRate: number
  avgLatencyMs: number
  topProviders: Array<{ provider: string; count: number }>
  topModels: Array<{ model: string; count: number }>
  budgetUsed: number
  failurePatterns: Array<{ pattern: string; count: number }>
}

// ── Configuration ───────────────────────────────────────────────────────────

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || ''
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com'
const POSTHOG_TIMEOUT = 5_000

// ── Status ──────────────────────────────────────────────────────────────────

export function getPostHogStatus(): PostHogStatus {
  if (!POSTHOG_API_KEY) {
    return { available: false, apiKeyConfigured: false, host: null, error: 'POSTHOG_API_KEY not configured' }
  }
  return { available: true, apiKeyConfigured: true, host: POSTHOG_HOST, error: null }
}

// ── Event Capture ───────────────────────────────────────────────────────────

/**
 * Capture an analytics event. Non-blocking, best-effort.
 * Never throws — analytics failures must not affect production.
 */
export async function captureEvent(event: PostHogEvent): Promise<boolean> {
  if (!POSTHOG_API_KEY) return false

  try {
    const res = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event: event.event,
        distinct_id: event.distinctId,
        properties: {
          ...event.properties,
          $lib: 'amarktai-network',
        },
        timestamp: event.timestamp || new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(POSTHOG_TIMEOUT),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Capture a batch of events. Non-blocking, best-effort.
 */
export async function captureBatch(events: PostHogEvent[]): Promise<boolean> {
  if (!POSTHOG_API_KEY || events.length === 0) return false

  try {
    const res = await fetch(`${POSTHOG_HOST}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        batch: events.map(e => ({
          event: e.event,
          distinct_id: e.distinctId,
          properties: {
            ...e.properties,
            $lib: 'amarktai-network',
          },
          timestamp: e.timestamp || new Date().toISOString(),
          type: 'capture',
        })),
      }),
      signal: AbortSignal.timeout(POSTHOG_TIMEOUT),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Pre-built Event Helpers ─────────────────────────────────────────────────

/**
 * Track a brain request event.
 */
export async function trackBrainRequest(data: {
  appSlug: string
  taskType: string
  provider: string
  model: string
  success: boolean
  latencyMs: number
  cost?: number
  executionMode?: string
}): Promise<void> {
  await captureEvent({
    event: 'brain_request',
    distinctId: `app_${data.appSlug}`,
    properties: {
      app_slug: data.appSlug,
      task_type: data.taskType,
      provider: data.provider,
      model: data.model,
      success: data.success,
      latency_ms: data.latencyMs,
      cost: data.cost ?? 0,
      execution_mode: data.executionMode ?? 'direct',
    },
  })
}

/**
 * Track an app agent action.
 */
export async function trackAgentAction(data: {
  appSlug: string
  agentId: string
  action: string
  success: boolean
  latencyMs: number
}): Promise<void> {
  await captureEvent({
    event: 'agent_action',
    distinctId: `app_${data.appSlug}`,
    properties: {
      app_slug: data.appSlug,
      agent_id: data.agentId,
      action: data.action,
      success: data.success,
      latency_ms: data.latencyMs,
    },
  })
}

/**
 * Track a Firecrawl crawl event.
 */
export async function trackCrawl(data: {
  appSlug: string
  url: string
  success: boolean
  pagesFound: number
  niche: string
}): Promise<void> {
  await captureEvent({
    event: 'firecrawl_crawl',
    distinctId: `app_${data.appSlug}`,
    properties: {
      app_slug: data.appSlug,
      url: data.url,
      success: data.success,
      pages_found: data.pagesFound,
      detected_niche: data.niche,
    },
  })
}

/**
 * Track a daily learning cycle.
 */
export async function trackLearningCycle(data: {
  appSlug: string
  agentId: string
  improvementsCount: number
  successRate: number
}): Promise<void> {
  await captureEvent({
    event: 'learning_cycle',
    distinctId: `app_${data.appSlug}`,
    properties: {
      app_slug: data.appSlug,
      agent_id: data.agentId,
      improvements_count: data.improvementsCount,
      success_rate: data.successRate,
    },
  })
}
