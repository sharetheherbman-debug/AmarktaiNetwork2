/**
 * Tests for the Phase-2 expansion modules:
 *   - routing-profiles
 *   - music-studio
 *   - monetization-engine
 *   - model-registry (music category additions)
 *   - app-profiles (routing_profile field)
 *   - dashboard-truth (new capability entries)
 */

import { describe, it, expect } from 'vitest'

// ── Routing Profiles ─────────────────────────────────────────────────────────

import {
  getAllRoutingProfiles,
  getRoutingProfile,
  buildFallbackChain,
  profileToRoutingOverrides,
  shouldRetry,
} from '../routing-profiles'

describe('Routing Profiles', () => {
  it('returns all 4 profiles', () => {
    const profiles = getAllRoutingProfiles()
    expect(profiles).toHaveLength(4)
    const ids = profiles.map((p) => p.id)
    expect(ids).toContain('low_cost')
    expect(ids).toContain('balanced')
    expect(ids).toContain('premium')
    expect(ids).toContain('ultra_resilient')
  })

  it('defaults to balanced when id is missing', () => {
    expect(getRoutingProfile().id).toBe('balanced')
    expect(getRoutingProfile(undefined).id).toBe('balanced')
    expect(getRoutingProfile('nonexistent').id).toBe('balanced')
  })

  it('low_cost profile has correct cost ceiling', () => {
    const p = getRoutingProfile('low_cost')
    expect(p.maxCostTier).toBe('low')
    expect(p.distributeLoad).toBe(true)
  })

  it('ultra_resilient profile distributes load and auto-fallthroughs', () => {
    const p = getRoutingProfile('ultra_resilient')
    expect(p.distributeLoad).toBe(true)
    expect(p.autoFallthrough).toBe(true)
    expect(p.providerTiers.length).toBeGreaterThanOrEqual(6)
  })

  it('premium profile allows premium cost tier', () => {
    const p = getRoutingProfile('premium')
    expect(p.maxCostTier).toBe('premium')
    expect(p.retryPolicy.maxRetries).toBeGreaterThanOrEqual(3)
  })

  it('buildFallbackChain returns primary → fallback → emergency order', () => {
    const p = getRoutingProfile('balanced')
    const chain = buildFallbackChain(p)
    expect(chain.length).toBeGreaterThan(0)
    // Primary providers come first
    const primaryProviders = p.providerTiers.filter((t) => t.tier === 'primary').map((t) => t.provider)
    for (const pp of primaryProviders) {
      const ppIdx = chain.indexOf(pp)
      const emergencyProviders = p.providerTiers.filter((t) => t.tier === 'emergency').map((t) => t.provider)
      for (const ep of emergencyProviders) {
        expect(ppIdx).toBeLessThan(chain.indexOf(ep))
      }
    }
  })

  it('profileToRoutingOverrides returns maxCostTier and maxLatencyTier', () => {
    const p = getRoutingProfile('premium')
    const overrides = profileToRoutingOverrides(p)
    expect(overrides).toHaveProperty('maxCostTier', 'premium')
    expect(overrides).toHaveProperty('maxLatencyTier')
  })

  it('shouldRetry returns false when attempt >= maxRetries', () => {
    const p = getRoutingProfile('balanced')
    const decision = shouldRetry(p.retryPolicy, {
      attempt: p.retryPolicy.maxRetries,
      lastErrorMessage: 'timeout',
      providerKey: 'openai',
    })
    expect(decision.shouldRetry).toBe(false)
  })

  it('shouldRetry returns true with positive delay for attempt < maxRetries', () => {
    const p = getRoutingProfile('balanced')
    const decision = shouldRetry(p.retryPolicy, {
      attempt: 0,
      lastErrorMessage: null,
      providerKey: 'openai',
    })
    expect(decision.shouldRetry).toBe(true)
    expect(decision.delayMs).toBeGreaterThan(0)
  })

  it('shouldRetry applies exponential backoff correctly', () => {
    const p = getRoutingProfile('balanced')
    const d0 = shouldRetry(p.retryPolicy, { attempt: 0, lastErrorMessage: null, providerKey: 'openai' })
    const d1 = shouldRetry(p.retryPolicy, { attempt: 1, lastErrorMessage: null, providerKey: 'openai' })
    // With backoffMultiplier > 1, d1 should be larger (until capped at maxDelayMs)
    expect(d1.delayMs).toBeGreaterThanOrEqual(d0.delayMs)
  })
})

// ── Music Studio ─────────────────────────────────────────────────────────────

import {
  parseLyricsOutput,
  buildLyricsPrompt,
  getMusicStudioStatus,
  getMusicStudioSummary,
  getMusicArtifact,
  AVAILABLE_GENRES,
  AVAILABLE_VOCAL_STYLES,
  type MusicCreationRequest,
} from '../music-studio'

describe('Music Studio', () => {
  const baseRequest: MusicCreationRequest = {
    appSlug: 'test-app',
    theme: 'hope and resilience',
    genre: 'gospel',
    vocalStyle: 'choir',
    durationSeconds: 180,
    generateCoverArt: false,
  }

  it('buildLyricsPrompt contains genre and theme', () => {
    const prompt = buildLyricsPrompt(baseRequest)
    expect(prompt).toContain('Gospel')
    expect(prompt).toContain('hope and resilience')
    expect(prompt).toContain('choir')
  })

  it('parseLyricsOutput creates a valid LyricsResult', () => {
    const raw = `TITLE: Hope Rises

STRUCTURE:
[Intro] (12s)
[Verse 1] (30s)
[Chorus] (24s)

LYRICS:
[Intro]
(Instrumental)

[Verse 1]
In the morning light we rise,
Lifted by the song inside.

[Chorus]
Hope rises, hope rises,
Carrying us through the night.

PRODUCTION NOTES:
Gospel organ, choir harmonies, uplifting key change in bridge.`

    const result = parseLyricsOutput(raw, baseRequest, 'gpt-4o')
    expect(result.title).toBe('Hope Rises')
    expect(result.genre).toBe('gospel')
    expect(result.vocalStyle).toBe('choir')
    expect(result.lyrics).toBeTruthy()
    expect(result.structure.sections.length).toBeGreaterThan(0)
    expect(result.model).toBe('gpt-4o')
    expect(result.id).toBeTruthy()
  })

  it('parseLyricsOutput auto-generates title from theme when not in output', () => {
    const result = parseLyricsOutput('some lyrics without title marker', baseRequest, 'gpt-4o')
    expect(result.title).toContain('hope and resilience')
  })

  it('AVAILABLE_GENRES includes all required genres', () => {
    const ids = AVAILABLE_GENRES.map((g) => g.id)
    expect(ids).toContain('pop')
    expect(ids).toContain('gospel')
    expect(ids).toContain('amapiano')
    expect(ids).toContain('edm')
    expect(ids).toContain('worship')
    expect(ids).toContain('afrobeats')
    expect(ids).toContain('cinematic')
  })

  it('AVAILABLE_VOCAL_STYLES includes instrumental_only', () => {
    const ids = AVAILABLE_VOCAL_STYLES.map((s) => s.id)
    expect(ids).toContain('instrumental_only')
    expect(ids).toContain('choir')
    expect(ids).toContain('rap')
  })

  it('getMusicStudioStatus returns a valid status object', () => {
    const status = getMusicStudioStatus()
    expect(['available', 'needs_key']).toContain(status.lyricsGeneration)
    expect(['available', 'needs_key']).toContain(status.audioGeneration)
    expect(['available', 'needs_key']).toContain(status.coverArtGeneration)
    expect(status.message).toBeTruthy()
  })

  it('getMusicStudioSummary returns valid summary before any artifacts', () => {
    const summary = getMusicStudioSummary()
    expect(typeof summary.totalCreated).toBe('number')
    expect(typeof summary.byGenre).toBe('object')
    expect(typeof summary.byAppSlug).toBe('object')
  })

  it('getMusicArtifact returns undefined for unknown id', () => {
    expect(getMusicArtifact('nonexistent')).toBeUndefined()
  })
})

// ── Monetization Engine ──────────────────────────────────────────────────────

import {
  trackUsage,
  recordRevenue,
  upsertSubscription,
  getSubscription,
  isWithinGenerationLimit,
  getAppRevenueSummary,
  getPlatformMonetizationSummary,
  recordPipelineRun,
  getPipelineHistory,
  getAllTiers,
  estimateCost,
} from '../monetization-engine'

describe('Monetization Engine', () => {
  const testApp = 'monetization-test-app'

  it('getAllTiers returns all 4 tiers', () => {
    const tiers = getAllTiers()
    expect(tiers).toHaveLength(4)
    const ids = tiers.map((t) => t.id)
    expect(ids).toContain('free')
    expect(ids).toContain('starter')
    expect(ids).toContain('pro')
    expect(ids).toContain('enterprise')
  })

  it('each tier has correct pricing structure', () => {
    const tiers = getAllTiers()
    const free = tiers.find((t) => t.id === 'free')!
    const pro = tiers.find((t) => t.id === 'pro')!
    expect(free.priceUsdCents).toBe(0)
    expect(pro.priceUsdCents).toBeGreaterThan(0)
    expect(pro.limits.premiumModels).toBe(true)
    expect(free.limits.premiumModels).toBe(false)
  })

  it('estimateCost uses token pricing for GPT models', () => {
    // Use large enough token counts so the result is non-zero after rounding
    const cost = estimateCost('chat', 'gpt-4o', 5000, 2000)
    expect(cost).toBeGreaterThan(0)
  })

  it('estimateCost uses flat pricing for image/music', () => {
    const imageCost = estimateCost('image', 'dall-e-3', 0, 0)
    const musicCost = estimateCost('music', 'suno-v3.5', 0, 0)
    expect(imageCost).toBeGreaterThan(0)
    expect(musicCost).toBeGreaterThan(0)
  })

  it('trackUsage creates a valid event with auto-calculated cost', () => {
    const event = trackUsage({
      appSlug: testApp,
      type: 'chat',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 500,
      outputTokens: 200,
      success: true,
    })
    expect(event.id).toBeTruthy()
    expect(event.timestamp).toBeTruthy()
    expect(event.costUsdCents).toBeGreaterThanOrEqual(0)
    expect(event.appSlug).toBe(testApp)
  })

  it('recordRevenue creates a valid revenue event', () => {
    const event = recordRevenue({
      appSlug: testApp,
      type: 'usage_charge',
      amountUsdCents: 499,
      description: 'Premium feature usage',
    })
    expect(event.id).toBeTruthy()
    expect(event.amountUsdCents).toBe(499)
  })

  it('upsertSubscription creates subscription with correct tier limits', () => {
    const sub = upsertSubscription(testApp, 'pro')
    expect(sub.tier).toBe('pro')
    expect(sub.limits.premiumModels).toBe(true)
    expect(sub.limits.autonomousAgents).toBe(true)
    expect(sub.renewsAt).toBeTruthy()
  })

  it('getSubscription retrieves the correct subscription', () => {
    const sub = getSubscription(testApp)
    expect(sub).not.toBeNull()
    expect(sub?.tier).toBe('pro')
  })

  it('isWithinGenerationLimit returns true for fresh app', () => {
    const within = isWithinGenerationLimit('brand-new-app', 'chat')
    expect(within).toBe(true)
  })

  it('getAppRevenueSummary returns correct structure', () => {
    const summary = getAppRevenueSummary(testApp)
    expect(summary.appSlug).toBe(testApp)
    expect(typeof summary.totalUsageEvents).toBe('number')
    expect(typeof summary.totalCostUsdCents).toBe('number')
    expect(typeof summary.totalRevenueUsdCents).toBe('number')
    expect(summary.totalUsageEvents).toBeGreaterThan(0)
  })

  it('getPlatformMonetizationSummary returns valid summary', () => {
    const summary = getPlatformMonetizationSummary()
    expect(typeof summary.totalUsageEvents).toBe('number')
    expect(typeof summary.totalRevenueUsdCents).toBe('number')
    expect(typeof summary.byTier).toBe('object')
    expect(summary.activeSubscriptions).toBeGreaterThanOrEqual(1)
  })

  it('recordPipelineRun and getPipelineHistory work correctly', () => {
    const pipelineApp = 'pipeline-test-app'
    recordPipelineRun({
      appSlug: pipelineApp,
      pipelineType: 'daily_summary',
      itemsGenerated: 5,
      costUsdCents: 15,
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
    const history = getPipelineHistory(pipelineApp)
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].pipelineType).toBe('daily_summary')
    expect(history[0].itemsGenerated).toBe(5)
  })
})

// ── Model Registry — Music Models ────────────────────────────────────────────

import { getModelRegistry } from '../model-registry'

describe('Model Registry — Music category', () => {
  it('includes suno-v3.5, musicgen-melody, udio-v1', () => {
    const all = getModelRegistry()
    const musicModels = all.filter((m) => m.category === 'music')
    expect(musicModels.length).toBeGreaterThanOrEqual(3)
    const ids = musicModels.map((m) => m.model_id)
    expect(ids).toContain('suno-v3.5')
    expect(ids).toContain('musicgen-melody')
    expect(ids).toContain('udio-v1')
  })

  it('music models have supports_music_generation flag', () => {
    const all = getModelRegistry()
    const musicModels = all.filter((m) => m.category === 'music')
    for (const m of musicModels) {
      expect(m.supports_music_generation).toBe(true)
    }
  })
})

// ── App Profiles — routing_profile field ────────────────────────────────────

import { getAppProfile } from '../app-profiles'

describe('App Profiles — routing_profile field', () => {
  it('default profile does not error when routing_profile is undefined', () => {
    const profile = getAppProfile('default')
    // routing_profile is optional; accessing it should not throw
    expect(profile.routing_profile === undefined || typeof profile.routing_profile === 'string').toBe(true)
  })
})

// ── Dashboard Truth — new capabilities ──────────────────────────────────────

import { CAP_TO_MODEL_FLAG } from '../dashboard-truth'

describe('Dashboard Truth — new capability entries', () => {
  it('includes music_generation capability', () => {
    expect(Object.prototype.hasOwnProperty.call(CAP_TO_MODEL_FLAG, 'music_generation')).toBe(true)
  })

  it('includes lyrics_generation capability', () => {
    expect(Object.prototype.hasOwnProperty.call(CAP_TO_MODEL_FLAG, 'lyrics_generation')).toBe(true)
  })

  it('includes music_cover_art capability', () => {
    expect(Object.prototype.hasOwnProperty.call(CAP_TO_MODEL_FLAG, 'music_cover_art')).toBe(true)
  })

  it('includes monetization capability', () => {
    expect(Object.prototype.hasOwnProperty.call(CAP_TO_MODEL_FLAG, 'monetization')).toBe(true)
  })

  it('includes usage_analytics capability', () => {
    expect(Object.prototype.hasOwnProperty.call(CAP_TO_MODEL_FLAG, 'usage_analytics')).toBe(true)
  })
})
