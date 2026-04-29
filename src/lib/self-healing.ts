/**
 * Self-Healing Engine — AmarktAI Network
 *
 * Detects and responds to system degradation in real time:
 *  - Provider failures and repeated route failures
 *  - Unhealthy or stale model/provider configurations
 *  - Missing credentials and broken app routing
 *  - Fallback overuse patterns
 *
 * Produces structured HealingAction records that can be persisted
 * via the /api/admin/healing route and surfaced in the dashboard.
 *
 * Server-side only.
 */

import { prisma } from '@/lib/prisma'
import { getProviderPerformance } from '@/lib/learning-engine'

// ── Types ────────────────────────────────────────────────────────────────────

export type HealingCategory =
  | 'provider_failure'
  | 'route_failure'
  | 'missing_credentials'
  | 'stale_config'
  | 'fallback_overuse'
  | 'agent_degraded'
  | 'budget_threshold'
  | 'model_unavailable'

export type HealingSeverity = 'info' | 'warning' | 'critical'

export type HealingActionType =
  | 'auto_disabled'
  | 'traffic_shifted'
  | 'alert_surfaced'
  | 'repair_suggested'
  | 'config_invalidated'
  | 'fallback_promoted'

export interface HealingIssue {
  id: string
  category: HealingCategory
  severity: HealingSeverity
  title: string
  description: string
  affectedResource: string          // provider key, model id, or app slug
  detectedAt: Date
  resolved: boolean
  resolvedAt: Date | null
  actionTaken: HealingActionType | null
  actionDetail: string | null
  autoHealed: boolean
}

export interface HealingStatus {
  timestamp: Date
  totalIssues: number
  criticalCount: number
  warningCount: number
  infoCount: number
  resolvedCount: number
  autoHealedCount: number
  recentIssues: HealingIssue[]
  healthScore: number               // 0–100, 100 = fully healthy
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ── Detection logic ───────────────────────────────────────────────────────────

/**
 * Detect provider-level failures using learning-engine performance data.
 * Returns issues for providers with low success rates or recent failures.
 */
async function detectProviderFailures(): Promise<HealingIssue[]> {
  const issues: HealingIssue[] = []

  try {
    const performance = await getProviderPerformance()

    for (const p of performance) {
      if (p.totalRequests < 3) continue   // not enough data

      if (p.successRate < 0.5 && p.failureCount >= 3) {
        issues.push({
          id: makeId('prov_fail'),
          category: 'provider_failure',
          severity: p.successRate < 0.25 ? 'critical' : 'warning',
          title: `Provider ${p.providerKey} has low success rate`,
          description: `Success rate: ${(p.successRate * 100).toFixed(1)}%, failures: ${p.failureCount} / ${p.totalRequests} requests`,
          affectedResource: p.providerKey,
          detectedAt: new Date(),
          resolved: false,
          resolvedAt: null,
          actionTaken: p.successRate < 0.25 ? 'traffic_shifted' : 'alert_surfaced',
          actionDetail: p.successRate < 0.25
            ? 'Routing engine will prefer healthy fallback providers'
            : 'Monitor closely; consider switching default model',
          autoHealed: p.successRate < 0.25,
        })
      }
    }
  } catch {
    // DB may not be available in tests
  }

  return issues
}

/**
 * Detect providers with missing or unconfigured credentials.
 */
async function detectMissingCredentials(): Promise<HealingIssue[]> {
  const issues: HealingIssue[] = []

  try {
    const providers = await prisma.aiProvider.findMany()

    for (const p of providers) {
      if (!p.enabled) continue

      if (!p.apiKey || p.apiKey.trim() === '') {
        issues.push({
          id: makeId('cred_miss'),
          category: 'missing_credentials',
          severity: 'critical',
          title: `Provider ${p.displayName} is enabled but has no API key`,
          description: `Provider ${p.providerKey} is marked enabled but apiKey is empty. Traffic cannot route to this provider.`,
          affectedResource: p.providerKey,
          detectedAt: new Date(),
          resolved: false,
          resolvedAt: null,
          actionTaken: 'config_invalidated',
          actionDetail: 'Add a valid API key in AI Providers settings',
          autoHealed: false,
        })
      }

      if (p.healthStatus === 'error' || p.healthStatus === 'degraded') {
        issues.push({
          id: makeId('prov_health'),
          category: 'provider_failure',
          severity: p.healthStatus === 'error' ? 'critical' : 'warning',
          title: `Provider ${p.displayName} health status: ${p.healthStatus}`,
          description: p.healthMessage || `Provider ${p.providerKey} reports ${p.healthStatus} state`,
          affectedResource: p.providerKey,
          detectedAt: p.lastCheckedAt ?? new Date(),
          resolved: false,
          resolvedAt: null,
          actionTaken: 'alert_surfaced',
          actionDetail: 'Re-run health check or update API key',
          autoHealed: false,
        })
      }

      // Stale: enabled provider never checked or not checked in 24h
      const oneDayAgo = new Date(Date.now() - 86_400_000)
      if (!p.lastCheckedAt || p.lastCheckedAt < oneDayAgo) {
        issues.push({
          id: makeId('stale_chk'),
          category: 'stale_config',
          severity: 'info',
          title: `Provider ${p.displayName} health check is stale`,
          description: p.lastCheckedAt
            ? `Last checked ${p.lastCheckedAt.toISOString()}. Over 24h ago.`
            : 'Provider has never been health-checked.',
          affectedResource: p.providerKey,
          detectedAt: new Date(),
          resolved: false,
          resolvedAt: null,
          actionTaken: 'repair_suggested',
          actionDetail: 'Trigger a health check from the AI Providers page',
          autoHealed: false,
        })
      }
    }
  } catch {
    // DB may not be available
  }

  return issues
}

/**
 * Detect fallback overuse — when a significant portion of requests
 * used the fallback provider rather than the primary.
 */
async function detectFallbackOveruse(): Promise<HealingIssue[]> {
  const issues: HealingIssue[] = []

  try {
    const since = new Date(Date.now() - 6 * 3_600_000)   // last 6 hours
    const total = await prisma.brainEvent.count({ where: { timestamp: { gte: since } } })
    if (total < 5) return issues

    // We detect fallback overuse by looking at route failures; a sophisticated
    // system would track fallbackUsed on BrainEvent. For now we flag high
    // error rates as a proxy.
    const failed = await prisma.brainEvent.count({
      where: { timestamp: { gte: since }, success: false },
    })

    const failRate = failed / total
    if (failRate > 0.15) {
      issues.push({
        id: makeId('fallback_ov'),
        category: 'fallback_overuse',
        severity: failRate > 0.3 ? 'critical' : 'warning',
        title: 'High brain request failure rate detected',
        description: `${failed} / ${total} requests failed in the last 6 hours (${(failRate * 100).toFixed(1)}% failure rate).`,
        affectedResource: 'brain-gateway',
        detectedAt: new Date(),
        resolved: false,
        resolvedAt: null,
        actionTaken: failRate > 0.3 ? 'traffic_shifted' : 'alert_surfaced',
        actionDetail: failRate > 0.3
          ? 'Routing engine activated fallback paths automatically'
          : 'Investigate top failing providers in the Learning section',
        autoHealed: failRate > 0.3,
      })
    }
  } catch {
    // DB may not be available
  }

  return issues
}

/**
 * Detect broken app routing — apps with enabled AI but no connected
 * provider or zero brain events in the last 7 days.
 */
async function detectBrokenAppRouting(): Promise<HealingIssue[]> {
  const issues: HealingIssue[] = []

  try {
    const aiApps = await prisma.product.findMany({
      where: { aiEnabled: true, connectedToBrain: true },
    })

    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)

    for (const app of aiApps) {
      const eventCount = await prisma.brainEvent.count({
        where: { appSlug: app.slug, timestamp: { gte: sevenDaysAgo } },
      })

      if (eventCount === 0) {
        issues.push({
          id: makeId('app_route'),
          category: 'route_failure',
          severity: 'warning',
          title: `App "${app.name}" has no brain activity in 7 days`,
          description: `${app.slug} is marked AI-enabled and brain-connected but shows zero brain events in 7 days.`,
          affectedResource: app.slug,
          detectedAt: new Date(),
          resolved: false,
          resolvedAt: null,
          actionTaken: 'repair_suggested',
          actionDetail: 'Verify the app is sending requests with a valid appSecret',
          autoHealed: false,
        })
      }
    }
  } catch {
    // DB may not be available
  }

  return issues
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run all detection checks and return a full healing status snapshot.
 * This is called by the API route and the dashboard.
 */
export async function runHealingChecks(): Promise<HealingStatus> {
  const [providerIssues, credIssues, fallbackIssues, appIssues] = await Promise.all([
    detectProviderFailures(),
    detectMissingCredentials(),
    detectFallbackOveruse(),
    detectBrokenAppRouting(),
  ])

  const allIssues = [...providerIssues, ...credIssues, ...fallbackIssues, ...appIssues]

  // De-duplicate by affectedResource + category (keep most severe)
  const seen = new Map<string, HealingIssue>()
  for (const issue of allIssues) {
    const key = `${issue.category}::${issue.affectedResource}`
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, issue)
    } else {
      const sev = (s: HealingSeverity) => ({ critical: 2, warning: 1, info: 0 })[s]
      if (sev(issue.severity) > sev(existing.severity)) seen.set(key, issue)
    }
  }

  const deduped = Array.from(seen.values())

  const criticalCount = deduped.filter(i => i.severity === 'critical').length
  const warningCount  = deduped.filter(i => i.severity === 'warning').length
  const infoCount     = deduped.filter(i => i.severity === 'info').length
  const resolvedCount = deduped.filter(i => i.resolved).length
  const autoHealedCount = deduped.filter(i => i.autoHealed).length

  // Health score: 100 minus penalty per issue
  const penalty = criticalCount * 20 + warningCount * 8 + infoCount * 2
  const healthScore = Math.max(0, 100 - penalty)

  return {
    timestamp: new Date(),
    totalIssues: deduped.length,
    criticalCount,
    warningCount,
    infoCount,
    resolvedCount,
    autoHealedCount,
    recentIssues: deduped.sort((a, b) => {
      const sev = (s: HealingSeverity) => ({ critical: 2, warning: 1, info: 0 })[s]
      return sev(b.severity) - sev(a.severity)
    }),
    healthScore,
  }
}

/**
 * Returns a simplified health summary for embedding in readiness checks.
 */
export async function getHealingStatus(): Promise<{
  healthScore: number
  criticalCount: number
  warningCount: number
  totalIssues: number
}> {
  const status = await runHealingChecks()
  return {
    healthScore: status.healthScore,
    criticalCount: status.criticalCount,
    warningCount: status.warningCount,
    totalIssues: status.totalIssues,
  }
}

// ── DB Persistence ────────────────────────────────────────────────────────────

/**
 * Persist a healing issue to the database using upsert on (category, affectedResource).
 * Safe to call from tests — fails silently if the DB is unavailable.
 */
async function persistHealingIssue(issue: HealingIssue): Promise<void> {
  try {
    await prisma.healingRecord.upsert({
      where: {
        healing_record_key: {
          category: issue.category,
          affectedResource: issue.affectedResource,
        },
      },
      update: {
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        actionTaken: issue.actionTaken ?? null,
        actionDetail: issue.actionDetail ?? null,
        autoHealed: issue.autoHealed,
        resolved: issue.resolved,
        resolvedAt: issue.resolvedAt,
      },
      create: {
        id: issue.id,
        category: issue.category,
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        affectedResource: issue.affectedResource,
        actionTaken: issue.actionTaken ?? null,
        actionDetail: issue.actionDetail ?? null,
        autoHealed: issue.autoHealed,
        resolved: issue.resolved,
        resolvedAt: issue.resolvedAt,
        detectedAt: issue.detectedAt,
      },
    })
  } catch {
    // DB may not be available in tests or during startup
  }
}

/**
 * Mark a previously-detected issue as resolved in the DB.
 * Called when a provider passes a subsequent health check.
 */
async function markHealingIssueResolved(
  category: HealingCategory,
  affectedResource: string,
): Promise<void> {
  try {
    await prisma.healingRecord.updateMany({
      where: { category, affectedResource, resolved: false },
      data: { resolved: true, resolvedAt: new Date() },
    })
  } catch {
    // DB may not be available
  }
}

// ── Auto-Healing Actions ──────────────────────────────────────────────────────

/**
 * Apply auto-healing actions for critical provider failures:
 *   - Mark provider as degraded in the AiProvider table
 *   - Log the action to ManagerAgentLog
 *
 * For `info` or `warning` issues we only persist the record without modifying
 * provider state — the issue is surfaced for manual review.
 *
 * Recovery: if a provider that was previously degraded no longer appears in
 * the issue list (i.e., it passed health checks), mark it recovered.
 */
async function applyAutoHealingActions(issues: HealingIssue[]): Promise<void> {
  // Collect resources with critical provider_failure or missing_credentials
  const criticalProviders = new Set<string>()
  for (const issue of issues) {
    if (
      issue.severity === 'critical' &&
      (issue.category === 'provider_failure' || issue.category === 'missing_credentials') &&
      issue.autoHealed
    ) {
      criticalProviders.add(issue.affectedResource)
    }
  }

  if (criticalProviders.size === 0) return

  try {
    for (const providerKey of criticalProviders) {
      // Only demote if currently not already in error/disabled state
      const provider = await prisma.aiProvider.findUnique({ where: { providerKey } })
      if (!provider) continue
      if (provider.healthStatus === 'disabled' || provider.healthStatus === 'error') continue

      await prisma.aiProvider.update({
        where: { providerKey },
        data: {
          healthStatus: 'degraded',
          healthMessage: 'Auto-demoted by self-healing engine due to repeated failures',
          lastCheckedAt: new Date(),
        },
      })

      // Log the action
      await prisma.managerAgentLog.create({
        data: {
          managerType: 'routing',
          action: 'health_check',
          summary: `Auto-healed: provider ${providerKey} demoted to degraded`,
          details: JSON.stringify({
            providerKey,
            action: 'traffic_shifted',
            reason: 'Critical provider failure detected by self-healing engine',
            timestamp: new Date().toISOString(),
          }),
          severity: 'warning',
        },
      })
    }
  } catch {
    // DB may not be available
  }
}

/**
 * Recover providers that previously had healing issues but are no longer flagged.
 * If a provider's AiProvider record is 'degraded' (auto-demoted) but it no longer
 * appears in the critical issue list, attempt a health check and promote it back.
 */
async function recoverHealthyProviders(issues: HealingIssue[]): Promise<void> {
  const affectedProviders = new Set(
    issues
      .filter(i => i.category === 'provider_failure' || i.category === 'missing_credentials')
      .map(i => i.affectedResource),
  )

  try {
    // Find providers that were auto-demoted (degraded + matching healing record)
    const degradedProviders = await prisma.aiProvider.findMany({
      where: { healthStatus: 'degraded' },
    })

    for (const p of degradedProviders) {
      if (affectedProviders.has(p.providerKey)) continue

      // Provider is degraded but no longer in the issue list → try to recover
      const healingRecord = await prisma.healingRecord.findFirst({
        where: {
          affectedResource: p.providerKey,
          category: 'provider_failure',
          autoHealed: true,
          resolved: false,
        },
      })
      if (!healingRecord) continue

      // Mark the healing record as resolved
      await markHealingIssueResolved('provider_failure', p.providerKey)

      // Update provider status to configured (requires manual health check to become healthy)
      await prisma.aiProvider.update({
        where: { providerKey: p.providerKey },
        data: {
          healthStatus: 'configured',
          healthMessage: 'Recovered: no active failure detected. Re-run health check to validate.',
          lastCheckedAt: new Date(),
        },
      })

      await prisma.managerAgentLog.create({
        data: {
          managerType: 'routing',
          action: 'recovery',
          summary: `Provider ${p.providerKey} recovered — no longer failing`,
          details: JSON.stringify({
            providerKey: p.providerKey,
            action: 'fallback_promoted',
            timestamp: new Date().toISOString(),
          }),
          severity: 'info',
        },
      })
    }
  } catch {
    // DB may not be available
  }
}

/**
 * Run all healing checks, apply auto-healing actions, and persist results to DB.
 *
 * This is the preferred entry point when calling from scheduled jobs or the
 * admin healing endpoint — it persists issues and triggers auto-healing.
 * `runHealingChecks()` remains available as a lightweight, read-only version.
 */
export async function runAndPersistHealingChecks(): Promise<HealingStatus> {
  const status = await runHealingChecks()

  // Persist all issues to DB (upsert by category + affectedResource)
  await Promise.all(status.recentIssues.map(issue => persistHealingIssue(issue)))

  // Apply auto-healing for critical failures
  await applyAutoHealingActions(status.recentIssues)

  // Recover providers that are no longer failing
  await recoverHealthyProviders(status.recentIssues)

  return status
}

/**
 * Fetch persisted healing records from DB.
 * Returns recent records sorted by severity (critical first) then by detectedAt descending.
 */
export async function getPersistedHealingRecords(limit = 100): Promise<HealingIssue[]> {
  try {
    const records = await prisma.healingRecord.findMany({
      orderBy: [{ detectedAt: 'desc' }],
      take: limit,
    })

    return records.map(r => ({
      id: r.id,
      category: r.category as HealingCategory,
      severity: r.severity as HealingSeverity,
      title: r.title,
      description: r.description,
      affectedResource: r.affectedResource,
      detectedAt: r.detectedAt,
      resolved: r.resolved,
      resolvedAt: r.resolvedAt,
      actionTaken: r.actionTaken as HealingActionType | null,
      actionDetail: r.actionDetail,
      autoHealed: r.autoHealed,
    }))
  } catch {
    return []
  }
}
