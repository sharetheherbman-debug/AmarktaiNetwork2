/**
 * @module app-discovery
 * @description App Discovery / AI Intelligence system for the AmarktAI Network platform.
 *
 * When an admin wants to onboard a new application, this module analyses the
 * app's URL, name, and description to propose an optimal AI configuration.
 * It detects the application category, infers AI and multimodal needs, assigns
 * a risk level, selects a Capability Pack, and surfaces any capability gaps —
 * all without requiring the admin to manually configure dozens of settings.
 *
 * Server-side only — do NOT import from client components.
 */

import { getCapabilityPack, getPacksForCategory } from './capability-packs'
import type { CapabilityPack } from './capability-packs'

// ── Types ────────────────────────────────────────────────

/** Input provided by the admin when requesting app discovery. */
export interface AppDiscoveryInput {
  /** Display name of the application. */
  name: string
  /** Primary URL of the application. */
  url: string
  /** Optional URL pointing to the app's documentation. */
  docsUrl?: string
  /** Optional free-text description of what the app does. */
  description?: string
}

/** Proposed AI configuration for an onboarded application. */
export interface ProposedConfig {
  /** Provider slugs recommended for this app. */
  providers: string[]
  /** Model identifiers recommended for this app. */
  models: string[]
  /** Budget limits in USD cents. */
  budget: { daily: number; monthly: number }
  /** Identifier of the matched Capability Pack. */
  capabilityPackId: string
  /** Content-safety tier for the app. */
  safetyMode: 'strict' | 'standard' | 'relaxed' | 'adult_gated'
  /** How much conversation history the app should retain. */
  memoryMode: 'full' | 'session' | 'minimal' | 'none'
  /** Monitoring tier assigned to the app. */
  monitoringLevel: 'basic' | 'standard' | 'premium'
}

/** Full result of an app discovery analysis. */
export interface AppDiscoveryResult {
  /** Display name of the application. */
  name: string
  /** Primary URL of the application. */
  url: string
  /** Detected application category. */
  detectedCategory: string
  /** Features detected from analysing the app's signals. */
  detectedFeatures: string[]
  /** AI capabilities inferred as required by the app. */
  inferredAiNeeds: string[]
  /** Multimodal capabilities (image, voice, video) inferred as required. */
  inferredMultimodalNeeds: string[]
  /** Overall risk assessment. */
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  /** Whether the app likely requires a real-time streaming connection. */
  realtimeNeeded: boolean
  /** Agent types recommended for orchestration. */
  inferredAgentSet: string[]
  /** Proposed AI configuration derived from the matched Capability Pack. */
  proposedConfig: ProposedConfig
  /** Capabilities required but not yet available on the platform. */
  capabilityGaps: string[]
  /** Human-readable warnings surfaced during analysis. */
  warnings: string[]
  /** Confidence score for the analysis (0 – 1). */
  confidence: number
}

// ── Category Detection ───────────────────────────────────

/** Maps each detectable category to its trigger keywords. */
const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
  support: ['chat', 'support', 'help', 'ticket'],
  creator: ['creator', 'marketing', 'campaign', 'content'],
  companion: ['companion', 'friend', 'personal'],
  knowledge: ['bible', 'quran', 'religious', 'knowledge', 'learn', 'education'],
  dating: ['dating', 'match', 'social', 'connect'],
  media: ['music', 'media', 'video', 'stream', 'podcast'],
  voice: ['voice', 'speak', 'talk', 'call'],
  dev: ['dev', 'code', 'developer', 'api', 'tools'],
  adult: ['adult', '18+', 'nsfw', 'mature'],
}

/** Maps a detected category to its Capability Pack id. */
const CATEGORY_TO_PACK_ID: Record<string, string> = {
  support: 'support_pack',
  creator: 'creator_pack',
  companion: 'companion_pack',
  knowledge: 'knowledge_pack',
  dating: 'dating_pack',
  media: 'media_pack',
  voice: 'voice_pack',
  dev: 'dev_pack',
  adult: 'adult_18plus_pack',
  general: 'support_pack', // sensible default
}

/** Maps a detected category to a base risk level. */
const CATEGORY_RISK: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  support: 'low',
  creator: 'low',
  companion: 'medium',
  knowledge: 'low',
  dating: 'medium',
  media: 'low',
  voice: 'medium',
  dev: 'low',
  adult: 'critical',
  general: 'low',
}

/** Maps a detected category to a monitoring tier. */
const CATEGORY_MONITORING: Record<string, 'basic' | 'standard' | 'premium'> = {
  support: 'standard',
  creator: 'basic',
  companion: 'premium',
  knowledge: 'basic',
  dating: 'standard',
  media: 'basic',
  voice: 'standard',
  dev: 'basic',
  adult: 'premium',
  general: 'basic',
}

// ── Keyword Helpers ──────────────────────────────────────

/** Feature keywords that can be detected from app signals. */
const FEATURE_KEYWORDS: Record<string, string[]> = {
  chat: ['chat', 'message', 'conversation', 'talk'],
  voice: ['voice', 'speak', 'call', 'audio'],
  image: ['image', 'photo', 'picture', 'avatar'],
  video: ['video', 'stream', 'live'],
  code: ['code', 'developer', 'api', 'sdk', 'programming'],
  retrieval: ['search', 'knowledge', 'docs', 'faq', 'retrieval'],
  realtime: ['realtime', 'live', 'stream', 'call', 'websocket'],
}

/** Multimodal capability keywords. */
const MULTIMODAL_KEYWORDS: Record<string, string[]> = {
  image_generation: ['image', 'photo', 'avatar', 'picture', 'art'],
  voice: ['voice', 'speak', 'call', 'audio', 'talk'],
  video: ['video', 'stream', 'live', 'media'],
}

/**
 * Collect all searchable text from an {@link AppDiscoveryInput}, normalised
 * to lowercase so callers can perform case-insensitive matching.
 */
function buildSearchCorpus(input: AppDiscoveryInput): string {
  return [input.name, input.url, input.docsUrl ?? '', input.description ?? '']
    .join(' ')
    .toLowerCase()
}

/**
 * Score each category by counting how many of its keywords appear in the
 * search corpus. Returns an ordered list of `[category, matchCount]` tuples,
 * highest count first.
 */
function scoreCategories(corpus: string): [string, number][] {
  const scores: [string, number][] = []

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORD_MAP)) {
    const count = keywords.filter((kw) => corpus.includes(kw)).length
    if (count > 0) {
      scores.push([category, count])
    }
  }

  return scores.sort((a, b) => b[1] - a[1])
}

/** Extract detected features from the search corpus. */
function detectFeatures(corpus: string): string[] {
  const features: string[] = []

  for (const [feature, keywords] of Object.entries(FEATURE_KEYWORDS)) {
    if (keywords.some((kw) => corpus.includes(kw))) {
      features.push(feature)
    }
  }

  return features
}

/** Infer multimodal needs from the search corpus. */
function detectMultimodalNeeds(corpus: string): string[] {
  const needs: string[] = []

  for (const [capability, keywords] of Object.entries(MULTIMODAL_KEYWORDS)) {
    if (keywords.some((kw) => corpus.includes(kw))) {
      needs.push(capability)
    }
  }

  return needs
}

/** Determine whether real-time streaming is likely required. */
function detectRealtimeNeed(corpus: string, pack: CapabilityPack | undefined): boolean {
  if (pack?.realtimeRequired) return true
  const realtimeSignals = ['realtime', 'live', 'stream', 'websocket', 'call']
  return realtimeSignals.some((kw) => corpus.includes(kw))
}

/**
 * Calculate a confidence score (0 – 1) based on how many keyword matches
 * were found during category detection.
 *
 * - 0 matches → 0.3 (fallback to 'general')
 * - 1 match   → 0.5
 * - 2 matches → 0.7
 * - 3 matches → 0.85
 * - 4+ matches → 0.95
 */
function computeConfidence(matchCount: number): number {
  if (matchCount === 0) return 0.3
  if (matchCount === 1) return 0.5
  if (matchCount === 2) return 0.7
  if (matchCount === 3) return 0.85
  return 0.95
}

// ── Public API ───────────────────────────────────────────

/**
 * Analyse an application and propose an optimal AI configuration.
 *
 * The analysis is based on keyword matching against the app's name, URL,
 * optional docs URL, and free-text description. The detected category is
 * used to select a {@link CapabilityPack} which then drives the proposed
 * provider/model/budget/safety/memory configuration.
 */
export async function discoverApp(
  input: AppDiscoveryInput,
): Promise<AppDiscoveryResult> {
  const corpus = buildSearchCorpus(input)

  // ── Detect category ──
  const scores = scoreCategories(corpus)
  const topCategory = scores.length > 0 ? scores[0][0] : 'general'
  const topMatchCount = scores.length > 0 ? scores[0][1] : 0

  // ── Resolve capability pack ──
  const packId = CATEGORY_TO_PACK_ID[topCategory] ?? 'support_pack'
  let pack = getCapabilityPack(packId)

  // Fallback: try getPacksForCategory in case the direct lookup misses
  if (!pack) {
    const packs = getPacksForCategory(topCategory)
    pack = packs[0]
  }

  // ── Detect features & needs ──
  const detectedFeatures = detectFeatures(corpus)
  const inferredMultimodalNeeds = detectMultimodalNeeds(corpus)
  const realtimeNeeded = detectRealtimeNeed(corpus, pack)
  const confidence = computeConfidence(topMatchCount)

  // ── Build proposed config from the pack (or sensible defaults) ──
  const providers = pack?.allowedProviders ?? ['openai']
  const models = pack?.recommendedModels ?? ['gpt-4o']
  const budget = pack?.defaultBudget ?? { daily: 5_000, monthly: 100_000 }
  const safetyMode = pack?.safetyLevel ?? 'standard'
  const memoryMode = pack?.memoryStrategy ?? 'session'
  const monitoringLevel = CATEGORY_MONITORING[topCategory] ?? 'basic'
  const inferredAgentSet = pack?.recommendedAgents ?? ['router']
  const inferredAiNeeds = pack?.capabilities ?? ['chat']

  // ── Surface warnings ──
  const warnings: string[] = []

  if (topCategory === 'adult') {
    warnings.push('Adult content detected — age verification and gated access are required.')
  }

  if (confidence < 0.5) {
    warnings.push(
      'Low confidence in category detection. Manual review of the proposed configuration is recommended.',
    )
  }

  if (realtimeNeeded && !pack?.realtimeRequired) {
    warnings.push(
      'Real-time streaming appears needed but the selected pack does not require it by default. Verify infrastructure readiness.',
    )
  }

  // ── Detect capability gaps against proposed config ──
  const capabilityGaps: string[] = []

  if (inferredMultimodalNeeds.includes('video') && !inferredAiNeeds.includes('video')) {
    capabilityGaps.push('video')
  }
  if (inferredMultimodalNeeds.includes('voice') && !inferredAiNeeds.includes('voice')) {
    capabilityGaps.push('voice')
  }
  if (
    inferredMultimodalNeeds.includes('image_generation') &&
    !inferredAiNeeds.includes('image_generation')
  ) {
    capabilityGaps.push('image_generation')
  }

  return {
    name: input.name,
    url: input.url,
    detectedCategory: topCategory,
    detectedFeatures,
    inferredAiNeeds,
    inferredMultimodalNeeds,
    riskLevel: CATEGORY_RISK[topCategory] ?? 'low',
    realtimeNeeded,
    inferredAgentSet,
    proposedConfig: {
      providers,
      models,
      budget,
      capabilityPackId: pack?.id ?? packId,
      safetyMode,
      memoryMode,
      monitoringLevel,
    },
    capabilityGaps,
    warnings,
    confidence,
  }
}

/**
 * Compare the proposed providers and models against what is currently
 * available on the platform and return a list of missing capabilities.
 */
export function detectCapabilityGaps(
  result: AppDiscoveryResult,
  currentProviders: string[],
  currentModels: string[],
): string[] {
  const gaps: string[] = []
  const providerSet = new Set(currentProviders)
  const modelSet = new Set(currentModels)

  for (const provider of result.proposedConfig.providers) {
    if (!providerSet.has(provider)) {
      gaps.push(`Missing provider: ${provider}`)
    }
  }

  for (const model of result.proposedConfig.models) {
    if (!modelSet.has(model)) {
      gaps.push(`Missing model: ${model}`)
    }
  }

  return gaps
}

/**
 * Generate human-readable onboarding recommendations based on the
 * discovery result.
 */
export function generateOnboardingRecommendations(
  result: AppDiscoveryResult,
): string[] {
  const recommendations: string[] = []

  // Provider recommendations
  for (const provider of result.proposedConfig.providers) {
    recommendations.push(`Enable the '${provider}' provider for ${result.detectedCategory} capabilities.`)
  }

  // Model recommendations
  for (const model of result.proposedConfig.models) {
    recommendations.push(`Configure the '${model}' model for optimal ${result.detectedCategory} performance.`)
  }

  // Safety recommendations
  if (result.proposedConfig.safetyMode === 'adult_gated') {
    recommendations.push('Implement age verification (18+) before granting access.')
    recommendations.push('Enable adult content monitoring and compliance reporting.')
  } else if (result.proposedConfig.safetyMode === 'strict') {
    recommendations.push('Enable strict content filtering to protect users.')
  }

  // Memory recommendations
  if (result.proposedConfig.memoryMode === 'full') {
    recommendations.push('Provision persistent memory storage for full conversation history.')
  } else if (result.proposedConfig.memoryMode === 'session') {
    recommendations.push('Configure session-scoped memory — history is cleared between sessions.')
  }

  // Real-time recommendations
  if (result.realtimeNeeded) {
    recommendations.push('Provision WebSocket infrastructure for real-time streaming.')
  }

  // Capability gap recommendations
  for (const gap of result.capabilityGaps) {
    recommendations.push(`Address capability gap: '${gap}' is needed but not included in the current pack.`)
  }

  // Monitoring recommendations
  if (result.proposedConfig.monitoringLevel === 'premium') {
    recommendations.push('Enable premium monitoring with real-time alerting and anomaly detection.')
  }

  // Risk-level recommendations
  if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
    recommendations.push('Schedule a manual security review before going live.')
  }

  // Budget recommendation
  const { daily, monthly } = result.proposedConfig.budget
  recommendations.push(
    `Set budget limits to $${(daily / 100).toFixed(0)}/day and $${(monthly / 100).toFixed(0)}/month.`,
  )

  return recommendations
}
