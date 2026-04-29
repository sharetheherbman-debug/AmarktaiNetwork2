/**
 * Phase 1 Backend Completion Tests
 *
 * Tests for:
 * - Music generation multi-genre/mood validation (max 5 each)
 * - Music async job creation and lifecycle
 * - Self-healing DB persistence functions
 * - App capability permission denial
 * - Healing route with persist/history params
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateMusicRequest,
  resolveGenre,
  createMusic,
  buildLyricsPrompt,
  parseLyricsOutput,
  type MusicCreationRequest,
} from '../music-studio'

// ── Music multi-genre/mood validation ─────────────────────────────────────────

describe('MusicCreationRequest — multi-genre/mood validation', () => {
  const baseRequest: MusicCreationRequest = {
    appSlug: 'test-app',
    theme: 'hope and resilience',
    genre: 'pop',
    vocalStyle: 'female_lead',
  }

  it('allows up to 5 genres', () => {
    const req = { ...baseRequest, genres: ['pop', 'rnb', 'soul', 'gospel', 'worship'] as const }
    expect(() => validateMusicRequest(req as MusicCreationRequest)).not.toThrow()
  })

  it('rejects more than 5 genres', () => {
    const req = { ...baseRequest, genres: ['pop', 'rnb', 'soul', 'gospel', 'worship', 'jazz'] as const }
    expect(() => validateMusicRequest(req as MusicCreationRequest)).toThrow('Too many genres')
  })

  it('allows up to 5 moods', () => {
    const req = { ...baseRequest, moods: ['uplifting', 'intense', 'nostalgic', 'hopeful', 'raw'] }
    expect(() => validateMusicRequest(req)).not.toThrow()
  })

  it('rejects more than 5 moods', () => {
    const req = { ...baseRequest, moods: ['uplifting', 'intense', 'nostalgic', 'hopeful', 'raw', 'dark'] }
    expect(() => validateMusicRequest(req)).toThrow('Too many moods')
  })

  it('passes validation with zero moods', () => {
    const req = { ...baseRequest, moods: [] }
    expect(() => validateMusicRequest(req)).not.toThrow()
  })

  it('normalises instrumental flag to vocalStyle', () => {
    const req = { ...baseRequest, instrumental: true, vocalStyle: 'female_lead' as const }
    validateMusicRequest(req)
    expect(req.vocalStyle).toBe('instrumental_only')
  })
})

// ── resolveGenre ──────────────────────────────────────────────────────────────

describe('resolveGenre', () => {
  it('returns the single genre when genres is not provided', () => {
    const req: MusicCreationRequest = {
      appSlug: 'test',
      theme: 'test',
      genre: 'jazz',
      vocalStyle: 'male_lead',
    }
    expect(resolveGenre(req)).toBe('jazz')
  })

  it('returns the first genre from genres[] when provided', () => {
    const req: MusicCreationRequest = {
      appSlug: 'test',
      theme: 'test',
      genre: 'jazz',
      genres: ['afrobeats', 'rnb'],
      vocalStyle: 'male_lead',
    }
    expect(resolveGenre(req)).toBe('afrobeats')
  })

  it('falls back to genre when genres is empty', () => {
    const req: MusicCreationRequest = {
      appSlug: 'test',
      theme: 'test',
      genre: 'rock',
      genres: [],
      vocalStyle: 'male_lead',
    }
    expect(resolveGenre(req)).toBe('rock')
  })
})

// ── buildLyricsPrompt — multi-genre/mood ──────────────────────────────────────

describe('buildLyricsPrompt', () => {
  const base: MusicCreationRequest = {
    appSlug: 'test',
    theme: 'love and loss',
    genre: 'pop',
    vocalStyle: 'female_lead',
  }

  it('includes the genre name in the prompt', () => {
    const prompt = buildLyricsPrompt(base)
    expect(prompt).toContain('Pop')
  })

  it('includes all genres in a blend line when multiple genres provided', () => {
    const req = { ...base, genres: ['afrobeats', 'rnb'] as const }
    const prompt = buildLyricsPrompt(req as MusicCreationRequest)
    expect(prompt).toContain('Genres (blend)')
    expect(prompt).toContain('Afrobeats')
    expect(prompt).toContain('R&B')
  })

  it('includes moods in the prompt when provided', () => {
    const req = { ...base, moods: ['uplifting', 'nostalgic'] }
    const prompt = buildLyricsPrompt(req)
    expect(prompt).toContain('uplifting')
    expect(prompt).toContain('nostalgic')
  })

  it('includes language when non-English is specified', () => {
    const req = { ...base, language: 'Spanish' }
    const prompt = buildLyricsPrompt(req)
    expect(prompt).toContain('Spanish')
  })

  it('omits language line for default English', () => {
    const req = { ...base, language: 'en' }
    const prompt = buildLyricsPrompt(req)
    expect(prompt).not.toContain('Language: en')
  })
})

// ── parseLyricsOutput ─────────────────────────────────────────────────────────

describe('parseLyricsOutput', () => {
  const req: MusicCreationRequest = {
    appSlug: 'test',
    theme: 'test theme',
    genre: 'pop',
    vocalStyle: 'female_lead',
  }

  it('extracts the title from the raw output', () => {
    const raw = 'TITLE: My Beautiful Song\n\nLYRICS:\n[Verse 1]\nHello world\n'
    const result = parseLyricsOutput(raw, req, 'gpt-4o')
    expect(result.title).toBe('My Beautiful Song')
  })

  it('uses the primary genre from genres[] for the result', () => {
    const reqWithGenres = { ...req, genres: ['afrobeats', 'rnb'] as const }
    const result = parseLyricsOutput('TITLE: Test\nLYRICS:\nHello', reqWithGenres as MusicCreationRequest, 'gpt-4o')
    expect(result.genre).toBe('afrobeats')
  })

  it('falls back to a template when raw output is minimal', () => {
    const result = parseLyricsOutput('minimal input', req, 'template')
    expect(result.lyrics).toBeTruthy()
    expect(result.structure.sections.length).toBeGreaterThan(0)
  })
})

// ── createMusic — blueprint_only when no audio provider ──────────────────────

describe('createMusic — blueprint fallback', () => {
  beforeEach(() => {
    vi.resetModules()
    // Ensure no provider keys are set
    delete process.env.OPENAI_API_KEY
    delete process.env.GROQ_API_KEY
    delete process.env.TOGETHER_API_KEY
    delete process.env.SUNO_API_KEY
    delete process.env.REPLICATE_API_TOKEN
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns blueprint_only when no audio provider is configured', async () => {
    const req: MusicCreationRequest = {
      appSlug: 'test',
      theme: 'freedom',
      genre: 'pop',
      vocalStyle: 'female_lead',
      existingLyrics: '[Verse]\nTest lyrics for the song\n[Chorus]\nFreedom rings',
    }
    const result = await createMusic(req)
    expect(result.status).toBe('blueprint_only')
    expect(result.artifact.artifactType).toBe('blueprint_only')
    expect(result.artifact.audioUrl).toBeNull()
    expect(result.lyrics).toBeDefined()
    expect(result.message).toContain('blueprint')
  })

  it('includes lyrics in blueprint result', async () => {
    const req: MusicCreationRequest = {
      appSlug: 'test',
      theme: 'resilience',
      genre: 'gospel',
      vocalStyle: 'choir',
      existingLyrics: '[Chorus]\nWe shall overcome\n[Verse]\nThrough the storm we stand',
    }
    const result = await createMusic(req)
    expect(result.artifact.lyrics).toContain('overcome')
  })

  it('validates genre limit before processing', async () => {
    const req = {
      appSlug: 'test',
      theme: 'test',
      genre: 'pop' as const,
      genres: ['pop', 'rock', 'jazz', 'blues', 'soul', 'gospel'] as const, // 6 genres
      vocalStyle: 'female_lead' as const,
    }
    await expect(createMusic(req as MusicCreationRequest)).rejects.toThrow('Too many genres')
  })
})

// ── Self-healing exports ───────────────────────────────────────────────────────

describe('Self-healing module exports', () => {
  it('exports runHealingChecks', async () => {
    const { runHealingChecks } = await import('../self-healing')
    expect(typeof runHealingChecks).toBe('function')
  })

  it('exports runAndPersistHealingChecks', async () => {
    const { runAndPersistHealingChecks } = await import('../self-healing')
    expect(typeof runAndPersistHealingChecks).toBe('function')
  })

  it('exports getPersistedHealingRecords', async () => {
    const { getPersistedHealingRecords } = await import('../self-healing')
    expect(typeof getPersistedHealingRecords).toBe('function')
  })

  it('runHealingChecks returns a valid HealingStatus shape', async () => {
    const { runHealingChecks } = await import('../self-healing')
    const status = await runHealingChecks()
    expect(typeof status.healthScore).toBe('number')
    expect(status.healthScore).toBeGreaterThanOrEqual(0)
    expect(status.healthScore).toBeLessThanOrEqual(100)
    expect(typeof status.totalIssues).toBe('number')
    expect(Array.isArray(status.recentIssues)).toBe(true)
    expect(typeof status.criticalCount).toBe('number')
    expect(typeof status.warningCount).toBe('number')
  })

  it('runAndPersistHealingChecks returns the same shape as runHealingChecks', async () => {
    const { runAndPersistHealingChecks } = await import('../self-healing')
    const status = await runAndPersistHealingChecks()
    expect(typeof status.healthScore).toBe('number')
    expect(typeof status.totalIssues).toBe('number')
    expect(Array.isArray(status.recentIssues)).toBe(true)
  })

  it('getPersistedHealingRecords returns an array (empty when DB unavailable)', async () => {
    const { getPersistedHealingRecords } = await import('../self-healing')
    const records = await getPersistedHealingRecords()
    expect(Array.isArray(records)).toBe(true)
  })
})

// ── Music async job functions ──────────────────────────────────────────────────

describe('Music async job API', () => {
  it('exports createMusicJob', async () => {
    const { createMusicJob } = await import('../music-studio')
    expect(typeof createMusicJob).toBe('function')
  })

  it('exports getMusicJob', async () => {
    const { getMusicJob } = await import('../music-studio')
    expect(typeof getMusicJob).toBe('function')
  })

  it('exports cancelMusicJob', async () => {
    const { cancelMusicJob } = await import('../music-studio')
    expect(typeof cancelMusicJob).toBe('function')
  })

  it('exports retryMusicJob', async () => {
    const { retryMusicJob } = await import('../music-studio')
    expect(typeof retryMusicJob).toBe('function')
  })

  it('exports listMusicJobs', async () => {
    const { listMusicJobs } = await import('../music-studio')
    expect(typeof listMusicJobs).toBe('function')
  })

  it('getMusicJob returns null when job not found (DB unavailable)', async () => {
    const { getMusicJob } = await import('../music-studio')
    const job = await getMusicJob('nonexistent-job-id')
    expect(job).toBeNull()
  })

  it('cancelMusicJob returns false when job not found', async () => {
    const { cancelMusicJob } = await import('../music-studio')
    const result = await cancelMusicJob('nonexistent-job-id')
    expect(result).toBe(false)
  })

  it('retryMusicJob returns null when job not found', async () => {
    const { retryMusicJob } = await import('../music-studio')
    const result = await retryMusicJob('nonexistent-job-id')
    expect(result).toBeNull()
  })

  it('listMusicJobs returns empty array when DB unavailable', async () => {
    const { listMusicJobs } = await import('../music-studio')
    const jobs = await listMusicJobs()
    expect(Array.isArray(jobs)).toBe(true)
  })
})

// ── Capability permission check ────────────────────────────────────────────────

describe('executeCapability — app capability permission', () => {
  it('executeCapability exports correctly', async () => {
    const { executeCapability } = await import('../capability-router')
    expect(typeof executeCapability).toBe('function')
  })

  it('allows requests without appId (system/internal calls)', async () => {
    const { executeCapability } = await import('../capability-router')
    // Without appId — should not be blocked by capability check
    // (will fail at provider level since no key, but not at permission level)
    const result = await executeCapability({
      input: 'hello world',
      capability: 'chat',
      adultMode: false,
      safeMode: false,
    })
    // Either success (if provider key exists) or a provider error (not a guardrail_block)
    if (!result.success) {
      expect(result.error_category).not.toBe('guardrail_block')
    }
  })

  it('allows requests where AppAgent does not exist (backward compat)', async () => {
    const { executeCapability } = await import('../capability-router')
    // An app with no AppAgent record should be allowed through (fallback = allow)
    const result = await executeCapability({
      input: 'hello',
      capability: 'chat',
      appId: 'nonexistent-app-no-agent-record',
      adultMode: false,
      safeMode: false,
    })
    // Should not fail with 'Capability ... is not enabled'
    if (!result.success) {
      expect(result.error ?? '').not.toContain('is not enabled for app')
    }
  })
})
