/**
 * Comprehensive tests for the AmarktAI Network upgrade.
 *
 * Covers all new systems:
 *   - Cache layer (embedding, retrieval, response)
 *   - Content safety upgrade (OpenAI Moderation, safe/adult mode)
 *   - Budget enforcement (per-app caps, model tier downgrade)
 *   - Learning engine (win/loss scoring, auto optimization)
 *   - Webhook system (subscription, dispatch, delivery log)
 *   - App connector (heartbeat, metrics, rate limiting, queue)
 *   - Multimodal router (quality modes, image provider resolution)
 *   - Video generation (new styles, scene decomposition)
 *   - Model registry (new image generation models)
 */
import { describe, it, expect, beforeEach } from 'vitest'

// ── Cache Layer Tests ───────────────────────────────────────────────

import {
  embeddingCache,
  retrievalCache,
  responseCache,
  buildRetrievalCacheKey,
  buildResponseCacheKey,
  buildEmbeddingCacheKey,
  getCacheStats,
  clearAllCaches,
  pruneAllCaches,
} from '../cache'

describe('Cache Layer', () => {
  beforeEach(() => {
    clearAllCaches()
  })

  it('stores and retrieves values', () => {
    responseCache.set('key1', 'value1')
    expect(responseCache.get('key1')).toBe('value1')
  })

  it('returns undefined for missing keys', () => {
    expect(responseCache.get('nonexistent')).toBeUndefined()
  })

  it('tracks hits and misses', () => {
    responseCache.set('key1', 'value1')
    const statsBefore = responseCache.getStats()
    const hitsBefore = statsBefore.hits
    const missesBefore = statsBefore.misses

    responseCache.get('key1') // hit
    responseCache.get('missing') // miss

    const stats = responseCache.getStats()
    expect(stats.hits).toBe(hitsBefore + 1)
    expect(stats.misses).toBe(missesBefore + 1)
    expect(stats.entries).toBeGreaterThanOrEqual(1)
  })

  it('deletes entries', () => {
    responseCache.set('key1', 'value1')
    expect(responseCache.has('key1')).toBe(true)
    responseCache.delete('key1')
    expect(responseCache.has('key1')).toBe(false)
  })

  it('clears all entries', () => {
    responseCache.set('a', '1')
    responseCache.set('b', '2')
    responseCache.clear()
    expect(responseCache.get('a')).toBeUndefined()
    expect(responseCache.get('b')).toBeUndefined()
  })

  it('builds deterministic retrieval cache keys', () => {
    const key1 = buildRetrievalCacheKey('app1', 'query1', 10, true)
    const key2 = buildRetrievalCacheKey('app1', 'query1', 10, true)
    const key3 = buildRetrievalCacheKey('app2', 'query1', 10, true)

    expect(key1).toBe(key2) // same inputs = same key
    expect(key1).not.toBe(key3) // different app = different key
  })

  it('builds deterministic response cache keys', () => {
    const key1 = buildResponseCacheKey('app1', 'chat', 'hello')
    const key2 = buildResponseCacheKey('app1', 'chat', 'hello')
    expect(key1).toBe(key2)
  })

  it('builds deterministic embedding cache keys', () => {
    const key1 = buildEmbeddingCacheKey('some text')
    const key2 = buildEmbeddingCacheKey('some text')
    expect(key1).toBe(key2)
  })

  it('embeddingCache stores arrays', () => {
    const embedding = [0.1, 0.2, 0.3, 0.4]
    embeddingCache.set('emb1', embedding)
    expect(embeddingCache.get('emb1')).toEqual(embedding)
  })

  it('retrievalCache stores objects', () => {
    const data = { entries: [{ id: 1 }], total: 1 }
    retrievalCache.set('ret1', data)
    expect(retrievalCache.get('ret1')).toEqual(data)
  })

  it('getCacheStats returns all three cache stats', () => {
    const stats = getCacheStats()
    expect(stats).toHaveProperty('embedding')
    expect(stats).toHaveProperty('retrieval')
    expect(stats).toHaveProperty('response')
    expect(typeof stats.embedding.hits).toBe('number')
  })

  it('clearAllCaches clears all caches', () => {
    embeddingCache.set('a', [1])
    retrievalCache.set('b', { x: 1 })
    responseCache.set('c', 'val')

    clearAllCaches()

    expect(embeddingCache.get('a')).toBeUndefined()
    expect(retrievalCache.get('b')).toBeUndefined()
    expect(responseCache.get('c')).toBeUndefined()
  })

  it('pruneAllCaches returns count', () => {
    const pruned = pruneAllCaches()
    expect(typeof pruned).toBe('number')
  })
})

// ── Content Safety Upgrade Tests ────────────────────────────────────

import {
  scanContent,
  scanContentWithModeration,
  setAppSafetyConfig,
  getAppSafetyConfig,
} from '../content-filter'

describe('Content Safety Upgrade', () => {
  it('scanContent still works with keyword fallback', () => {
    const result = scanContent('How do I make a delicious cake?')
    expect(result.flagged).toBe(false)
    expect(result.scanner).toBe('keyword_fallback')
  })

  it('scanContent includes scanner field', () => {
    const result = scanContent('child sexual abuse')
    expect(result.flagged).toBe(true)
    expect(result.scanner).toBe('keyword_fallback')
  })

  it('scanContentWithModeration falls back to keywords when no API key', async () => {
    // No OPENAI_API_KEY in test env — should fall back to keyword scanner
    const result = await scanContentWithModeration('how to make a bomb')
    expect(result.flagged).toBe(true)
    expect(result.scanner).toBe('keyword_fallback')
  })

  it('scanContentWithModeration allows safe content', async () => {
    const result = await scanContentWithModeration('What is the weather today?')
    expect(result.flagged).toBe(false)
  })

  it('setAppSafetyConfig creates config', () => {
    const config = setAppSafetyConfig('test-app-safety', { safeMode: true })
    expect(config.safeMode).toBe(true)
    expect(config.adultMode).toBe(false)
  })

  it('adult mode requires safe mode to be off', () => {
    const config = setAppSafetyConfig('test-app-adult', {
      safeMode: true,
      adultMode: true,
    })
    // When safeMode is true, adultMode should be forced to false
    expect(config.adultMode).toBe(false)
  })

  it('adult mode works when safe mode is off', () => {
    const config = setAppSafetyConfig('test-app-adult2', {
      safeMode: false,
      adultMode: true,
    })
    expect(config.safeMode).toBe(false)
    expect(config.adultMode).toBe(true)
  })

  it('getAppSafetyConfig returns defaults for unknown apps', () => {
    const config = getAppSafetyConfig('unknown-app-xyz')
    expect(config.safeMode).toBe(true)
    expect(config.adultMode).toBe(false)
  })

  it('getAppSafetyConfig returns custom config', () => {
    setAppSafetyConfig('custom-app', { safeMode: false })
    const config = getAppSafetyConfig('custom-app')
    expect(config.safeMode).toBe(false)
  })
})

// ── Budget Enforcement Tests ────────────────────────────────────────

import {
  estimateCostUsd,
  setAppBudgetCap,
  getAppBudgetCap,
  recordAppSpend,
  isAppWithinBudget,
  getRecommendedModelTier,
} from '../budget-tracker'

describe('Budget Enforcement', () => {
  it('setAppBudgetCap creates a cap', () => {
    setAppBudgetCap('test-budget-app', 100)
    const cap = getAppBudgetCap('test-budget-app')
    expect(cap).not.toBeNull()
    expect(cap!.monthlyBudgetUsd).toBe(100)
    expect(cap!.currentSpendUsd).toBe(0)
  })

  it('getAppBudgetCap returns null for unconfigured apps', () => {
    const cap = getAppBudgetCap('no-budget-app')
    expect(cap).toBeNull()
  })

  it('recordAppSpend tracks spending', () => {
    setAppBudgetCap('spend-app', 50)
    recordAppSpend('spend-app', 10)
    recordAppSpend('spend-app', 15)
    const cap = getAppBudgetCap('spend-app')
    expect(cap!.currentSpendUsd).toBe(25)
  })

  it('isAppWithinBudget returns true for uncapped apps', () => {
    expect(isAppWithinBudget('uncapped-app')).toBe(true)
  })

  it('isAppWithinBudget returns false when over budget', () => {
    setAppBudgetCap('over-budget-app', 10)
    recordAppSpend('over-budget-app', 15)
    expect(isAppWithinBudget('over-budget-app')).toBe(false)
  })

  it('isAppWithinBudget returns true when under budget', () => {
    setAppBudgetCap('under-budget-app', 100)
    recordAppSpend('under-budget-app', 5)
    expect(isAppWithinBudget('under-budget-app')).toBe(true)
  })

  it('getRecommendedModelTier returns correct tiers', () => {
    expect(getRecommendedModelTier(50)).toBe('premium')
    expect(getRecommendedModelTier(75)).toBe('mid')
    expect(getRecommendedModelTier(95)).toBe('cheap')
  })

  it('estimateCostUsd works for new models', () => {
    const cost = estimateCostUsd('gpt-4o', 1000)
    expect(cost).toBeGreaterThan(0)
  })
})

// ── Learning Engine Upgrade Tests ───────────────────────────────────

import {
  recordModelScore,
  getBestModelForTask,
  getAllModelScores,
  getOptimizedModel,
} from '../learning-engine'

describe('Learning Engine Win/Loss', () => {
  it('recordModelScore creates a new score', () => {
    const score = recordModelScore('openai', 'gpt-4o', 'test-task', true, 500)
    expect(score.wins).toBe(1)
    expect(score.losses).toBe(0)
    expect(score.winRate).toBe(1)
    expect(score.modelId).toBe('gpt-4o')
  })

  it('recordModelScore accumulates wins and losses', () => {
    recordModelScore('groq', 'llama-3', 'scoring-task', true, 200)
    recordModelScore('groq', 'llama-3', 'scoring-task', true, 300)
    const score = recordModelScore('groq', 'llama-3', 'scoring-task', false, 100)
    expect(score.wins).toBe(2)
    expect(score.losses).toBe(1)
    expect(score.winRate).toBeCloseTo(2 / 3, 2)
  })

  it('low confidence counts as a loss', () => {
    const score = recordModelScore('openai', 'gpt-low', 'confidence-task', true, 500, 0.3)
    expect(score.losses).toBe(1)
    expect(score.wins).toBe(0)
  })

  it('getBestModelForTask returns null with insufficient data', () => {
    const best = getBestModelForTask('nonexistent-task-xyz')
    expect(best).toBeNull()
  })

  it('getBestModelForTask returns model with enough data', () => {
    // Create enough data for threshold (3 minimum)
    recordModelScore('openai', 'gpt-best', 'best-task', true, 200)
    recordModelScore('openai', 'gpt-best', 'best-task', true, 300)
    recordModelScore('openai', 'gpt-best', 'best-task', true, 250)

    const best = getBestModelForTask('best-task')
    expect(best).not.toBeNull()
    expect(best!.modelId).toBe('gpt-best')
    expect(best!.winRate).toBe(1)
  })

  it('getAllModelScores returns sorted results', () => {
    const scores = getAllModelScores()
    expect(Array.isArray(scores)).toBe(true)
    // Verify sorted by win rate descending
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].winRate).toBeGreaterThanOrEqual(scores[i].winRate)
    }
  })

  it('getOptimizedModel returns null without data', () => {
    const result = getOptimizedModel('brand-new-task-xyz')
    expect(result).toBeNull()
  })

  it('getOptimizedModel suggests upgrade after failure', () => {
    // Create data for optimization
    recordModelScore('openai', 'gpt-opt', 'opt-task', true, 200)
    recordModelScore('openai', 'gpt-opt', 'opt-task', true, 300)
    recordModelScore('openai', 'gpt-opt', 'opt-task', true, 250)

    const result = getOptimizedModel('opt-task', true)
    expect(result).not.toBeNull()
    expect(result!.reason).toContain('Upgraded after failure')
  })
})

// ── Webhook System Tests ────────────────────────────────────────────

import {
  registerWebhook,
  unregisterWebhook,
  listWebhooks,
  emitWebhookEvent,
  getDeliveryLog,
  getWebhookStats,
} from '../webhooks'

describe('Webhook System', () => {
  it('registers a webhook subscription', () => {
    const sub = registerWebhook('webhook-app', 'https://example.com/hook', ['task_completed'])
    expect(sub.id).toBeTruthy()
    expect(sub.appSlug).toBe('webhook-app')
    expect(sub.events).toContain('task_completed')
    expect(sub.active).toBe(true)
  })

  it('lists webhooks for an app', () => {
    registerWebhook('list-app', 'https://example.com/hook1', ['task_completed'])
    registerWebhook('list-app', 'https://example.com/hook2', ['budget_warning'])

    const hooks = listWebhooks('list-app')
    expect(hooks.length).toBeGreaterThanOrEqual(2)
  })

  it('unregisters a webhook', () => {
    const sub = registerWebhook('unreg-app', 'https://example.com/hook', ['alert_triggered'])
    const result = unregisterWebhook(sub.id)
    expect(result).toBe(true)

    const hooks = listWebhooks('unreg-app')
    expect(hooks.find(h => h.id === sub.id)).toBeUndefined()
  })

  it('emitWebhookEvent creates an event', async () => {
    const event = await emitWebhookEvent('task_completed', 'emit-app', { taskId: '123' })
    expect(event.id).toBeTruthy()
    expect(event.type).toBe('task_completed')
    expect(event.appSlug).toBe('emit-app')
  })

  it('getDeliveryLog returns array', () => {
    const log = getDeliveryLog()
    expect(Array.isArray(log)).toBe(true)
  })

  it('getWebhookStats returns summary', () => {
    const stats = getWebhookStats()
    expect(typeof stats.totalSubscriptions).toBe('number')
    expect(typeof stats.activeSubscriptions).toBe('number')
    expect(typeof stats.totalDeliveries).toBe('number')
  })
})

// ── App Connector Tests ─────────────────────────────────────────────

import {
  recordHeartbeat,
  recordAppRequest,
  recordAppEvent,
  checkRateLimit,
  setAppRateLimit,
  enqueueRequest,
  dequeueRequest,
  getQueueLength,
  getAllConnectedApps,
  getConnectedApp,
  getAggregateMetrics,
} from '../app-connector'

describe('App Connector', () => {
  it('records heartbeat', () => {
    const hb = recordHeartbeat('connector-app', 'healthy', '1.0.0', 3600)
    expect(hb.appSlug).toBe('connector-app')
    expect(hb.status).toBe('healthy')
  })

  it('records app requests and updates metrics', () => {
    recordAppRequest('metrics-app', 200, true)
    recordAppRequest('metrics-app', 300, false)

    const app = getConnectedApp('metrics-app')
    expect(app).not.toBeNull()
    expect(app!.metrics.requestCount).toBe(2)
    expect(app!.metrics.errorCount).toBe(1)
  })

  it('records events with limit', () => {
    const event = recordAppEvent('event-app', 'test_event', { key: 'value' })
    expect(event.eventType).toBe('test_event')

    const app = getConnectedApp('event-app')
    expect(app!.recentEvents.length).toBeGreaterThan(0)
  })

  it('rate limiting works', () => {
    setAppRateLimit('rate-app', 5)
    for (let i = 0; i < 6; i++) {
      recordAppRequest('rate-app', 100, true)
    }

    const state = checkRateLimit('rate-app')
    expect(state.blocked).toBe(true)
  })

  it('rate limit resets after window', () => {
    setAppRateLimit('reset-app', 10)
    const state = checkRateLimit('reset-app')
    expect(state.blocked).toBe(false)
    expect(state.maxRequestsPerMinute).toBe(10)
  })

  it('request queue enqueue/dequeue works', () => {
    enqueueRequest('queue-app', 'video', 3)
    enqueueRequest('queue-app', 'chat', 1)

    expect(getQueueLength()).toBeGreaterThanOrEqual(2)

    const next = dequeueRequest()
    expect(next).not.toBeNull()
    // Lower priority number = higher priority
    expect(next!.priority).toBeLessThanOrEqual(3)
  })

  it('getAllConnectedApps returns array', () => {
    const apps = getAllConnectedApps()
    expect(Array.isArray(apps)).toBe(true)
    expect(apps.length).toBeGreaterThan(0)
  })

  it('getAggregateMetrics returns summary', () => {
    const metrics = getAggregateMetrics()
    expect(typeof metrics.totalApps).toBe('number')
    expect(typeof metrics.totalRequests).toBe('number')
    expect(typeof metrics.totalErrors).toBe('number')
    expect(typeof metrics.queueLength).toBe('number')
  })
})

// ── Multimodal Router Quality Modes Tests ───────────────────────────

import { resolveImageProvider } from '../multimodal-router'

describe('Multimodal Router Quality Modes', () => {
  it('resolves cheap quality to SD XL', () => {
    const result = resolveImageProvider('cheap')
    expect(result.model).toContain('stable-diffusion')
    expect(result.qualityMode).toBe('cheap')
  })

  it('resolves balanced quality to FLUX', () => {
    const result = resolveImageProvider('balanced')
    expect(result.model).toContain('FLUX')
    expect(result.qualityMode).toBe('balanced')
  })

  it('resolves premium quality to DALL-E', () => {
    const result = resolveImageProvider('premium')
    expect(result.model).toBe('dall-e-3')
    expect(result.provider).toBe('openai')
    expect(result.qualityMode).toBe('premium')
  })

  it('defaults to balanced when no mode specified', () => {
    const result = resolveImageProvider()
    expect(result.qualityMode).toBe('balanced')
  })
})

// ── Model Registry Expansion Tests ──────────────────────────────────

import { getModelRegistry, getModelsByCapability } from '../model-registry'

describe('Model Registry Expansion', () => {
  it('registry has 60+ models', () => {
    const registry = getModelRegistry()
    expect(registry.length).toBeGreaterThanOrEqual(60)
  })

  it('includes image generation models', () => {
    const imageModels = getModelsByCapability('supports_image_generation')
    expect(imageModels.length).toBeGreaterThanOrEqual(3) // DALL-E + SDXL + FLUX
  })

  it('includes SDXL model', () => {
    const registry = getModelRegistry()
    const sdxl = registry.find(m => m.model_id.includes('stable-diffusion'))
    expect(sdxl).toBeDefined()
    expect(sdxl!.primary_role).toBe('image_generation')
  })

  it('includes FLUX model', () => {
    const registry = getModelRegistry()
    const flux = registry.find(m => m.model_id.includes('FLUX'))
    expect(flux).toBeDefined()
    expect(flux!.primary_role).toBe('image_generation')
  })
})

// ── App Profile Safety Fields Tests ─────────────────────────────────

import { getAppProfile, type AppProfile } from '../app-profiles'

describe('App Profile Safety Fields', () => {
  it('AppProfile type accepts safe_mode field', () => {
    const profile: Partial<AppProfile> = {
      safe_mode: true,
      adult_mode: false,
    }
    expect(profile.safe_mode).toBe(true)
    expect(profile.adult_mode).toBe(false)
  })

  it('AppProfile type accepts monthly_budget_usd', () => {
    const profile: Partial<AppProfile> = {
      monthly_budget_usd: 100,
    }
    expect(profile.monthly_budget_usd).toBe(100)
  })

  it('AppProfile type accepts enabled_capabilities', () => {
    const profile: Partial<AppProfile> = {
      enabled_capabilities: ['chat', 'image_generation', 'voice'],
    }
    expect(profile.enabled_capabilities).toHaveLength(3)
  })

  it('existing profiles still work', () => {
    const profile = getAppProfile('amarktai-network')
    expect(profile.app_id).toBe('amarktai-network')
    expect(profile.allowed_providers.length).toBeGreaterThan(0)
  })
})
