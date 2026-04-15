/**
 * @module usage-meter
 * @description Internal usage metering for the AmarktAI Network platform.
 *
 * Tracks per-app, per-capability, per-provider usage with DB persistence.
 * Aggregated daily for efficient querying. No billing — metering only.
 *
 * Server-side only.
 */

import { prisma } from '@/lib/prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MeterEvent {
  appSlug: string
  capability: string
  provider: string
  model?: string
  success: boolean
  inputTokens?: number
  outputTokens?: number
  costUsdCents?: number
  latencyMs?: number
  artifactCreated?: boolean
}

export interface UsageSummary {
  appSlug: string
  totalRequests: number
  totalSuccess: number
  totalErrors: number
  totalCostCents: number
  totalInputTokens: number
  totalOutputTokens: number
  totalArtifacts: number
  byCapability: Record<string, { requests: number; costCents: number }>
  byProvider: Record<string, { requests: number; costCents: number }>
  byDay: Array<{ date: string; requests: number; costCents: number }>
}

export interface PlatformUsageSummary {
  totalRequests: number
  totalCostCents: number
  totalArtifacts: number
  appCount: number
  topApps: Array<{ appSlug: string; requests: number; costCents: number }>
  topCapabilities: Array<{ capability: string; requests: number }>
  topProviders: Array<{ provider: string; requests: number; costCents: number }>
}

// ── Core Metering ────────────────────────────────────────────────────────────

/**
 * Record a single usage event. Upserts into daily aggregation row.
 */
export async function recordUsage(event: MeterEvent): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    await prisma.usageMeter.upsert({
      where: {
        usage_meter_unique: {
          appSlug: event.appSlug,
          date: today,
          capability: event.capability,
          provider: event.provider,
          model: event.model ?? '',
        },
      },
      create: {
        appSlug: event.appSlug,
        date: today,
        capability: event.capability,
        provider: event.provider,
        model: event.model ?? '',
        requestCount: 1,
        successCount: event.success ? 1 : 0,
        errorCount: event.success ? 0 : 1,
        inputTokens: event.inputTokens ?? 0,
        outputTokens: event.outputTokens ?? 0,
        costUsdCents: event.costUsdCents ?? 0,
        artifactCount: event.artifactCreated ? 1 : 0,
        latencyMsSum: event.latencyMs ?? 0,
      },
      update: {
        requestCount: { increment: 1 },
        successCount: { increment: event.success ? 1 : 0 },
        errorCount: { increment: event.success ? 0 : 1 },
        inputTokens: { increment: event.inputTokens ?? 0 },
        outputTokens: { increment: event.outputTokens ?? 0 },
        costUsdCents: { increment: event.costUsdCents ?? 0 },
        artifactCount: { increment: event.artifactCreated ? 1 : 0 },
        latencyMsSum: { increment: event.latencyMs ?? 0 },
      },
    })
  } catch (err) {
    console.error('[usage-meter] Failed to record usage:', err)
  }
}

/**
 * Get usage summary for a specific app over a date range.
 */
export async function getAppUsageSummary(
  appSlug: string,
  daysBack: number = 30,
): Promise<UsageSummary> {
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  since.setHours(0, 0, 0, 0)

  const rows = await prisma.usageMeter.findMany({
    where: { appSlug, date: { gte: since } },
  })

  const byCapability: Record<string, { requests: number; costCents: number }> = {}
  const byProvider: Record<string, { requests: number; costCents: number }> = {}
  const byDayMap: Record<string, { requests: number; costCents: number }> = {}

  let totalRequests = 0
  let totalSuccess = 0
  let totalErrors = 0
  let totalCostCents = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalArtifacts = 0

  for (const r of rows) {
    totalRequests += r.requestCount
    totalSuccess += r.successCount
    totalErrors += r.errorCount
    totalCostCents += r.costUsdCents
    totalInputTokens += r.inputTokens
    totalOutputTokens += r.outputTokens
    totalArtifacts += r.artifactCount

    if (!byCapability[r.capability]) byCapability[r.capability] = { requests: 0, costCents: 0 }
    byCapability[r.capability].requests += r.requestCount
    byCapability[r.capability].costCents += r.costUsdCents

    if (!byProvider[r.provider]) byProvider[r.provider] = { requests: 0, costCents: 0 }
    byProvider[r.provider].requests += r.requestCount
    byProvider[r.provider].costCents += r.costUsdCents

    const dayKey = r.date.toISOString().slice(0, 10)
    if (!byDayMap[dayKey]) byDayMap[dayKey] = { requests: 0, costCents: 0 }
    byDayMap[dayKey].requests += r.requestCount
    byDayMap[dayKey].costCents += r.costUsdCents
  }

  const byDay = Object.entries(byDayMap)
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    appSlug,
    totalRequests,
    totalSuccess,
    totalErrors,
    totalCostCents,
    totalInputTokens,
    totalOutputTokens,
    totalArtifacts,
    byCapability,
    byProvider,
    byDay,
  }
}

/**
 * Get platform-wide usage summary.
 */
export async function getPlatformUsageSummary(daysBack: number = 30): Promise<PlatformUsageSummary> {
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  since.setHours(0, 0, 0, 0)

  const rows = await prisma.usageMeter.findMany({
    where: { date: { gte: since } },
  })

  let totalRequests = 0
  let totalCostCents = 0
  let totalArtifacts = 0
  const appMap = new Map<string, { requests: number; costCents: number }>()
  const capMap = new Map<string, number>()
  const provMap = new Map<string, { requests: number; costCents: number }>()

  for (const r of rows) {
    totalRequests += r.requestCount
    totalCostCents += r.costUsdCents
    totalArtifacts += r.artifactCount

    const app = appMap.get(r.appSlug) ?? { requests: 0, costCents: 0 }
    app.requests += r.requestCount
    app.costCents += r.costUsdCents
    appMap.set(r.appSlug, app)

    capMap.set(r.capability, (capMap.get(r.capability) ?? 0) + r.requestCount)

    const prov = provMap.get(r.provider) ?? { requests: 0, costCents: 0 }
    prov.requests += r.requestCount
    prov.costCents += r.costUsdCents
    provMap.set(r.provider, prov)
  }

  return {
    totalRequests,
    totalCostCents,
    totalArtifacts,
    appCount: appMap.size,
    topApps: [...appMap.entries()]
      .map(([appSlug, d]) => ({ appSlug, ...d }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10),
    topCapabilities: [...capMap.entries()]
      .map(([capability, requests]) => ({ capability, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10),
    topProviders: [...provMap.entries()]
      .map(([provider, d]) => ({ provider, ...d }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10),
  }
}

/**
 * Get today's usage for an app (for budget enforcement).
 */
export async function getTodayUsage(appSlug: string): Promise<{
  requests: number
  costCents: number
  byCapability: Record<string, number>
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rows = await prisma.usageMeter.findMany({
    where: { appSlug, date: today },
  })

  const byCapability: Record<string, number> = {}
  let requests = 0
  let costCents = 0

  for (const r of rows) {
    requests += r.requestCount
    costCents += r.costUsdCents
    byCapability[r.capability] = (byCapability[r.capability] ?? 0) + r.requestCount
  }

  return { requests, costCents, byCapability }
}

/**
 * Get this month's usage for an app (for monthly budget enforcement).
 */
export async function getMonthUsage(appSlug: string): Promise<{
  requests: number
  costCents: number
}> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const rows = await prisma.usageMeter.findMany({
    where: { appSlug, date: { gte: monthStart } },
  })

  let requests = 0
  let costCents = 0
  for (const r of rows) {
    requests += r.requestCount
    costCents += r.costUsdCents
  }

  return { requests, costCents }
}
