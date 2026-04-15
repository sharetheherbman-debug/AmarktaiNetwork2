/**
 * @module monetization-engine
 * @description Monetization Engine for the AmarktAI Network platform.
 *
 * Tracks usage, engagement, and provides revenue hooks so apps can generate
 * value automatically. The engine is designed as a lightweight, in-process
 * layer that:
 *   - Records every AI generation event (type, model, cost, app)
 *   - Tracks per-app content pipeline output counts
 *   - Provides subscription + usage-based billing hooks
 *   - Surfaces revenue dashboards per app
 *   - Integrates with PostHog for engagement analytics
 *
 * Storage: in-memory store (production: swap in Redis or Postgres writes).
 * All monetary values are in USD cents unless noted otherwise.
 *
 * Server-side only.
 */

import { randomUUID } from 'crypto'

// ── Types ────────────────────────────────────────────────────────────────────

/** Types of generation that can be tracked. */
export type GenerationType =
  | 'chat'
  | 'image'
  | 'video'
  | 'audio'
  | 'music'
  | 'code'
  | 'document'
  | 'research'
  | 'workflow'
  | 'agent_task'
  | 'embedding'

/** Subscription plan tiers. */
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise'

/** A single tracked usage event. */
export interface UsageEvent {
  id: string
  appSlug: string
  userId?: string
  type: GenerationType
  model: string
  provider: string
  /** Input tokens consumed (0 for non-token generations). */
  inputTokens: number
  /** Output tokens consumed. */
  outputTokens: number
  /** Actual cost in USD cents (estimated from model pricing). */
  costUsdCents: number
  /** Whether the generation succeeded. */
  success: boolean
  /** Error message if failed. */
  error?: string
  /** ISO timestamp. */
  timestamp: string
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>
}

/** Revenue event from a subscription or premium action. */
export interface RevenueEvent {
  id: string
  appSlug: string
  userId?: string
  type: 'subscription_charge' | 'usage_charge' | 'premium_feature' | 'content_sale'
  tier?: SubscriptionTier
  amountUsdCents: number
  description: string
  timestamp: string
}

/** App-level subscription record. */
export interface AppSubscription {
  appSlug: string
  userId?: string
  tier: SubscriptionTier
  /** ISO date of subscription start. */
  startedAt: string
  /** ISO date of next renewal (null = cancelled). */
  renewsAt: string | null
  /** Usage limits for this tier. */
  limits: TierLimits
  /** Current period usage counts. */
  currentUsage: Record<GenerationType, number>
}

/** Limits per subscription tier. */
export interface TierLimits {
  /** Maximum AI generations per month. */
  generationsPerMonth: number
  /** Maximum storage for artifacts in MB. */
  artifactStorageMb: number
  /** Whether premium models are accessible. */
  premiumModels: boolean
  /** Whether the app can run background agent tasks. */
  autonomousAgents: boolean
  /** Maximum concurrent workflow runs. */
  maxConcurrentWorkflows: number
}

/** Revenue summary for an app. */
export interface AppRevenueSummary {
  appSlug: string
  totalUsageEvents: number
  totalCostUsdCents: number
  totalRevenueUsdCents: number
  grossMarginUsdCents: number
  byType: Record<GenerationType, { count: number; costUsdCents: number }>
  activeSubscription: AppSubscription | null
  topModels: Array<{ model: string; count: number; costUsdCents: number }>
  generationsThisMonth: number
  revenueThisMonth: number
}

/** Platform-wide monetization summary. */
export interface PlatformMonetizationSummary {
  totalApps: number
  totalUsageEvents: number
  totalCostUsdCents: number
  totalRevenueUsdCents: number
  grossMarginUsdCents: number
  activeSubscriptions: number
  byTier: Record<SubscriptionTier, number>
  topRevenueApps: Array<{ appSlug: string; revenueUsdCents: number }>
  lastEventAt: string | null
}

// ── Tier definitions ─────────────────────────────────────────────────────────

const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    generationsPerMonth: 100,
    artifactStorageMb: 100,
    premiumModels: false,
    autonomousAgents: false,
    maxConcurrentWorkflows: 1,
  },
  starter: {
    generationsPerMonth: 1_000,
    artifactStorageMb: 1_000,
    premiumModels: false,
    autonomousAgents: true,
    maxConcurrentWorkflows: 3,
  },
  pro: {
    generationsPerMonth: 10_000,
    artifactStorageMb: 10_000,
    premiumModels: true,
    autonomousAgents: true,
    maxConcurrentWorkflows: 10,
  },
  enterprise: {
    generationsPerMonth: 999_999,
    artifactStorageMb: 100_000,
    premiumModels: true,
    autonomousAgents: true,
    maxConcurrentWorkflows: 100,
  },
}

const TIER_PRICES_USD_CENTS: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1_499, // $14.99/mo
  pro: 4_999,     // $49.99/mo
  enterprise: 19_999, // $199.99/mo
}

// ── In-memory stores ─────────────────────────────────────────────────────────

const usageEvents: UsageEvent[] = []
const revenueEvents: RevenueEvent[] = []
const subscriptions = new Map<string, AppSubscription>()

// ── Cost estimation ───────────────────────────────────────────────────────────

/** Rough per-token cost in USD cents by model prefix. */
const MODEL_TOKEN_COST_CENTS: Array<{ prefix: string; inputCentsPerKToken: number; outputCentsPerKToken: number }> = [
  { prefix: 'gpt-4o',        inputCentsPerKToken: 0.25,  outputCentsPerKToken: 1.00 },
  { prefix: 'gpt-4',         inputCentsPerKToken: 3.00,  outputCentsPerKToken: 6.00 },
  { prefix: 'gpt-3.5',       inputCentsPerKToken: 0.05,  outputCentsPerKToken: 0.15 },
  { prefix: 'claude-3-5',    inputCentsPerKToken: 0.30,  outputCentsPerKToken: 1.50 },
  { prefix: 'claude-3-opus', inputCentsPerKToken: 1.50,  outputCentsPerKToken: 7.50 },
  { prefix: 'claude-3',      inputCentsPerKToken: 0.30,  outputCentsPerKToken: 1.50 },
  { prefix: 'deepseek',      inputCentsPerKToken: 0.014, outputCentsPerKToken: 0.028 },
  { prefix: 'gemini',        inputCentsPerKToken: 0.075, outputCentsPerKToken: 0.30 },
  { prefix: 'llama',         inputCentsPerKToken: 0.02,  outputCentsPerKToken: 0.02 },
  { prefix: 'mistral',       inputCentsPerKToken: 0.07,  outputCentsPerKToken: 0.07 },
]

/** Flat cost per generation for non-token types. */
const FLAT_GENERATION_COST_CENTS: Record<GenerationType, number> = {
  chat: 0,          // token-based
  code: 0,          // token-based
  document: 0,      // token-based
  research: 0,      // token-based
  embedding: 0,     // token-based
  workflow: 2,      // 2¢ per workflow run
  agent_task: 3,    // 3¢ per agent task
  image: 4,         // ~4¢ per image (DALL-E 3 standard)
  video: 20,        // ~20¢ per video generation
  audio: 2,         // ~2¢ per TTS chunk
  music: 15,        // ~15¢ per music generation
}

/**
 * Estimate cost in USD cents for a generation event.
 */
export function estimateCost(
  type: GenerationType,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const modelLower = model.toLowerCase()
  const tokenRates = MODEL_TOKEN_COST_CENTS.find((r) => modelLower.startsWith(r.prefix))

  if (tokenRates && (inputTokens > 0 || outputTokens > 0)) {
    return Math.round(
      (inputTokens / 1000) * tokenRates.inputCentsPerKToken +
      (outputTokens / 1000) * tokenRates.outputCentsPerKToken,
    )
  }

  return FLAT_GENERATION_COST_CENTS[type] ?? 1
}

// ── Usage Tracking ───────────────────────────────────────────────────────────

/**
 * Record a usage event. Call this after every AI generation.
 */
export function trackUsage(
  params: Omit<UsageEvent, 'id' | 'timestamp' | 'costUsdCents'> & { costUsdCents?: number },
): UsageEvent {
  const costUsdCents =
    params.costUsdCents ??
    estimateCost(params.type, params.model, params.inputTokens, params.outputTokens)

  const event: UsageEvent = {
    ...params,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    costUsdCents,
  }
  usageEvents.push(event)

  // Update subscription usage counter
  const sub = subscriptions.get(params.appSlug)
  if (sub) {
    sub.currentUsage[params.type] = (sub.currentUsage[params.type] ?? 0) + 1
  }

  // Fire PostHog event (non-blocking, swallow errors)
  void sendPostHogUsageEvent(event)

  return event
}

/** Send a usage event to PostHog for engagement analytics. */
async function sendPostHogUsageEvent(event: UsageEvent): Promise<void> {
  const key = process.env.POSTHOG_API_KEY?.trim()
  const host = process.env.POSTHOG_HOST?.trim() ?? 'https://app.posthog.com'
  if (!key) return

  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event: 'ai_generation',
        distinct_id: event.userId ?? event.appSlug,
        properties: {
          appSlug: event.appSlug,
          type: event.type,
          model: event.model,
          provider: event.provider,
          success: event.success,
          costUsdCents: event.costUsdCents,
          inputTokens: event.inputTokens,
          outputTokens: event.outputTokens,
        },
        timestamp: event.timestamp,
      }),
    })
  } catch { /* non-blocking */ }
}

// ── Revenue Recording ────────────────────────────────────────────────────────

/**
 * Record a revenue event (subscription charge, premium feature, content sale).
 */
export function recordRevenue(
  params: Omit<RevenueEvent, 'id' | 'timestamp'>,
): RevenueEvent {
  const event: RevenueEvent = {
    ...params,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  }
  revenueEvents.push(event)
  return event
}

// ── Subscription Management ──────────────────────────────────────────────────

/**
 * Create or update a subscription for an app.
 */
export function upsertSubscription(
  appSlug: string,
  tier: SubscriptionTier,
  userId?: string,
): AppSubscription {
  const now = new Date()
  const renewsAt = new Date(now)
  renewsAt.setMonth(renewsAt.getMonth() + 1)

  const existing = subscriptions.get(appSlug)
  const sub: AppSubscription = {
    appSlug,
    userId,
    tier,
    startedAt: existing?.startedAt ?? now.toISOString(),
    renewsAt: renewsAt.toISOString(),
    limits: TIER_LIMITS[tier],
    currentUsage: existing?.currentUsage ?? {
      chat: 0, image: 0, video: 0, audio: 0, music: 0,
      code: 0, document: 0, research: 0, workflow: 0,
      agent_task: 0, embedding: 0,
    },
  }
  subscriptions.set(appSlug, sub)

  // Record the revenue event
  if (tier !== 'free') {
    recordRevenue({
      appSlug,
      userId,
      type: 'subscription_charge',
      tier,
      amountUsdCents: TIER_PRICES_USD_CENTS[tier],
      description: `${tier} subscription for ${appSlug}`,
    })
  }

  return sub
}

/** Get current subscription for an app (null if none / free). */
export function getSubscription(appSlug: string): AppSubscription | null {
  return subscriptions.get(appSlug) ?? null
}

/** Check if an app has exceeded its generation limit this period. */
export function isWithinGenerationLimit(appSlug: string, _type: GenerationType): boolean {
  const sub = subscriptions.get(appSlug)
  if (!sub) return true // No subscription = free tier; don't hard-block (soft limit)
  const totalUsed = Object.values(sub.currentUsage).reduce((a, b) => a + b, 0)
  return totalUsed < sub.limits.generationsPerMonth
}

// ── Revenue Summary ───────────────────────────────────────────────────────────

/** Get the revenue summary for a single app. */
export function getAppRevenueSummary(appSlug: string): AppRevenueSummary {
  const appUsage = usageEvents.filter((e) => e.appSlug === appSlug)
  const appRevenue = revenueEvents.filter((e) => e.appSlug === appSlug)

  const totalCostUsdCents = appUsage.reduce((s, e) => s + e.costUsdCents, 0)
  const totalRevenueUsdCents = appRevenue.reduce((s, e) => s + e.amountUsdCents, 0)

  const byType = {} as Record<GenerationType, { count: number; costUsdCents: number }>
  for (const e of appUsage) {
    if (!byType[e.type]) byType[e.type] = { count: 0, costUsdCents: 0 }
    byType[e.type].count++
    byType[e.type].costUsdCents += e.costUsdCents
  }

  const modelMap = new Map<string, { count: number; costUsdCents: number }>()
  for (const e of appUsage) {
    const m = modelMap.get(e.model) ?? { count: 0, costUsdCents: 0 }
    m.count++
    m.costUsdCents += e.costUsdCents
    modelMap.set(e.model, m)
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const generationsThisMonth = appUsage.filter((e) => e.timestamp >= monthStart).length
  const revenueThisMonth = appRevenue
    .filter((e) => e.timestamp >= monthStart)
    .reduce((s, e) => s + e.amountUsdCents, 0)

  return {
    appSlug,
    totalUsageEvents: appUsage.length,
    totalCostUsdCents,
    totalRevenueUsdCents,
    grossMarginUsdCents: totalRevenueUsdCents - totalCostUsdCents,
    byType,
    activeSubscription: getSubscription(appSlug),
    topModels: Array.from(modelMap.entries())
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    generationsThisMonth,
    revenueThisMonth,
  }
}

/** Get platform-wide monetization summary. */
export function getPlatformMonetizationSummary(): PlatformMonetizationSummary {
  const totalCostUsdCents = usageEvents.reduce((s, e) => s + e.costUsdCents, 0)
  const totalRevenueUsdCents = revenueEvents.reduce((s, e) => s + e.amountUsdCents, 0)

  const byTier: Record<SubscriptionTier, number> = { free: 0, starter: 0, pro: 0, enterprise: 0 }
  for (const sub of subscriptions.values()) byTier[sub.tier]++

  const appRevenueMap = new Map<string, number>()
  for (const e of revenueEvents) {
    appRevenueMap.set(e.appSlug, (appRevenueMap.get(e.appSlug) ?? 0) + e.amountUsdCents)
  }

  const topRevenueApps = Array.from(appRevenueMap.entries())
    .map(([appSlug, revenueUsdCents]) => ({ appSlug, revenueUsdCents }))
    .sort((a, b) => b.revenueUsdCents - a.revenueUsdCents)
    .slice(0, 10)

  const lastEvent = [...usageEvents, ...revenueEvents]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]

  const appsWithUsage = new Set(usageEvents.map((e) => e.appSlug))

  return {
    totalApps: appsWithUsage.size,
    totalUsageEvents: usageEvents.length,
    totalCostUsdCents,
    totalRevenueUsdCents,
    grossMarginUsdCents: totalRevenueUsdCents - totalCostUsdCents,
    activeSubscriptions: subscriptions.size,
    byTier,
    topRevenueApps,
    lastEventAt: lastEvent?.timestamp ?? null,
  }
}

// ── Content Pipeline Tracking ────────────────────────────────────────────────

export interface ContentPipelineRun {
  id: string
  appSlug: string
  pipelineType: 'daily_summary' | 'content_batch' | 'report' | 'newsletter' | 'social_posts' | 'custom'
  itemsGenerated: number
  costUsdCents: number
  status: 'completed' | 'partial' | 'failed'
  startedAt: string
  completedAt: string
}

const pipelineRuns: ContentPipelineRun[] = []

/** Record a completed content pipeline run. */
export function recordPipelineRun(
  params: Omit<ContentPipelineRun, 'id'>,
): ContentPipelineRun {
  const run = { ...params, id: randomUUID() }
  pipelineRuns.push(run)
  return run
}

/** Get pipeline run history for an app. */
export function getPipelineHistory(appSlug: string, limit = 30): ContentPipelineRun[] {
  return pipelineRuns
    .filter((r) => r.appSlug === appSlug)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit)
}

// ── Tier Information (for UI) ─────────────────────────────────────────────────

export interface TierInfo {
  id: SubscriptionTier
  name: string
  priceUsdCents: number
  limits: TierLimits
}

export function getAllTiers(): TierInfo[] {
  return (Object.keys(TIER_LIMITS) as SubscriptionTier[]).map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    priceUsdCents: TIER_PRICES_USD_CENTS[id],
    limits: TIER_LIMITS[id],
  }))
}
