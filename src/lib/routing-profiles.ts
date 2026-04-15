/**
 * @module routing-profiles
 * @description Production-grade routing profiles for the AmarktAI Network.
 *
 * Each routing profile defines how the routing engine selects models:
 *   - Provider priority tiers (primary / fallback / emergency)
 *   - Cost and latency ceilings
 *   - Retry behaviour on failure
 *   - Timeout-based switching thresholds
 *   - Load-distribution preferences
 *
 * Profiles are applied per-app via the app profile's `routing_profile` field,
 * or as one-off overrides in a single request's RoutingContext.
 *
 * Server-side only.
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** The four named routing profiles available to every app. */
export type RoutingProfileId = 'low_cost' | 'balanced' | 'premium' | 'ultra_resilient'

/** Priority tier for a provider within a routing profile. */
export type ProviderTier = 'primary' | 'fallback' | 'emergency'

/** Per-provider tier entry in a routing profile. */
export interface ProviderTierEntry {
  provider: string
  tier: ProviderTier
  /** Override cost-ceiling for this provider within the profile. */
  maxCostTier?: string
  /** Override latency-ceiling for this provider within the profile. */
  maxLatencyTier?: string
}

/** Retry policy applied when a model invocation fails. */
export interface RetryPolicy {
  /** Maximum number of retries before escalating to the next tier. */
  maxRetries: number
  /** Initial back-off delay in milliseconds. */
  initialDelayMs: number
  /** Multiplier applied to the delay on each subsequent retry. */
  backoffMultiplier: number
  /** Maximum back-off delay in milliseconds. */
  maxDelayMs: number
  /** Timeout in milliseconds before the call is considered failed. */
  timeoutMs: number
}

/** Full routing profile definition. */
export interface RoutingProfile {
  id: RoutingProfileId
  name: string
  description: string

  /** Maximum cost tier the profile will consider. */
  maxCostTier: string

  /** Maximum latency tier the profile will consider. */
  maxLatencyTier: string

  /** Ordered provider tiers. Primary providers are tried first. */
  providerTiers: ProviderTierEntry[]

  /** Retry policy for individual model calls. */
  retryPolicy: RetryPolicy

  /**
   * When true, distribute load across providers in the same tier instead of
   * always preferring the first available.
   */
  distributeLoad: boolean

  /**
   * When true, automatically fall through to the next provider tier after
   * exhausting the current tier's retries (instead of surfacing the error).
   */
  autoFallthrough: boolean
}

// ── Profile Definitions ───────────────────────────────────────────────────────

/** Routes exclusively to the cheapest capable models. Maximises cost savings. */
const LOW_COST_PROFILE: RoutingProfile = {
  id: 'low_cost',
  name: 'Low Cost',
  description:
    'Routes to the cheapest capable models. Ideal for high-volume, non-critical tasks.',
  maxCostTier: 'low',
  maxLatencyTier: 'high', // latency not a concern in low_cost mode
  providerTiers: [
    { provider: 'groq', tier: 'primary', maxCostTier: 'low' },
    { provider: 'deepseek', tier: 'primary', maxCostTier: 'low' },
    { provider: 'together', tier: 'primary', maxCostTier: 'low' },
    { provider: 'openrouter', tier: 'primary', maxCostTier: 'low' },
    { provider: 'huggingface', tier: 'fallback', maxCostTier: 'free' },
    { provider: 'openai', tier: 'emergency', maxCostTier: 'medium' },
  ],
  retryPolicy: {
    maxRetries: 2,
    initialDelayMs: 500,
    backoffMultiplier: 2,
    maxDelayMs: 4_000,
    timeoutMs: 20_000,
  },
  distributeLoad: true,
  autoFallthrough: true,
}

/**
 * Balances cost and quality. Suitable for most production apps.
 * This is the default profile.
 */
const BALANCED_PROFILE: RoutingProfile = {
  id: 'balanced',
  name: 'Balanced',
  description:
    'Balances cost and quality. Best for typical production workloads.',
  maxCostTier: 'medium',
  maxLatencyTier: 'medium',
  providerTiers: [
    { provider: 'openai', tier: 'primary', maxCostTier: 'medium' },
    { provider: 'groq', tier: 'primary', maxCostTier: 'low' },
    { provider: 'together', tier: 'fallback', maxCostTier: 'medium' },
    { provider: 'deepseek', tier: 'fallback', maxCostTier: 'low' },
    { provider: 'anthropic', tier: 'fallback', maxCostTier: 'medium' },
    { provider: 'openrouter', tier: 'emergency', maxCostTier: 'medium' },
  ],
  retryPolicy: {
    maxRetries: 3,
    initialDelayMs: 300,
    backoffMultiplier: 1.5,
    maxDelayMs: 5_000,
    timeoutMs: 30_000,
  },
  distributeLoad: false,
  autoFallthrough: true,
}

/** Routes to the highest-quality models. Prioritises accuracy over cost. */
const PREMIUM_PROFILE: RoutingProfile = {
  id: 'premium',
  name: 'Premium',
  description:
    'Routes to the best available models regardless of cost. For high-stakes tasks.',
  maxCostTier: 'premium',
  maxLatencyTier: 'high',
  providerTiers: [
    { provider: 'openai', tier: 'primary', maxCostTier: 'premium' },
    { provider: 'anthropic', tier: 'primary', maxCostTier: 'premium' },
    { provider: 'gemini', tier: 'primary', maxCostTier: 'premium' },
    { provider: 'grok', tier: 'fallback', maxCostTier: 'high' },
    { provider: 'openrouter', tier: 'fallback', maxCostTier: 'premium' },
    { provider: 'together', tier: 'emergency', maxCostTier: 'medium' },
  ],
  retryPolicy: {
    maxRetries: 3,
    initialDelayMs: 200,
    backoffMultiplier: 1.5,
    maxDelayMs: 6_000,
    timeoutMs: 60_000,
  },
  distributeLoad: false,
  autoFallthrough: true,
}

/**
 * Maximum resilience. Distributes load and auto-fails over across all tiers
 * to ensure 24/7 uptime. Used for mission-critical workflows.
 */
const ULTRA_RESILIENT_PROFILE: RoutingProfile = {
  id: 'ultra_resilient',
  name: 'Ultra Resilient',
  description:
    'Maximum resilience: load distribution, aggressive fallback, cross-provider redundancy. ' +
    'Ideal for 24/7 autonomous agent workloads.',
  maxCostTier: 'premium',
  maxLatencyTier: 'high',
  providerTiers: [
    { provider: 'openai', tier: 'primary', maxCostTier: 'medium' },
    { provider: 'groq', tier: 'primary', maxCostTier: 'low' },
    { provider: 'anthropic', tier: 'primary', maxCostTier: 'medium' },
    { provider: 'together', tier: 'fallback', maxCostTier: 'medium' },
    { provider: 'deepseek', tier: 'fallback', maxCostTier: 'low' },
    { provider: 'openrouter', tier: 'fallback', maxCostTier: 'high' },
    { provider: 'gemini', tier: 'fallback', maxCostTier: 'high' },
    { provider: 'huggingface', tier: 'emergency', maxCostTier: 'free' },
    { provider: 'nvidia', tier: 'emergency', maxCostTier: 'medium' },
  ],
  retryPolicy: {
    maxRetries: 5,
    initialDelayMs: 150,
    backoffMultiplier: 1.3,
    maxDelayMs: 8_000,
    timeoutMs: 45_000,
  },
  distributeLoad: true,
  autoFallthrough: true,
}

// ── Registry ─────────────────────────────────────────────────────────────────

const PROFILES: Record<RoutingProfileId, RoutingProfile> = {
  low_cost: LOW_COST_PROFILE,
  balanced: BALANCED_PROFILE,
  premium: PREMIUM_PROFILE,
  ultra_resilient: ULTRA_RESILIENT_PROFILE,
}

// ── Accessors ─────────────────────────────────────────────────────────────────

/** Get a routing profile by ID (defaults to 'balanced' if not found). */
export function getRoutingProfile(id?: RoutingProfileId | string): RoutingProfile {
  if (id && id in PROFILES) return PROFILES[id as RoutingProfileId]
  return PROFILES.balanced
}

/** List all available routing profiles. */
export function getAllRoutingProfiles(): RoutingProfile[] {
  return Object.values(PROFILES)
}

// ── Retry Helper ──────────────────────────────────────────────────────────────

export interface RetryContext {
  attempt: number
  lastErrorMessage: string | null
  providerKey: string
}

export interface RetryDecision {
  shouldRetry: boolean
  delayMs: number
  reason: string
}

/**
 * Decide whether to retry a failed model call given the profile's retry policy.
 */
export function shouldRetry(
  policy: RetryPolicy,
  context: RetryContext,
): RetryDecision {
  if (context.attempt >= policy.maxRetries) {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: `Retry limit (${policy.maxRetries}) reached for provider ${context.providerKey}.`,
    }
  }
  const delayMs = Math.min(
    policy.initialDelayMs * Math.pow(policy.backoffMultiplier, context.attempt),
    policy.maxDelayMs,
  )
  return {
    shouldRetry: true,
    delayMs: Math.round(delayMs),
    reason: `Retrying attempt ${context.attempt + 1}/${policy.maxRetries} after ${delayMs}ms (provider: ${context.providerKey}).`,
  }
}

// ── Profile → RoutingContext Helpers ──────────────────────────────────────────

/**
 * Derive the maxCostTier and maxLatencyTier overrides from a routing profile.
 * These can be spread directly into a RoutingContext.
 */
export function profileToRoutingOverrides(
  profile: RoutingProfile,
): { maxCostTier: string; maxLatencyTier: string } {
  return {
    maxCostTier: profile.maxCostTier,
    maxLatencyTier: profile.maxLatencyTier,
  }
}

/**
 * Return the ordered list of providers to try for a given tier,
 * optionally shuffled for load distribution.
 */
export function getProvidersByTier(
  profile: RoutingProfile,
  tier: ProviderTier,
): string[] {
  const entries = profile.providerTiers.filter((e) => e.tier === tier)
  if (!profile.distributeLoad) return entries.map((e) => e.provider)
  // Fisher-Yates shuffle for load distribution
  const providers = entries.map((e) => e.provider)
  for (let i = providers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[providers[i], providers[j]] = [providers[j], providers[i]]
  }
  return providers
}

/**
 * Build the full ordered fallback chain from a profile:
 * primary providers first, then fallback, then emergency.
 */
export function buildFallbackChain(profile: RoutingProfile): string[] {
  return [
    ...getProvidersByTier(profile, 'primary'),
    ...getProvidersByTier(profile, 'fallback'),
    ...getProvidersByTier(profile, 'emergency'),
  ]
}
