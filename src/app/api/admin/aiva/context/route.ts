/**
 * GET /api/admin/aiva/context
 *
 * Returns live system-state data for Aiva's awareness panel.
 * Requires an active admin session.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getGenXStatusAsync, GENX_STT_MODELS, GENX_TTS_MODELS } from '@/lib/genx-client'
import { getStorageStatus } from '@/lib/storage-driver'
import { getVaultApiKey } from '@/lib/brain'
import { getServiceKey } from '@/lib/service-vault'

// Provider keys resolved via AiProvider vault (Admin → AI Providers).
// GenX and Firecrawl are NOT in this list — they use their own resolvers.
const PROVIDER_KEYS: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  grok: 'GROK_API_KEY',
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── GenX status ───────────────────────────────────────────────────────────
    let genxStatus: { available: boolean; error: string | null; modelCount: number } = {
      available: false,
      error: null,
      modelCount: 0,
    }
    try {
      const status = await getGenXStatusAsync()
      let modelCount = 0
      if (status.available) {
        try {
          const { listGenXModels } = await import('@/lib/genx-client')
          const models = await listGenXModels()
          modelCount = models.length
        } catch {
          modelCount = 0
        }
      }
      genxStatus = { available: status.available, error: status.error, modelCount }
    } catch (e) {
      genxStatus = { available: false, error: e instanceof Error ? e.message : 'Unknown error', modelCount: 0 }
    }

    // ── Missing provider keys ─────────────────────────────────────────────────
    const missingKeys: string[] = []

    // GenX: resolved via IntegrationConfig (not AiProvider). Use live status.
    if (!genxStatus.available) missingKeys.push('genx')

    // Firecrawl: resolved via IntegrationConfig (not AiProvider).
    let firecrawlConfigured = false
    try {
      const firecrawlKey = await getServiceKey('firecrawl', 'FIRECRAWL_API_KEY')
      firecrawlConfigured = !!firecrawlKey
    } catch {
      firecrawlConfigured = false
    }
    if (!firecrawlConfigured) missingKeys.push('firecrawl')

    // Standard AI providers resolved via AiProvider vault
    for (const [provider, envKey] of Object.entries(PROVIDER_KEYS)) {
      try {
        const val = process.env[envKey] ?? (await getVaultApiKey(provider))
        if (!val) missingKeys.push(provider)
      } catch {
        missingKeys.push(provider)
      }
    }

    // ── Storage status ────────────────────────────────────────────────────────
    let storagePersistent = false
    try {
      const storage = getStorageStatus()
      storagePersistent = storage.driver === 's3' || storage.driver === 'r2'
    } catch {
      storagePersistent = false
    }

    // ── Firecrawl status ──────────────────────────────────────────────────────
    const firecrawlStatus = firecrawlConfigured

    // ── STT / TTS / Voice readiness ───────────────────────────────────────────
    // STT: GenX has STT models OR any audio-transcription provider is configured
    const sttViaGenX = genxStatus.available && GENX_STT_MODELS.length > 0
    let sttViaProvider = false
    try {
      const groqKey  = await getVaultApiKey('groq')
      const openaiKey = await getVaultApiKey('openai')
      const geminiKey = await getVaultApiKey('gemini')
      const hfKey    = await getVaultApiKey('huggingface')
      sttViaProvider = !!(groqKey || openaiKey || geminiKey || hfKey)
    } catch { sttViaProvider = false }

    const sttReady = sttViaGenX || sttViaProvider
    const sttReadinessDetail = sttReady
      ? (sttViaGenX ? 'via GenX' : 'via provider key')
      : 'No STT provider configured (needs GenX, Groq, OpenAI, Gemini, or HuggingFace key)'

    // TTS: GenX has TTS models OR any audio-synthesis provider is configured
    const ttsViaGenX = genxStatus.available && GENX_TTS_MODELS.length > 0
    let ttsViaProvider = false
    try {
      const groqKey  = await getVaultApiKey('groq')
      const openaiKey = await getVaultApiKey('openai')
      const geminiKey = await getVaultApiKey('gemini')
      ttsViaProvider = !!(groqKey || openaiKey || geminiKey)
    } catch { ttsViaProvider = false }

    const ttsReady = ttsViaGenX || ttsViaProvider
    const ttsReadinessDetail = ttsReady
      ? (ttsViaGenX ? 'via GenX' : 'via provider key')
      : 'No TTS provider configured (needs GenX, Groq, OpenAI, or Gemini key)'

    const voiceReady = sttReady && ttsReady

    // ── Artifact count ────────────────────────────────────────────────────────
    let artifactCount = 0
    try {
      artifactCount = await prisma.artifact.count()
    } catch {
      artifactCount = 0
    }

    // ── Last artifact ─────────────────────────────────────────────────────────
    let lastArtifact: { id: string; type: string; title: string; createdAt: string } | null = null
    try {
      const art = await prisma.artifact.findFirst({ orderBy: { createdAt: 'desc' } })
      if (art) {
        lastArtifact = { id: art.id, type: art.type, title: art.title, createdAt: art.createdAt.toISOString() }
      }
    } catch {
      lastArtifact = null
    }

    // ── Recent failures ───────────────────────────────────────────────────────
    let recentFailures: unknown[] = []
    try {
      recentFailures = await prisma.brainEvent.findMany({
        where: { success: false },
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: {
          id: true,
          traceId: true,
          appSlug: true,
          taskType: true,
          errorMessage: true,
          timestamp: true,
          routedProvider: true,
        },
      })
    } catch {
      recentFailures = []
    }

    // ── Fallback usage last 24h ───────────────────────────────────────────────
    let fallbackUsage = 0
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      fallbackUsage = await prisma.brainEvent.count({
        where: {
          timestamp: { gte: since },
          executionMode: { not: 'direct' },
        },
      })
    } catch {
      fallbackUsage = 0
    }

    // ── Last capability used ──────────────────────────────────────────────────
    let lastCapabilityUsed: string | null = null
    try {
      const lastEvent = await prisma.brainEvent.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { taskType: true },
      })
      lastCapabilityUsed = lastEvent?.taskType ?? null
    } catch {
      lastCapabilityUsed = null
    }

    return NextResponse.json({
      genxStatus,
      missingKeys,
      artifactCount,
      recentFailures,
      fallbackUsage,
      firecrawlStatus,
      storagePersistent,
      // Voice readiness — truthful breakdown of STT and TTS capability
      sttReady,
      sttReadinessDetail,
      ttsReady,
      ttsReadinessDetail,
      // Voice is only ready when BOTH STT and TTS can run
      aivaChatReady: true,
      aivaVoiceReady: voiceReady,
      // Emotion persistence — truthful status
      // Emotion state lives in-memory (src/lib/emotion-engine.ts).
      // It survives restarts ONLY when REDIS_URL is configured.
      // Without Redis (or a DB-backed EmotionHistory model), all emotion
      // history resets on server restart. This is a known P1 before go-live.
      emotionPersistence: process.env.REDIS_URL ? 'redis' : 'in_memory',
      emotionSurvivesRestart: !!process.env.REDIS_URL,
      emotionPersistenceWarning: process.env.REDIS_URL
        ? null
        : 'Emotion state is in-memory only — history resets on server restart. ' +
          'Configure REDIS_URL or a DB-backed EmotionHistory model before go-live.',
      lastCapabilityUsed,
      lastArtifact,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
