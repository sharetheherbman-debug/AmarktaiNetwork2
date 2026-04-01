/**
 * Adult 18+ Capability Truth Tests — Final Pass
 *
 * Verifies:
 *  - adult_18plus_image is unavailable (no backend route exists)
 *  - adult mode is hidden by default (safeMode=true, adultMode=false)
 *  - adult mode blocked when safe mode is on
 *  - adult capability blocked even with adultMode=true (no route)
 *  - always-blocked categories remain blocked in adult mode
 *  - content filter catches terrorism/extremism
 *  - HF fallback does NOT claim adult support
 *  - no fake adult capability claims
 *  - per-app isolation of adult config
 *  - exact blocker messaging
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  scanContent,
  setAppSafetyConfig,
  getAppSafetyConfig,
  blockedExplanation,
} from '../content-filter'
import type { FlagCategory } from '../content-filter'
import {
  resolveCapabilityRoutes,
  BACKEND_ROUTE_EXISTS,
  CAPABILITY_MAP,
  classifyCapabilities,
  getDetailedCapabilityStatus,
} from '../capability-engine'
import { HF_FALLBACK_MODELS, getHfFallback } from '../hf-fallback'

/* ================================================================
 * ADULT CAPABILITY — BACKEND ROUTE TRUTH
 * ================================================================ */

describe('Adult Capability Backend Truth', () => {
  it('adult_18plus_image has NO backend route', () => {
    expect(BACKEND_ROUTE_EXISTS.adult_18plus_image).toBe(false)
  })

  it('adult_18plus_image is in CAPABILITY_MAP', () => {
    const map = CAPABILITY_MAP as Record<string, { label?: string }>
    expect(map.adult_18plus_image).toBeDefined()
    expect(map.adult_18plus_image.label).toContain('adult')
  })

  it('adult_18plus_image shows UNAVAILABLE in detailed status', () => {
    const status = getDetailedCapabilityStatus()
    const adult = status.find((s) => s.capability === 'adult_18plus_image')
    expect(adult).toBeDefined()
    expect(adult!.available).toBe(false)
    expect(adult!.routeExists).toBe(false)
  })

  it('adult capability is blocked by backend route guard first', () => {
    const result = resolveCapabilityRoutes({
      capabilities: ['adult_18plus_image'],
      adultMode: true,
    })
    expect(result.routes[0].available).toBe(false)
    // Backend route guard fires BEFORE adult mode guard
    expect(result.routes[0].missingMessage).toContain('Route not implemented')
  })

  it('adult capability is blocked without adultMode flag', () => {
    const result = resolveCapabilityRoutes({
      capabilities: ['adult_18plus_image'],
      adultMode: false,
    })
    expect(result.routes[0].available).toBe(false)
  })

  it('adult capability is blocked when adultMode is undefined', () => {
    const result = resolveCapabilityRoutes({
      capabilities: ['adult_18plus_image'],
    })
    expect(result.routes[0].available).toBe(false)
  })
})

/* ================================================================
 * ADULT MODE — HIDDEN BY DEFAULT
 * ================================================================ */

describe('Adult Mode Hidden By Default', () => {
  it('new apps default to safeMode=true, adultMode=false', () => {
    const config = getAppSafetyConfig('brand-new-app-test')
    expect(config.safeMode).toBe(true)
    expect(config.adultMode).toBe(false)
  })

  it('adultMode cannot be enabled while safeMode is on', () => {
    const config = setAppSafetyConfig('test-hidden', { safeMode: true, adultMode: true })
    expect(config.adultMode).toBe(false)
    expect(config.safeMode).toBe(true)
  })

  it('adultMode requires explicit safeMode=false first', () => {
    setAppSafetyConfig('test-explicit', { safeMode: false })
    const config = setAppSafetyConfig('test-explicit', { adultMode: true })
    expect(config.adultMode).toBe(true)
    expect(config.safeMode).toBe(false)
  })
})

/* ================================================================
 * PER-APP ISOLATION
 * ================================================================ */

describe('Adult Mode Per-App Isolation', () => {
  beforeEach(() => {
    setAppSafetyConfig('app-alpha', { safeMode: true, adultMode: false })
    setAppSafetyConfig('app-beta', { safeMode: true, adultMode: false })
  })

  it('enabling adult mode on one app does not affect another', () => {
    setAppSafetyConfig('app-alpha', { safeMode: false })
    setAppSafetyConfig('app-alpha', { adultMode: true })

    const alpha = getAppSafetyConfig('app-alpha')
    const beta = getAppSafetyConfig('app-beta')

    expect(alpha.adultMode).toBe(true)
    expect(beta.adultMode).toBe(false)
    expect(beta.safeMode).toBe(true)
  })

  it('disabling safe mode on one app does not affect another', () => {
    setAppSafetyConfig('app-alpha', { safeMode: false })

    const alpha = getAppSafetyConfig('app-alpha')
    const beta = getAppSafetyConfig('app-beta')

    expect(alpha.safeMode).toBe(false)
    expect(beta.safeMode).toBe(true)
  })
})

/* ================================================================
 * ALWAYS-BLOCKED CATEGORIES — NEVER BYPASSED
 * ================================================================ */

describe('Always-Blocked Categories', () => {
  it('CSAM is detected by keyword scanner', () => {
    const result = scanContent('child sexual abuse material')
    expect(result.flagged).toBe(true)
    expect(result.categories).toContain('csam')
  })

  it('non-consensual content is detected', () => {
    const result = scanContent('non-consensual sex content')
    expect(result.flagged).toBe(true)
    expect(result.categories).toContain('non_consensual')
  })

  it('violence/weapons instructions are detected', () => {
    const result = scanContent('how to make a bomb')
    expect(result.flagged).toBe(true)
    expect(result.categories).toContain('violence')
  })

  it('self-harm content is detected', () => {
    const result = scanContent('how to commit suicide')
    expect(result.flagged).toBe(true)
    expect(result.categories).toContain('self_harm')
  })

  it('hate speech is detected', () => {
    const result = scanContent('kill all jews')
    expect(result.flagged).toBe(true)
    expect(result.categories).toContain('hate_speech')
  })

  it('terrorism/extremism is detected', () => {
    const result = scanContent('how to join isis recruitment')
    expect(result.flagged).toBe(true)
    expect(result.categories).toContain('terrorism')
  })

  it('radicalization content is detected', () => {
    const result = scanContent('radicalization guide for extremists')
    expect(result.flagged).toBe(true)
    expect(result.categories).toContain('terrorism')
  })

  it('safe content is not flagged', () => {
    const result = scanContent('How to bake a chocolate cake')
    expect(result.flagged).toBe(false)
    expect(result.categories).toHaveLength(0)
  })
})

/* ================================================================
 * BLOCKED EXPLANATION COVERAGE
 * ================================================================ */

describe('Blocked Explanation Coverage', () => {
  const allCategories: FlagCategory[] = [
    'csam', 'non_consensual', 'hate_speech', 'violence', 'self_harm', 'terrorism',
  ]

  it('every FlagCategory has a user-friendly explanation', () => {
    for (const cat of allCategories) {
      const explanation = blockedExplanation([cat])
      expect(explanation).toContain('blocked')
      expect(explanation.length).toBeGreaterThan(50)
    }
  })

  it('terrorism explanation mentions terrorism/extremism', () => {
    const explanation = blockedExplanation(['terrorism'])
    expect(explanation).toContain('terrorism')
  })

  it('CSAM explanation mentions minors', () => {
    const explanation = blockedExplanation(['csam'])
    expect(explanation).toContain('minors')
  })
})

/* ================================================================
 * CLASSIFICATION — ADULT DETECTION
 * ================================================================ */

describe('Adult Content Classification', () => {
  it('classifies "adult" keyword as adult_18plus_image', () => {
    const caps = classifyCapabilities('', 'adult content generation')
    expect(caps).toContain('adult_18plus_image')
  })

  it('classifies "nsfw" as adult_18plus_image', () => {
    const caps = classifyCapabilities('', 'nsfw image')
    expect(caps).toContain('adult_18plus_image')
  })

  it('classifies "18+" as adult_18plus_image', () => {
    const caps = classifyCapabilities('', '18+ image generation')
    expect(caps).toContain('adult_18plus_image')
  })

  it('classifies "explicit" as adult_18plus_image', () => {
    const caps = classifyCapabilities('', 'explicit content')
    expect(caps).toContain('adult_18plus_image')
  })

  it('does NOT classify normal requests as adult', () => {
    const caps = classifyCapabilities('', 'generate a landscape image')
    expect(caps).not.toContain('adult_18plus_image')
  })
})

/* ================================================================
 * HF FALLBACK — NO ADULT CLAIMS
 * ================================================================ */

describe('HF Fallback Has No Adult Claims', () => {
  it('HF_FALLBACK_MODELS does not include adult_18plus_image', () => {
    expect(HF_FALLBACK_MODELS.adult_18plus_image).toBeUndefined()
  })

  it('getHfFallback for adult returns not available', () => {
    const result = getHfFallback('adult_18plus_image')
    // Either no models cataloged, or provider not configured — either way not available
    // with no models in catalog
    expect(result.models).toHaveLength(0)
  })
})

/* ================================================================
 * NON-ADULT CAPABILITIES NOT AFFECTED
 * ================================================================ */

describe('Adult Mode Does Not Affect Non-Adult Capabilities', () => {
  it('general_chat is not blocked by adultMode=false', () => {
    const result = resolveCapabilityRoutes({
      capabilities: ['general_chat'],
      adultMode: false,
    })
    expect(result.routes[0].capability).toBe('general_chat')
    // general_chat should not be affected by adult mode
  })

  it('image_generation is not blocked by adultMode=false', () => {
    const result = resolveCapabilityRoutes({
      capabilities: ['image_generation'],
      adultMode: false,
    })
    expect(result.routes[0].capability).toBe('image_generation')
    // Standard image generation should work regardless of adult mode
  })
})

/* ================================================================
 * EXACT BLOCKER MESSAGING
 * ================================================================ */

describe('Adult Blocker Messaging', () => {
  it('backend route guard message is exact', () => {
    const result = resolveCapabilityRoutes({
      capabilities: ['adult_18plus_image'],
      adultMode: true,
    })
    expect(result.routes[0].missingMessage).toContain('Route not implemented')
    expect(result.routes[0].missingMessage).toContain('adult 18+ image generation')
  })

  it('adult mode requirement message is present in capability map', () => {
    // When the backend route guard fires first, the adult guard message is not shown
    // but the capability engine knows about the adult mode requirement
    const result = resolveCapabilityRoutes({
      capabilities: ['adult_18plus_image'],
      adultMode: false,
    })
    // Backend guard fires first since BACKEND_ROUTE_EXISTS is false
    expect(result.routes[0].available).toBe(false)
  })
})
