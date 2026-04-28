import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getStorageStatus } from '@/lib/storage-driver'
import { getGenXStatusAsync } from '@/lib/genx-client'
import { getVaultApiKey } from '@/lib/brain'

/**
 * GET /api/admin/monitor/stats
 * Returns platform-wide stats for the Monitor page.
 * Includes: artifacts, brain events, workspace sessions, alerts,
 *           AI usage summary (with GenX vs fallback split), storage info,
 *           provider failures, GenX health, missing keys, and Aiva status.
 */

/** Required providers the platform expects to be configured. */
const REQUIRED_PROVIDER_KEYS = ['openai', 'groq'] as const
/** Optional providers whose absence is a warning (not a blocking error). */
const OPTIONAL_PROVIDER_KEYS = [
  'anthropic', 'mistral', 'cohere', 'gemini', 'grok', 'together', 'huggingface',
  'replicate', 'openrouter', 'elevenlabs', 'deepgram', 'assemblyai', 'qwen',
] as const

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // ── Parallel DB queries ────────────────────────────────────────────────
    const [
      artifactCount,
      brainEventCount,
      workspaceSessionCount,
      alertCount,
      recentBrainEvents,
      aiProviders,
      recentWorkspaceSessions,
      artifactStorageStats,
      aivaRow,
    ] = await Promise.all([
      prisma.artifact.count(),
      prisma.brainEvent.count(),
      prisma.workspaceSession.count(),
      prisma.systemAlert.count({ where: { resolved: false } }),
      // AI usage in last 30 days grouped by routed provider
      prisma.brainEvent.groupBy({
        by: ['routedProvider'],
        where: { timestamp: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }).catch(() => []),
      // Provider health snapshot
      prisma.aiProvider.findMany({
        select: { providerKey: true, displayName: true, healthStatus: true },
      }).catch(() => []),
      prisma.workspaceSession.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
      prisma.artifact.aggregate({ _sum: { fileSizeBytes: true }, _count: { id: true } }).catch(() => null),
      prisma.integrationConfig.findUnique({ where: { key: 'aiva_config' } }).catch(() => null),
    ])

    // ── GenX health (live probe) ───────────────────────────────────────────
    const genxStatus = await getGenXStatusAsync().catch(() => null)
    const genxHealthy = genxStatus?.available ?? false
    const genxError = genxStatus?.error ?? null

    // ── Provider health summary ────────────────────────────────────────────
    type AiProviderRow = { providerKey: string; displayName: string; healthStatus: string }
    const providerFailures = (aiProviders as AiProviderRow[])
      .filter((p) => p.healthStatus === 'error' || p.healthStatus === 'degraded')
      .map((p) => ({ key: p.providerKey, name: p.displayName, status: p.healthStatus }))

    // ── AI usage by provider (30 days) ────────────────────────────────────
    type BrainEventGroup = { routedProvider: string | null; _count: { id: number } }
    const aiUsageByProvider: Record<string, number> = {}
    for (const r of recentBrainEvents as BrainEventGroup[]) {
      const key = r.routedProvider ?? 'unknown'
      aiUsageByProvider[key] = (aiUsageByProvider[key] ?? 0) + r._count.id
    }
    const totalAiRequestsThisMonth = Object.values(aiUsageByProvider).reduce((sum, n) => sum + n, 0)
    const genxRequestsThisMonth = aiUsageByProvider['genx'] ?? 0
    const fallbackRequestsThisMonth = totalAiRequestsThisMonth - genxRequestsThisMonth

    // ── Missing keys audit ────────────────────────────────────────────────
    // Check vault first, then fall back to env (via getVaultApiKey which already handles both).
    const [requiredKeyResults, optionalKeyResults] = await Promise.all([
      Promise.all(
        REQUIRED_PROVIDER_KEYS.map(async (k) => ({ key: k, hasKey: !!(await getVaultApiKey(k).catch(() => null)) }))
      ),
      Promise.all(
        OPTIONAL_PROVIDER_KEYS.map(async (k) => ({ key: k, hasKey: !!(await getVaultApiKey(k).catch(() => null)) }))
      ),
    ])
    const missingRequiredKeys = requiredKeyResults.filter((r) => !r.hasKey).map((r) => r.key)
    const missingOptionalKeys = optionalKeyResults.filter((r) => !r.hasKey).map((r) => r.key)

    // ── Aiva status ───────────────────────────────────────────────────────
    let aivaNotes: Record<string, unknown> = {}
    try { aivaNotes = JSON.parse(aivaRow?.notes ?? '{}') } catch { /* ignore */ }
    const aivaTypedEnabled = aivaNotes.typedEnabled !== undefined ? Boolean(aivaNotes.typedEnabled) : true
    const aivaVoiceEnabled = aivaNotes.voiceEnabled !== undefined ? Boolean(aivaNotes.voiceEnabled) : false
    const aivaSttProvider = String(aivaNotes.sttProvider || 'auto')
    const aivaTtsProvider = String(aivaNotes.ttsProvider || 'auto')

    // ── Storage summary ────────────────────────────────────────────────────
    const storageStatus = getStorageStatus()
    type ArtifactAgg = { _sum: { fileSizeBytes: number | null }; _count: { id: number } } | null
    const storageTotalBytes = (artifactStorageStats as ArtifactAgg)?._sum?.fileSizeBytes ?? 0

    return NextResponse.json({
      artifactCount,
      brainEventCount,
      workspaceSessionCount,
      alertCount,
      // ── GenX / Brain routing ────────────────────────────────────────────
      genxHealth: {
        available:               genxHealthy,
        error:                   genxError,
        requestsThisMonth:       genxRequestsThisMonth,
        fallbackRequestsThisMonth,
        fallbackPct:             totalAiRequestsThisMonth > 0
          ? Math.round((fallbackRequestsThisMonth / totalAiRequestsThisMonth) * 100)
          : 0,
      },
      // ── AI usage ────────────────────────────────────────────────────────
      aiUsage: {
        totalRequestsThisMonth: totalAiRequestsThisMonth,
        recentWorkspaceSessions,
        byProvider: aiUsageByProvider,
      },
      // ── Storage ─────────────────────────────────────────────────────────
      storage: {
        driver:            storageStatus.driver,
        configured:        storageStatus.configured,
        basePath:          storageStatus.basePath,
        totalArtifacts:    (artifactStorageStats as ArtifactAgg)?._count?.id ?? 0,
        totalStorageBytes: storageTotalBytes,
        totalStorageMb:    Math.round(storageTotalBytes / (1024 * 1024) * 10) / 10,
      },
      // ── Providers ────────────────────────────────────────────────────────
      providers: {
        failures:     providerFailures,
        failureCount: providerFailures.length,
        allProviders: (aiProviders as AiProviderRow[]).map((p) => ({
          key:    p.providerKey,
          name:   p.displayName,
          status: p.healthStatus,
        })),
      },
      // ── Missing keys ─────────────────────────────────────────────────────
      missingKeys: {
        required: missingRequiredKeys,
        optional: missingOptionalKeys,
        requiredCount: missingRequiredKeys.length,
        optionalCount: missingOptionalKeys.length,
      },
      // ── Aiva ─────────────────────────────────────────────────────────────
      aiva: {
        typedEnabled:   aivaTypedEnabled,
        voiceEnabled:   aivaVoiceEnabled,
        sttProvider:    aivaSttProvider,
        ttsProvider:    aivaTtsProvider,
        configured:     aivaRow !== null,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load stats' },
      { status: 500 },
    )
  }
}
