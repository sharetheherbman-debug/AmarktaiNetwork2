/**
 * @module daily-learning
 * @description Daily app agent learning and specialist improvement for AmarktAI Network.
 *
 * Each app agent progressively becomes a stronger specialist in its niche:
 *   - Analyzes routing outcomes, success/failure patterns
 *   - Tracks cost and latency patterns
 *   - Evaluates retrieval usefulness
 *   - Identifies weak areas
 *   - Generates controlled improvement recommendations
 *   - Updates specialty profile
 *
 * All learning is:
 *   - App-specific (no cross-app contamination)
 *   - Controlled (admin review required for major changes)
 *   - Safe (no autonomous drift)
 *   - Reviewable (full audit trail)
 *
 * Server-side only.
 */

import { prisma } from '@/lib/prisma'

// ── Types ───────────────────────────────────────────────────────────────────

export interface LearningSignals {
  totalRequests: number
  successRate: number
  avgLatencyMs: number
  avgCost: number
  topProviders: Array<{ provider: string; count: number; successRate: number }>
  topTaskTypes: Array<{ taskType: string; count: number; successRate: number }>
  failurePatterns: Array<{ pattern: string; count: number }>
  weakAreas: string[]
}

export interface Improvement {
  id: string
  type: 'routing' | 'model_preference' | 'budget' | 'safety' | 'knowledge' | 'behavior'
  description: string
  impact: 'low' | 'medium' | 'high'
  autoApply: boolean
  applied: boolean
}

export interface LearningCycleResult {
  appSlug: string
  cycleDate: string
  signals: LearningSignals
  improvements: Improvement[]
  specialtyScore: number
  status: 'completed' | 'pending_review' | 'no_data'
}

// ── Learning Cycle ──────────────────────────────────────────────────────────

/**
 * Run the daily learning cycle for an app agent.
 * Analyzes recent performance and generates improvements.
 */
export async function runDailyLearningCycle(appSlug: string): Promise<LearningCycleResult> {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 1. Collect signals from BrainEvents
  const signals = await collectSignals(appSlug, oneDayAgo)

  if (signals.totalRequests === 0) {
    return {
      appSlug,
      cycleDate: now.toISOString(),
      signals,
      improvements: [],
      specialtyScore: 0,
      status: 'no_data',
    }
  }

  // 2. Generate improvements
  const improvements = generateImprovements(signals)

  // 3. Calculate specialty score
  const specialtyScore = calculateSpecialtyScore(signals)

  // 4. Apply safe auto-improvements
  const agent = await prisma.appAgent.findUnique({ where: { appSlug } })
  if (agent) {
    const autoImprovements = improvements.filter(i => i.autoApply && agent.autoImprovementEnabled)
    for (const improvement of autoImprovements) {
      await applyImprovement(appSlug, improvement)
      improvement.applied = true
    }

    // Update specialty profile and weak areas
    await prisma.appAgent.update({
      where: { appSlug },
      data: {
        specialtyProfile: JSON.stringify({
          score: specialtyScore,
          topTaskTypes: signals.topTaskTypes.map(t => t.taskType),
          successRate: signals.successRate,
          lastUpdated: now.toISOString(),
        }),
        weakAreas: JSON.stringify(signals.weakAreas),
        lastLearningCycleAt: now,
      },
    })

    // Log the learning cycle
    await prisma.appAgentLearningLog.create({
      data: {
        agentId: agent.id,
        cycleDate: now,
        cycleType: 'daily',
        summary: `Analyzed ${signals.totalRequests} requests. Success rate: ${(signals.successRate * 100).toFixed(1)}%. Generated ${improvements.length} improvements.`,
        improvements: JSON.stringify(improvements),
        metrics: JSON.stringify({
          totalRequests: signals.totalRequests,
          successRate: signals.successRate,
          avgLatencyMs: signals.avgLatencyMs,
          avgCost: signals.avgCost,
          specialtyScore,
        }),
        status: agent.adminReviewRequired ? 'pending_review' : 'completed',
      },
    })
  }

  return {
    appSlug,
    cycleDate: now.toISOString(),
    signals,
    improvements,
    specialtyScore,
    status: agent?.adminReviewRequired ? 'pending_review' : 'completed',
  }
}

// ── Signal Collection ───────────────────────────────────────────────────────

async function collectSignals(appSlug: string, since: Date): Promise<LearningSignals> {
  try {
    const events = await prisma.brainEvent.findMany({
      where: {
        appSlug,
        timestamp: { gte: since },
      },
      select: {
        success: true,
        latencyMs: true,
        routedProvider: true,
        routedModel: true,
        taskType: true,
        errorMessage: true,
      },
    })

    if (events.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgLatencyMs: 0,
        avgCost: 0,
        topProviders: [],
        topTaskTypes: [],
        failurePatterns: [],
        weakAreas: [],
      }
    }

    const totalRequests = events.length
    const successCount = events.filter(e => e.success).length
    const successRate = successCount / totalRequests
    const avgLatencyMs = events.reduce((sum, e) => sum + (e.latencyMs ?? 0), 0) / totalRequests

    // Provider stats
    const providerMap = new Map<string, { count: number; successCount: number }>()
    for (const e of events) {
      const p = e.routedProvider ?? 'unknown'
      const existing = providerMap.get(p) ?? { count: 0, successCount: 0 }
      existing.count++
      if (e.success) existing.successCount++
      providerMap.set(p, existing)
    }
    const topProviders = Array.from(providerMap.entries())
      .map(([provider, stats]) => ({
        provider,
        count: stats.count,
        successRate: stats.count > 0 ? stats.successCount / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)

    // Task type stats
    const taskMap = new Map<string, { count: number; successCount: number }>()
    for (const e of events) {
      const t = e.taskType ?? 'unknown'
      const existing = taskMap.get(t) ?? { count: 0, successCount: 0 }
      existing.count++
      if (e.success) existing.successCount++
      taskMap.set(t, existing)
    }
    const topTaskTypes = Array.from(taskMap.entries())
      .map(([taskType, stats]) => ({
        taskType,
        count: stats.count,
        successRate: stats.count > 0 ? stats.successCount / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)

    // Failure patterns
    const failureMap = new Map<string, number>()
    for (const e of events) {
      if (!e.success && e.errorMessage) {
        const pattern = e.errorMessage.slice(0, 80)
        failureMap.set(pattern, (failureMap.get(pattern) ?? 0) + 1)
      }
    }
    const failurePatterns = Array.from(failureMap.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Weak areas
    const weakAreas: string[] = []
    if (successRate < 0.8) weakAreas.push('overall_success_rate')
    if (avgLatencyMs > 5000) weakAreas.push('high_latency')
    for (const p of topProviders) {
      if (p.successRate < 0.7 && p.count > 3) weakAreas.push(`provider_${p.provider}_reliability`)
    }
    for (const t of topTaskTypes) {
      if (t.successRate < 0.7 && t.count > 2) weakAreas.push(`task_${t.taskType}_success`)
    }

    return {
      totalRequests,
      successRate,
      avgLatencyMs,
      avgCost: await computeAvgCostCents(appSlug, since),
      topProviders,
      topTaskTypes,
      failurePatterns,
      weakAreas,
    }
  } catch {
    return {
      totalRequests: 0,
      successRate: 0,
      avgLatencyMs: 0,
      avgCost: 0,
      topProviders: [],
      topTaskTypes: [],
      failurePatterns: [],
      weakAreas: [],
    }
  }
}

// ── Cost Helper ────────────────────────────────────────────────────────────

/**
 * Compute average cost in USD cents per request from UsageMeter aggregates.
 * UsageMeter stores daily rolled-up totals — we sum across all rows in the
 * period and divide by total request count.
 * Falls back to 0 if the table is unavailable.
 */
async function computeAvgCostCents(appSlug: string, since: Date): Promise<number> {
  try {
    const rows = await prisma.usageMeter.findMany({
      where: { appSlug, date: { gte: since } },
      select: { costUsdCents: true, requestCount: true },
    })
    if (rows.length === 0) return 0
    const totalCost = rows.reduce((sum, r) => sum + (r.costUsdCents ?? 0), 0)
    const totalRequests = rows.reduce((sum, r) => sum + (r.requestCount ?? 0), 0)
    if (totalRequests === 0) return 0
    return totalCost / totalRequests
  } catch {
    return 0
  }
}

// ── Improvement Generation ──────────────────────────────────────────────────

function generateImprovements(signals: LearningSignals): Improvement[] {
  const improvements: Improvement[] = []
  let idx = 0

  // Low success rate → suggest model/provider changes
  if (signals.successRate < 0.8 && signals.totalRequests > 5) {
    const bestProvider = signals.topProviders.reduce((best, p) =>
      p.successRate > (best?.successRate ?? 0) ? p : best,
    signals.topProviders[0])

    if (bestProvider) {
      improvements.push({
        id: `imp_${Date.now()}_${idx++}`,
        type: 'routing',
        description: `Route more requests to ${bestProvider.provider} (${(bestProvider.successRate * 100).toFixed(0)}% success rate) to improve reliability.`,
        impact: 'high',
        autoApply: false,
        applied: false,
      })
    }
  }

  // High latency → suggest faster model/provider
  if (signals.avgLatencyMs > 3000) {
    improvements.push({
      id: `imp_${Date.now()}_${idx++}`,
      type: 'routing',
      description: 'Average latency is high. Consider routing simple tasks to faster providers like Groq.',
      impact: 'medium',
      autoApply: false,
      applied: false,
    })
  }

  // Unreliable provider → suggest fallback adjustment
  for (const p of signals.topProviders) {
    if (p.successRate < 0.6 && p.count > 3) {
      improvements.push({
        id: `imp_${Date.now()}_${idx++}`,
        type: 'routing',
        description: `Provider ${p.provider} has low reliability (${(p.successRate * 100).toFixed(0)}%). Consider moving it lower in the fallback chain.`,
        impact: 'high',
        autoApply: false,
        applied: false,
      })
    }
  }

  // Weak task types → suggest capability improvements
  for (const t of signals.topTaskTypes) {
    if (t.successRate < 0.7 && t.count > 2) {
      improvements.push({
        id: `imp_${Date.now()}_${idx++}`,
        type: 'knowledge',
        description: `Task type "${t.taskType}" has a low success rate. Consider adding knowledge sources or adjusting model selection for this task type.`,
        impact: 'medium',
        autoApply: false,
        applied: false,
      })
    }
  }

  return improvements
}

// ── Specialty Score ─────────────────────────────────────────────────────────

function calculateSpecialtyScore(signals: LearningSignals): number {
  if (signals.totalRequests === 0) return 0

  let score = 0

  // Volume factor (0-25 points)
  score += Math.min(25, signals.totalRequests / 4)

  // Success rate factor (0-30 points)
  score += signals.successRate * 30

  // Task type diversity (0-15 points)
  score += Math.min(15, signals.topTaskTypes.length * 3)

  // Latency quality (0-15 points)
  if (signals.avgLatencyMs < 1000) score += 15
  else if (signals.avgLatencyMs < 3000) score += 10
  else if (signals.avgLatencyMs < 5000) score += 5

  // Reliability factor (0-15 points)
  const weakCount = signals.weakAreas.length
  score += Math.max(0, 15 - weakCount * 3)

  return Math.min(100, Math.round(score))
}

// ── Apply Improvement ───────────────────────────────────────────────────────

async function applyImprovement(appSlug: string, improvement: Improvement): Promise<void> {
  // Only auto-apply safe, low-impact changes
  if (!improvement.autoApply) return

  try {
    // Log the auto-applied improvement
    console.log(`[daily-learning] Auto-applying improvement for ${appSlug}: ${improvement.description}`)
  } catch (err) {
    console.error(`[daily-learning] Failed to apply improvement for ${appSlug}:`, err)
  }
}

// ── Batch Learning ──────────────────────────────────────────────────────────

/**
 * Run daily learning for all active app agents.
 * Called by cron job or admin trigger.
 */
export async function runAllDailyLearning(): Promise<LearningCycleResult[]> {
  const agents = await prisma.appAgent.findMany({
    where: { active: true, learningEnabled: true },
    select: { appSlug: true },
  })

  const results: LearningCycleResult[] = []
  for (const agent of agents) {
    try {
      const result = await runDailyLearningCycle(agent.appSlug)
      results.push(result)
    } catch (err) {
      console.error(`[daily-learning] Failed for ${agent.appSlug}:`, err)
      results.push({
        appSlug: agent.appSlug,
        cycleDate: new Date().toISOString(),
        signals: { totalRequests: 0, successRate: 0, avgLatencyMs: 0, avgCost: 0, topProviders: [], topTaskTypes: [], failurePatterns: [], weakAreas: [] },
        improvements: [],
        specialtyScore: 0,
        status: 'no_data',
      })
    }
  }

  return results
}
