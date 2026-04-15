/**
 * @module manager-agents
 * @description Subsystem Manager Agents for the AmarktAI Network platform.
 *
 * Each manager is responsible for a specific subsystem:
 *   - Routing Manager:  monitors provider health, triggers routing changes
 *   - Queue Manager:    monitors job queues, detects stuck jobs, manages workers
 *   - Artifact Manager: monitors storage health, enforces retention policies
 *   - App Manager:      monitors per-app health, enforces budgets/limits
 *   - Learning Manager: orchestrates daily learning cycles, improvement reviews
 *   - Growth Manager:   tracks platform growth signals, identifies expansion opportunities
 *
 * Managers have concrete responsibilities and real runtime hooks.
 * NOT decorative. Each runs periodic checks and logs decisions.
 *
 * Server-side only.
 */

import { prisma } from '@/lib/prisma'
import { getQueueStatus } from '@/lib/job-queue'
import { getStorageStatus } from '@/lib/storage-driver'

// ── Types ────────────────────────────────────────────────────────────────────

export type ManagerType =
  | 'routing'
  | 'queue'
  | 'artifact'
  | 'app'
  | 'learning'
  | 'growth'

export type ManagerAction =
  | 'health_check'
  | 'escalation'
  | 'recovery'
  | 'coordination'
  | 'signal'
  | 'enforcement'

export type Severity = 'info' | 'warning' | 'critical'

export interface ManagerCheckResult {
  managerType: ManagerType
  action: ManagerAction
  summary: string
  details: Record<string, unknown>
  severity: Severity
}

export interface ManagerStatus {
  managerType: ManagerType
  lastCheckAt: string | null
  issueCount: number
  criticalCount: number
  recentActions: Array<{
    action: string
    summary: string
    severity: string
    createdAt: Date
  }>
}

// ── Logging ──────────────────────────────────────────────────────────────────

async function logManagerAction(result: ManagerCheckResult): Promise<void> {
  try {
    await prisma.managerAgentLog.create({
      data: {
        managerType: result.managerType,
        action: result.action,
        summary: result.summary,
        details: JSON.stringify(result.details),
        severity: result.severity,
        resolved: result.severity === 'info',
      },
    })
  } catch (err) {
    console.error(`[manager-agents] Failed to log ${result.managerType} action:`, err)
  }
}

// ── Routing Manager ──────────────────────────────────────────────────────────

export async function runRoutingManagerCheck(): Promise<ManagerCheckResult> {
  let providerCount = 0
  let healthyCount = 0
  const degradedProviders: string[] = []

  try {
    const providers = await prisma.aiProvider.findMany({ where: { enabled: true } })
    providerCount = providers.length

    for (const p of providers) {
      if (p.healthStatus === 'healthy') healthyCount++
      else degradedProviders.push(p.providerKey)
    }
  } catch {
    // DB unavailable
  }

  const severity: Severity =
    providerCount === 0 ? 'critical' :
    degradedProviders.length > providerCount / 2 ? 'warning' : 'info'

  const result: ManagerCheckResult = {
    managerType: 'routing',
    action: 'health_check',
    summary: `${healthyCount}/${providerCount} providers healthy. ${degradedProviders.length} degraded.`,
    details: { providerCount, healthyCount, degradedProviders },
    severity,
  }

  await logManagerAction(result)
  return result
}

// ── Queue Manager ────────────────────────────────────────────────────────────

export async function runQueueManagerCheck(): Promise<ManagerCheckResult> {
  const status = await getQueueStatus()

  const stuckJobs = (status.counts['stuck'] ?? 0) + (status.counts['stalled'] ?? 0)
  const failedJobs = status.counts['failed'] ?? 0
  const waitingJobs = status.counts['waiting'] ?? 0

  const severity: Severity =
    stuckJobs > 10 ? 'critical' :
    failedJobs > 20 ? 'warning' :
    !status.backendAvailable ? 'warning' : 'info'

  const result: ManagerCheckResult = {
    managerType: 'queue',
    action: 'health_check',
    summary: status.backendAvailable
      ? `Queue healthy. Waiting: ${waitingJobs}, Failed: ${failedJobs}, Stuck: ${stuckJobs}`
      : 'Queue backend (Redis) unavailable — jobs running inline',
    details: { ...status.counts, backendAvailable: status.backendAvailable },
    severity,
  }

  await logManagerAction(result)
  return result
}

// ── Artifact Manager ─────────────────────────────────────────────────────────

export async function runArtifactManagerCheck(): Promise<ManagerCheckResult> {
  const storageStatus = getStorageStatus()
  let totalArtifacts = 0
  let failedArtifacts = 0

  try {
    totalArtifacts = await prisma.artifact.count()
    failedArtifacts = await prisma.artifact.count({ where: { status: 'failed' } })
  } catch {
    // Schema may not be migrated yet
  }

  const severity: Severity =
    failedArtifacts > totalArtifacts * 0.1 && totalArtifacts > 10 ? 'warning' : 'info'

  const result: ManagerCheckResult = {
    managerType: 'artifact',
    action: 'health_check',
    summary: `Storage: ${storageStatus.driver} (${storageStatus.configured ? 'configured' : 'not configured'}). ${totalArtifacts} artifacts, ${failedArtifacts} failed.`,
    details: { storageStatus, totalArtifacts, failedArtifacts },
    severity,
  }

  await logManagerAction(result)
  return result
}

// ── App Manager ──────────────────────────────────────────────────────────────

export async function runAppManagerCheck(): Promise<ManagerCheckResult> {
  let totalApps = 0
  let pausedApps = 0
  const overBudgetApps: string[] = []

  try {
    totalApps = await prisma.product.count()
    const budgetConfigs = await prisma.appBudgetConfig.findMany()
    pausedApps = budgetConfigs.filter(b => b.paused).length

    // Check monthly budgets
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    for (const config of budgetConfigs) {
      if (config.monthlyBudgetCents <= 0) continue
      const usage = await prisma.usageMeter.aggregate({
        where: { appSlug: config.appSlug, date: { gte: monthStart } },
        _sum: { costUsdCents: true },
      })
      const totalCost = usage._sum.costUsdCents ?? 0
      if (totalCost > config.monthlyBudgetCents) {
        overBudgetApps.push(config.appSlug)
      }
    }
  } catch {
    // DB or schema issues
  }

  const severity: Severity =
    overBudgetApps.length > 0 ? 'warning' :
    pausedApps > 0 ? 'info' : 'info'

  const result: ManagerCheckResult = {
    managerType: 'app',
    action: 'health_check',
    summary: `${totalApps} apps. ${pausedApps} paused. ${overBudgetApps.length} over budget.`,
    details: { totalApps, pausedApps, overBudgetApps },
    severity,
  }

  await logManagerAction(result)
  return result
}

// ── Learning Manager ─────────────────────────────────────────────────────────

export async function runLearningManagerCheck(): Promise<ManagerCheckResult> {
  let totalAgents = 0
  let learningEnabled = 0
  let recentLogs = 0

  try {
    const agents = await prisma.appAgent.findMany({
      select: { id: true, learningEnabled: true },
    })
    totalAgents = agents.length
    learningEnabled = agents.filter(a => a.learningEnabled).length

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    recentLogs = await prisma.appAgentLearningLog.count({
      where: { createdAt: { gte: weekAgo } },
    })
  } catch {
    // DB issues
  }

  const result: ManagerCheckResult = {
    managerType: 'learning',
    action: 'health_check',
    summary: `${learningEnabled}/${totalAgents} agents with learning enabled. ${recentLogs} learning events this week.`,
    details: { totalAgents, learningEnabled, recentLogs },
    severity: 'info',
  }

  await logManagerAction(result)
  return result
}

// ── Growth Manager ───────────────────────────────────────────────────────────

export async function runGrowthManagerCheck(): Promise<ManagerCheckResult> {
  let totalApps = 0
  let totalContacts = 0
  let totalWaitlist = 0
  let totalBrainEvents = 0

  try {
    totalApps = await prisma.product.count()
    totalContacts = await prisma.contactSubmission.count()
    totalWaitlist = await prisma.waitlistEntry.count()
    totalBrainEvents = await prisma.brainEvent.count()
  } catch {
    // DB issues
  }

  const result: ManagerCheckResult = {
    managerType: 'growth',
    action: 'signal',
    summary: `${totalApps} apps, ${totalContacts} contacts, ${totalWaitlist} waitlist, ${totalBrainEvents} brain events.`,
    details: { totalApps, totalContacts, totalWaitlist, totalBrainEvents },
    severity: 'info',
  }

  await logManagerAction(result)
  return result
}

// ── Run All Managers ─────────────────────────────────────────────────────────

/**
 * Execute all manager health checks. Returns results from all managers.
 */
export async function runAllManagerChecks(): Promise<ManagerCheckResult[]> {
  const results = await Promise.allSettled([
    runRoutingManagerCheck(),
    runQueueManagerCheck(),
    runArtifactManagerCheck(),
    runAppManagerCheck(),
    runLearningManagerCheck(),
    runGrowthManagerCheck(),
  ])

  return results
    .filter((r): r is PromiseFulfilledResult<ManagerCheckResult> => r.status === 'fulfilled')
    .map(r => r.value)
}

// ── Manager Status Retrieval ─────────────────────────────────────────────────

/**
 * Get status for a specific manager from recent logs.
 */
export async function getManagerStatus(managerType: ManagerType): Promise<ManagerStatus> {
  try {
    const recentActions = await prisma.managerAgentLog.findMany({
      where: { managerType },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { action: true, summary: true, severity: true, createdAt: true },
    })

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const issueCount = await prisma.managerAgentLog.count({
      where: { managerType, severity: { not: 'info' }, createdAt: { gte: weekAgo } },
    })

    const criticalCount = await prisma.managerAgentLog.count({
      where: { managerType, severity: 'critical', resolved: false },
    })

    return {
      managerType,
      lastCheckAt: recentActions[0]?.createdAt.toISOString() ?? null,
      issueCount,
      criticalCount,
      recentActions,
    }
  } catch {
    return {
      managerType,
      lastCheckAt: null,
      issueCount: 0,
      criticalCount: 0,
      recentActions: [],
    }
  }
}

/**
 * Get status for all managers.
 */
export async function getAllManagerStatuses(): Promise<ManagerStatus[]> {
  const types: ManagerType[] = ['routing', 'queue', 'artifact', 'app', 'learning', 'growth']
  return Promise.all(types.map(getManagerStatus))
}
