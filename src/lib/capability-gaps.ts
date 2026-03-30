/**
 * Capability Gap Detection + Admin Alert — AmarktAI Network
 *
 * When an app needs something the brain can't do well enough, this
 * system detects the gap, records it, and generates actionable
 * recommendations for the admin.
 *
 * Flow:
 *   1. analyzeCapabilityGaps() compares required capabilities against
 *      currently-available providers/models.
 *   2. Any missing or under-served capability is recorded as a
 *      CapabilityGap with severity + concrete next-steps.
 *   3. getHighPriorityGaps() / generateGapAlert() surface the most
 *      urgent items so admins can act fast.
 *
 * All state is kept in an in-memory Map keyed by app slug.
 * Server-side only.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CapabilityGap {
  appSlug: string
  capability: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  recommendation: string
  suggestedProviders?: string[]
  suggestedModels?: string[]
  suggestedBudgetChange?: { daily: number; monthly: number }
  detectedAt: Date
}

export interface GapAnalysisResult {
  appSlug: string
  gaps: CapabilityGap[]
  /** 0-1 readiness score — 1 means every required capability is covered. */
  overallReadiness: number
  actionRequired: boolean
}

/* ------------------------------------------------------------------ */
/*  Capability requirement definitions                                 */
/* ------------------------------------------------------------------ */

interface CapabilityRequirement {
  providers: string[]
  models: string[]
}

/**
 * Maps each capability name to the providers / models that can
 * fulfil it.  When none of the listed providers (or models) are
 * available the gap is flagged.
 */
export const CAPABILITY_REQUIREMENTS: Record<string, CapabilityRequirement> = {
  chat:              { providers: ['openai', 'groq', 'deepseek'],   models: ['gpt-4o', 'llama-3.1-70b', 'deepseek-chat'] },
  code:              { providers: ['openai', 'deepseek'],           models: ['gpt-4o', 'deepseek-coder'] },
  image_generation:  { providers: ['openai', 'together'],           models: ['dall-e-3'] },
  video:             { providers: ['openai'],                       models: [] },
  voice:             { providers: ['openai'],                       models: ['tts-1', 'whisper-1'] },
  retrieval:         { providers: ['openai'],                       models: ['text-embedding-3-small'] },
  agents:            { providers: ['openai', 'groq'],               models: ['gpt-4o'] },
  reasoning:         { providers: ['openai', 'deepseek'],           models: ['gpt-4o', 'deepseek-chat'] },
  embeddings:        { providers: ['openai'],                       models: ['text-embedding-3-small'] },
  structured_output: { providers: ['openai', 'groq'],               models: ['gpt-4o'] },
  tool_use:          { providers: ['openai'],                       models: ['gpt-4o'] },
  multilingual:      { providers: ['openai', 'deepseek'],           models: ['gpt-4o'] },
  agent_planning:    { providers: ['openai'],                       models: ['gpt-4o'] },
}

/* ------------------------------------------------------------------ */
/*  Severity + budget heuristics                                       */
/* ------------------------------------------------------------------ */

/** Capabilities whose absence is immediately user-facing. */
const CRITICAL_CAPABILITIES = new Set([
  'chat',
  'voice',
  'agent_planning',
])

/** Capabilities that are important but have workarounds. */
const HIGH_CAPABILITIES = new Set([
  'code',
  'image_generation',
  'retrieval',
  'agents',
  'reasoning',
])

/**
 * Derive a severity level from the capability name and how much of
 * the requirement is actually met (providerCoverage 0-1, modelCoverage 0-1).
 */
function deriveSeverity(
  capability: string,
  providerCoverage: number,
  modelCoverage: number,
): CapabilityGap['severity'] {
  const avgCoverage = (providerCoverage + modelCoverage) / 2

  if (CRITICAL_CAPABILITIES.has(capability) && avgCoverage === 0) return 'critical'
  if (CRITICAL_CAPABILITIES.has(capability))                      return 'high'
  if (HIGH_CAPABILITIES.has(capability) && avgCoverage === 0)     return 'high'
  if (avgCoverage === 0)                                          return 'medium'
  return 'low'
}

/** Rough daily / monthly budget bump suggestions per capability. */
const BUDGET_HINTS: Record<string, { daily: number; monthly: number }> = {
  chat:              { daily: 5,  monthly: 150 },
  code:              { daily: 8,  monthly: 240 },
  image_generation:  { daily: 10, monthly: 300 },
  video:             { daily: 15, monthly: 450 },
  voice:             { daily: 5,  monthly: 150 },
  retrieval:         { daily: 3,  monthly: 90  },
  agents:            { daily: 10, monthly: 300 },
  reasoning:         { daily: 8,  monthly: 240 },
  embeddings:        { daily: 2,  monthly: 60  },
  structured_output: { daily: 3,  monthly: 90  },
  tool_use:          { daily: 5,  monthly: 150 },
  multilingual:      { daily: 5,  monthly: 150 },
  agent_planning:    { daily: 12, monthly: 360 },
}

/* ------------------------------------------------------------------ */
/*  In-memory store                                                    */
/* ------------------------------------------------------------------ */

const gapStore = new Map<string, CapabilityGap[]>()

/* ------------------------------------------------------------------ */
/*  Core analysis                                                      */
/* ------------------------------------------------------------------ */

/**
 * Build a human-readable description explaining why a capability is
 * flagged as a gap.
 */
function buildDescription(
  capability: string,
  missingProviders: string[],
  missingModels: string[],
): string {
  const parts: string[] = []

  if (missingProviders.length > 0) {
    parts.push(
      `Missing provider(s): ${missingProviders.join(', ')}`,
    )
  }
  if (missingModels.length > 0) {
    parts.push(
      `Missing model(s): ${missingModels.join(', ')}`,
    )
  }

  return (
    `Capability "${capability}" is not fully covered. ` +
    parts.join('. ') +
    '.'
  )
}

/**
 * Build a human-readable recommendation string for a detected gap.
 */
function buildRecommendation(
  capability: string,
  missingProviders: string[],
  missingModels: string[],
): string {
  const steps: string[] = []

  if (missingProviders.length > 0) {
    steps.push(
      `Enable or add provider(s): ${missingProviders.join(', ')}`,
    )
  }
  if (missingModels.length > 0) {
    steps.push(
      `Register model(s): ${missingModels.join(', ')}`,
    )
  }

  steps.push(
    `Review the "${capability}" capability configuration in the admin dashboard`,
  )

  return steps.join('. ') + '.'
}

/**
 * Analyse capability gaps for a given app.
 *
 * Compares `requiredCapabilities` against the providers and models
 * that are currently available and records any shortfalls.
 */
export function analyzeCapabilityGaps(
  appSlug: string,
  requiredCapabilities: string[],
  availableProviders: string[],
  availableModels: string[],
): GapAnalysisResult {
  const gaps: CapabilityGap[] = []
  const providerSet = new Set(availableProviders.map((p) => p.toLowerCase()))
  const modelSet    = new Set(availableModels.map((m) => m.toLowerCase()))

  for (const capability of requiredCapabilities) {
    const req = CAPABILITY_REQUIREMENTS[capability]
    if (!req) continue // unknown capability — nothing to check

    const missingProviders = req.providers.filter(
      (p) => !providerSet.has(p.toLowerCase()),
    )
    const missingModels = req.models.filter(
      (m) => !modelSet.has(m.toLowerCase()),
    )

    // If everything required is present there is no gap
    if (missingProviders.length === 0 && missingModels.length === 0) continue

    const providerCoverage =
      req.providers.length === 0
        ? 1
        : 1 - missingProviders.length / req.providers.length
    const modelCoverage =
      req.models.length === 0
        ? 1
        : 1 - missingModels.length / req.models.length

    const severity = deriveSeverity(capability, providerCoverage, modelCoverage)

    const gap: CapabilityGap = {
      appSlug,
      capability,
      severity,
      description: buildDescription(capability, missingProviders, missingModels),
      recommendation: buildRecommendation(capability, missingProviders, missingModels),
      suggestedProviders: missingProviders.length > 0 ? missingProviders : undefined,
      suggestedModels: missingModels.length > 0 ? missingModels : undefined,
      suggestedBudgetChange: BUDGET_HINTS[capability],
      detectedAt: new Date(),
    }

    gaps.push(gap)
  }

  // Persist into the in-memory store
  gapStore.set(appSlug, gaps)

  const overallReadiness =
    requiredCapabilities.length === 0
      ? 1
      : 1 - gaps.length / requiredCapabilities.length

  return {
    appSlug,
    gaps,
    overallReadiness: Math.max(0, Math.min(1, overallReadiness)),
    actionRequired: gaps.some(
      (g) => g.severity === 'high' || g.severity === 'critical',
    ),
  }
}

/* ------------------------------------------------------------------ */
/*  Store accessors                                                    */
/* ------------------------------------------------------------------ */

/** Return all gaps currently recorded for a given app. */
export function getGapsForApp(appSlug: string): CapabilityGap[] {
  return gapStore.get(appSlug) ?? []
}

/** Return the full gap store (all apps). */
export function getAllGaps(): Map<string, CapabilityGap[]> {
  return gapStore
}

/** Clear stored gaps for a given app. */
export function clearGaps(appSlug: string): void {
  gapStore.delete(appSlug)
}

/**
 * Return every gap whose severity is `high` or `critical`, across
 * all tracked apps.
 */
export function getHighPriorityGaps(): CapabilityGap[] {
  const result: CapabilityGap[] = []
  Array.from(gapStore.values()).forEach((gaps) => {
    gaps.forEach((gap) => {
      if (gap.severity === 'high' || gap.severity === 'critical') {
        result.push(gap)
      }
    })
  })
  return result
}

/* ------------------------------------------------------------------ */
/*  Alert generation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Generate a structured admin alert for a single capability gap.
 * The returned object can be used to render a notification card,
 * send an email, or post to a webhook.
 */
export function generateGapAlert(gap: CapabilityGap): {
  title: string
  body: string
  actions: string[]
} {
  const severityLabel = gap.severity.toUpperCase()
  const title = `[${severityLabel}] Capability gap: "${gap.capability}" for app "${gap.appSlug}"`

  const bodyLines: string[] = [
    gap.description,
    '',
    `Severity : ${severityLabel}`,
    `Detected : ${gap.detectedAt.toISOString()}`,
    '',
    `Recommendation: ${gap.recommendation}`,
  ]

  if (gap.suggestedBudgetChange) {
    bodyLines.push(
      '',
      `Suggested budget increase — daily: $${gap.suggestedBudgetChange.daily}, monthly: $${gap.suggestedBudgetChange.monthly}`,
    )
  }

  const actions: string[] = []

  if (gap.suggestedProviders && gap.suggestedProviders.length > 0) {
    actions.push(
      `Enable provider(s): ${gap.suggestedProviders.join(', ')}`,
    )
  }
  if (gap.suggestedModels && gap.suggestedModels.length > 0) {
    actions.push(
      `Register model(s): ${gap.suggestedModels.join(', ')}`,
    )
  }
  actions.push('Review capability configuration in the admin dashboard')

  return { title, body: bodyLines.join('\n'), actions }
}
