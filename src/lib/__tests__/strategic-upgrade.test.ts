/**
 * Strategic Upgrade Tests — AmarktAI Network
 *
 * Tests for capability packs, app discovery, capability gap detection,
 * and expanded app connector functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCapabilityPack,
  getAllCapabilityPacks,
  getPacksForCategory,
  validatePackSafety,
  getPackCapabilityGaps,
} from '../capability-packs'
import {
  discoverApp,
  detectCapabilityGaps,
  generateOnboardingRecommendations,
} from '../app-discovery'
import {
  analyzeCapabilityGaps,
  getGapsForApp,
  getAllGaps,
  clearGaps,
  getHighPriorityGaps,
  generateGapAlert,
} from '../capability-gaps'
import {
  recordHeartbeat,
  recordAppRequest,
  recordAppEvent,
  updateAppMetrics,
  getAppMetrics,
  getAllConnectedApps,
  getAggregateMetrics,
  checkRateLimit,
  setAppRateLimit,
  resetConnectedApps,
} from '../app-connector'

// ── Capability Packs ─────────────────────────────────────────────────

describe('Capability Packs', () => {
  it('should have 13 packs', () => {
    const packs = getAllCapabilityPacks()
    expect(packs.length).toBeGreaterThanOrEqual(13)
  })

  it('should retrieve a specific pack', () => {
    const pack = getCapabilityPack('support_pack')
    expect(pack).toBeDefined()
    expect(pack!.name).toBeTruthy()
    expect(pack!.capabilities).toContain('chat')
    expect(pack!.safetyLevel).toBe('strict')
  })

  it('should return undefined for unknown pack', () => {
    expect(getCapabilityPack('nonexistent')).toBeUndefined()
  })

  it('should find packs for category', () => {
    const packs = getPacksForCategory('support')
    expect(packs.length).toBeGreaterThan(0)
    expect(packs.some(p => p.id === 'support_pack')).toBe(true)
  })

  it('adult pack should require adult flag', () => {
    const result = validatePackSafety('adult_18plus_pack', { isAdult: false })
    expect(result.valid).toBe(false)
    expect(result.reason).toBeTruthy()
  })

  it('adult pack should pass with adult flag', () => {
    const result = validatePackSafety('adult_18plus_pack', { isAdult: true })
    expect(result.valid).toBe(true)
  })

  it('minor-facing apps cannot use adult pack', () => {
    const result = validatePackSafety('adult_18plus_pack', { isMinorFacing: true })
    expect(result.valid).toBe(false)
  })

  it('minor-facing apps cannot use relaxed safety', () => {
    const result = validatePackSafety('dev_pack', { isMinorFacing: true })
    expect(result.valid).toBe(false)
  })

  it('should detect capability gaps in pack', () => {
    const gaps = getPackCapabilityGaps('support_pack', ['chat', 'retrieval'])
    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps).not.toContain('chat')
    expect(gaps).not.toContain('retrieval')
  })

  it('each pack should have required fields', () => {
    const packs = getAllCapabilityPacks()
    for (const pack of packs) {
      expect(pack.id).toBeTruthy()
      expect(pack.name).toBeTruthy()
      expect(pack.capabilities.length).toBeGreaterThan(0)
      expect(pack.allowedProviders.length).toBeGreaterThan(0)
      expect(pack.defaultBudget.daily).toBeGreaterThan(0)
      expect(pack.defaultBudget.monthly).toBeGreaterThan(0)
      expect(['strict', 'standard', 'relaxed', 'adult_gated']).toContain(pack.safetyLevel)
    }
  })
})

// ── App Discovery ────────────────────────────────────────────────────

describe('App Discovery', () => {
  it('should detect support app from URL keywords', async () => {
    const result = await discoverApp({
      name: 'HelpDesk Pro',
      url: 'https://support.example.com',
      description: 'Customer support chatbot'
    })
    expect(result.detectedCategory).toBe('support')
    expect(result.proposedConfig.safetyMode).toBe('strict')
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('should detect creator app', async () => {
    const result = await discoverApp({
      name: 'Content Creator Hub',
      url: 'https://marketing.example.com',
      description: 'AI-powered marketing campaigns'
    })
    expect(result.detectedCategory).toBe('creator')
  })

  it('should detect adult app', async () => {
    const result = await discoverApp({
      name: 'Adult Platform',
      url: 'https://adult-content.example.com',
      description: '18+ mature content platform'
    })
    expect(result.detectedCategory).toBe('adult')
    expect(result.proposedConfig.safetyMode).toBe('adult_gated')
    expect(result.riskLevel).toBe('critical')
  })

  it('should detect knowledge/education app', async () => {
    const result = await discoverApp({
      name: 'Bible Study App',
      url: 'https://religious-knowledge.example.com',
      description: 'Religious education platform'
    })
    expect(result.detectedCategory).toBe('knowledge')
  })

  it('should fallback to general for unknown apps', async () => {
    const result = await discoverApp({
      name: 'Mystery App',
      url: 'https://xyz.example.com',
    })
    expect(result.detectedCategory).toBe('general')
    expect(result.confidence).toBeLessThan(0.5)
  })

  it('should detect capability gaps', async () => {
    const result = await discoverApp({
      name: 'Voice Assistant',
      url: 'https://voice.example.com',
    })
    const gaps = detectCapabilityGaps(result, ['openai'], [])
    expect(Array.isArray(gaps)).toBe(true)
  })

  it('should generate recommendations', async () => {
    const result = await discoverApp({
      name: 'Chat Support',
      url: 'https://chat.example.com',
    })
    const recs = generateOnboardingRecommendations(result)
    expect(recs.length).toBeGreaterThan(0)
  })
})

// ── Capability Gap Detection ─────────────────────────────────────────

describe('Capability Gap Detection', () => {
  beforeEach(() => {
    clearGaps('test-app')
  })

  it('should detect gaps for missing providers', () => {
    const result = analyzeCapabilityGaps(
      'test-app',
      ['chat', 'image_generation', 'voice'],
      ['groq'],
      ['llama-3.1-70b']
    )
    expect(result.gaps.length).toBeGreaterThan(0)
    expect(result.actionRequired).toBe(true)
  })

  it('should report full readiness when all capabilities met', () => {
    const result = analyzeCapabilityGaps(
      'test-app',
      ['chat'],
      ['openai', 'groq', 'deepseek'],
      ['gpt-4o', 'llama-3.1-70b', 'deepseek-chat']
    )
    expect(result.overallReadiness).toBe(1)
    expect(result.gaps.length).toBe(0)
  })

  it('should store and retrieve gaps per app', () => {
    analyzeCapabilityGaps('gap-app', ['voice', 'video'], [], [])
    const gaps = getGapsForApp('gap-app')
    expect(gaps.length).toBeGreaterThan(0)
  })

  it('should get high priority gaps', () => {
    analyzeCapabilityGaps('critical-app', ['image_generation', 'video', 'voice'], [], [])
    const highGaps = getHighPriorityGaps()
    expect(highGaps.length).toBeGreaterThan(0)
    expect(highGaps.every(g => g.severity === 'high' || g.severity === 'critical')).toBe(true)
  })

  it('should generate alert for a gap', () => {
    const result = analyzeCapabilityGaps('alert-app', ['voice'], [], [])
    if (result.gaps.length > 0) {
      const alert = generateGapAlert(result.gaps[0])
      expect(alert.title).toBeTruthy()
      expect(alert.body).toBeTruthy()
      expect(alert.actions.length).toBeGreaterThan(0)
    }
  })

  it('should clear gaps for an app', () => {
    analyzeCapabilityGaps('clear-app', ['video'], [], [])
    expect(getGapsForApp('clear-app').length).toBeGreaterThan(0)
    clearGaps('clear-app')
    expect(getGapsForApp('clear-app').length).toBe(0)
  })

  it('should get all gaps across apps', () => {
    analyzeCapabilityGaps('app-a', ['voice'], [], [])
    analyzeCapabilityGaps('app-b', ['video'], [], [])
    const all = getAllGaps()
    expect(all.size).toBeGreaterThanOrEqual(2)
  })
})

// ── Extended App Connector ───────────────────────────────────────────

describe('Extended App Connector', () => {
  beforeEach(() => {
    resetConnectedApps()
  })

  it('should record heartbeat', () => {
    const hb = recordHeartbeat('test-app', 'healthy', '1.0.0', 3600)
    expect(hb.appSlug).toBe('test-app')
    expect(hb.status).toBe('healthy')
  })

  it('should record app request and update metrics', () => {
    recordAppRequest('test-app', 150, true)
    recordAppRequest('test-app', 250, false)
    const metrics = getAppMetrics('test-app')
    expect(metrics).toBeDefined()
    expect(metrics!.requestCount).toBe(2)
    expect(metrics!.errorCount).toBe(1)
  })

  it('should update extended metrics', () => {
    updateAppMetrics('test-app', {
      activeUsers: 500,
      newUsers: 50,
      revenue: 10000,
      churn: 5,
      fallbackRate: 0.02,
      capabilityUsage: { chat: 100, code: 20 },
      providerUsage: { openai: 80, groq: 40 },
      customKpis: { satisfaction: 4.5 },
    })
    const metrics = getAppMetrics('test-app')
    expect(metrics!.activeUsers).toBe(500)
    expect(metrics!.newUsers).toBe(50)
    expect(metrics!.revenue).toBe(10000)
    expect(metrics!.churn).toBe(5)
    expect(metrics!.fallbackRate).toBe(0.02)
    expect(metrics!.capabilityUsage!.chat).toBe(100)
    expect(metrics!.providerUsage!.openai).toBe(80)
    expect(metrics!.customKpis!.satisfaction).toBe(4.5)
  })

  it('should merge custom KPIs on update', () => {
    updateAppMetrics('test-app', { customKpis: { a: 1 } })
    updateAppMetrics('test-app', { customKpis: { b: 2 } })
    const metrics = getAppMetrics('test-app')
    expect(metrics!.customKpis!.a).toBe(1)
    expect(metrics!.customKpis!.b).toBe(2)
  })

  it('should record events', () => {
    const event = recordAppEvent('test-app', 'user_signup', { userId: '123' })
    expect(event.appSlug).toBe('test-app')
    expect(event.eventType).toBe('user_signup')
  })

  it('should enforce rate limits', () => {
    setAppRateLimit('test-app', 2)
    recordAppRequest('test-app', 100, true)
    recordAppRequest('test-app', 100, true)
    const state = checkRateLimit('test-app')
    expect(state.blocked).toBe(true)
  })

  it('should aggregate metrics across apps', () => {
    recordHeartbeat('app-1', 'healthy')
    recordHeartbeat('app-2', 'degraded')
    recordAppRequest('app-1', 100, true)
    recordAppRequest('app-2', 200, false)
    const agg = getAggregateMetrics()
    expect(agg.totalApps).toBe(2)
    expect(agg.healthyApps).toBe(1)
    expect(agg.degradedApps).toBe(1)
    expect(agg.totalRequests).toBe(2)
    expect(agg.totalErrors).toBe(1)
  })

  it('should return null for unknown app metrics', () => {
    expect(getAppMetrics('nonexistent')).toBeNull()
  })

  it('should list all connected apps', () => {
    recordHeartbeat('app-1', 'healthy')
    recordHeartbeat('app-2', 'healthy')
    const apps = getAllConnectedApps()
    expect(apps.length).toBe(2)
  })
})
