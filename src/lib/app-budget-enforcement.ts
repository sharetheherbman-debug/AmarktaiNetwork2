/**
 * @module app-budget-enforcement
 * @description Per-app budget/limit enforcement for the AmarktAI Network platform.
 *
 * Reads AppBudgetConfig from DB and enforces:
 *   - Monthly/daily spend ceilings
 *   - Request rate caps
 *   - Capability quotas
 *   - Emergency pause
 *   - Premium capability toggles
 *
 * Called by the brain execute flow before routing a request.
 *
 * Server-side only.
 */

import { prisma } from '@/lib/prisma'
import { getTodayUsage, getMonthUsage } from '@/lib/usage-meter'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BudgetCheckResult {
  allowed: boolean
  reason?: string
  budgetStatus: 'ok' | 'warning' | 'exceeded' | 'paused' | 'no_config'
  dailySpendCents: number
  monthlySpendCents: number
  dailyLimitCents: number
  monthlyLimitCents: number
}

export interface AppBudgetSummary {
  appSlug: string
  paused: boolean
  pauseReason: string
  monthlyBudgetCents: number
  dailyBudgetCents: number
  requestsPerMinute: number
  requestsPerDay: number
  currentMonthCostCents: number
  currentDayRequests: number
  capabilityQuotas: Record<string, number>
  premiumToggles: Record<string, boolean>
  status: 'ok' | 'warning' | 'exceeded' | 'paused'
}

// ── Config Cache ─────────────────────────────────────────────────────────────

const configCache = new Map<string, {
  config: {
    monthlyBudgetCents: number
    dailyBudgetCents: number
    requestsPerMinute: number
    requestsPerDay: number
    capabilityQuotas: Record<string, unknown>
    premiumToggles: Record<string, unknown>
    paused: boolean
    pauseReason: string
  }
  fetchedAt: number
}>()

const CACHE_TTL_MS = 60_000 // 1 minute

async function getConfig(appSlug: string) {
  const cached = configCache.get(appSlug)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.config
  }

  try {
    const row = await prisma.appBudgetConfig.findUnique({ where: { appSlug } })
    if (!row) return null

    const config = {
      monthlyBudgetCents: row.monthlyBudgetCents,
      dailyBudgetCents: row.dailyBudgetCents,
      requestsPerMinute: row.requestsPerMinute,
      requestsPerDay: row.requestsPerDay,
      capabilityQuotas: safeParseJSON(row.capabilityQuotas),
      premiumToggles: safeParseJSON(row.premiumToggles),
      paused: row.paused,
      pauseReason: row.pauseReason,
    }
    configCache.set(appSlug, { config, fetchedAt: Date.now() })
    return config
  } catch {
    return null
  }
}

function safeParseJSON(str: string): Record<string, unknown> {
  try { return JSON.parse(str) } catch { return {} }
}

// ── Budget Enforcement ───────────────────────────────────────────────────────

/**
 * Check if an app is allowed to make a request given its budget/limits.
 */
export async function checkAppBudget(
  appSlug: string,
  capability?: string,
): Promise<BudgetCheckResult> {
  const config = await getConfig(appSlug)

  if (!config) {
    return {
      allowed: true,
      budgetStatus: 'no_config',
      dailySpendCents: 0,
      monthlySpendCents: 0,
      dailyLimitCents: 0,
      monthlyLimitCents: 0,
    }
  }

  // Emergency pause
  if (config.paused) {
    return {
      allowed: false,
      reason: config.pauseReason || 'App is paused by administrator',
      budgetStatus: 'paused',
      dailySpendCents: 0,
      monthlySpendCents: 0,
      dailyLimitCents: config.dailyBudgetCents,
      monthlyLimitCents: config.monthlyBudgetCents,
    }
  }

  // Capability permission check
  if (capability) {
    const toggle = config.premiumToggles as Record<string, boolean>
    if (toggle[capability] === false) {
      return {
        allowed: false,
        reason: `Capability '${capability}' is disabled for this app`,
        budgetStatus: 'exceeded',
        dailySpendCents: 0,
        monthlySpendCents: 0,
        dailyLimitCents: config.dailyBudgetCents,
        monthlyLimitCents: config.monthlyBudgetCents,
      }
    }
  }

  // Budget checks
  const [todayUsage, monthUsage] = await Promise.all([
    getTodayUsage(appSlug),
    getMonthUsage(appSlug),
  ])

  // Daily budget
  if (config.dailyBudgetCents > 0 && todayUsage.costCents >= config.dailyBudgetCents) {
    return {
      allowed: false,
      reason: `Daily budget exceeded (${todayUsage.costCents}¢ / ${config.dailyBudgetCents}¢)`,
      budgetStatus: 'exceeded',
      dailySpendCents: todayUsage.costCents,
      monthlySpendCents: monthUsage.costCents,
      dailyLimitCents: config.dailyBudgetCents,
      monthlyLimitCents: config.monthlyBudgetCents,
    }
  }

  // Monthly budget
  if (config.monthlyBudgetCents > 0 && monthUsage.costCents >= config.monthlyBudgetCents) {
    return {
      allowed: false,
      reason: `Monthly budget exceeded (${monthUsage.costCents}¢ / ${config.monthlyBudgetCents}¢)`,
      budgetStatus: 'exceeded',
      dailySpendCents: todayUsage.costCents,
      monthlySpendCents: monthUsage.costCents,
      dailyLimitCents: config.dailyBudgetCents,
      monthlyLimitCents: config.monthlyBudgetCents,
    }
  }

  // Daily request count
  if (config.requestsPerDay > 0 && todayUsage.requests >= config.requestsPerDay) {
    return {
      allowed: false,
      reason: `Daily request limit exceeded (${todayUsage.requests} / ${config.requestsPerDay})`,
      budgetStatus: 'exceeded',
      dailySpendCents: todayUsage.costCents,
      monthlySpendCents: monthUsage.costCents,
      dailyLimitCents: config.dailyBudgetCents,
      monthlyLimitCents: config.monthlyBudgetCents,
    }
  }

  // Capability quota
  if (capability && config.capabilityQuotas) {
    const quotas = config.capabilityQuotas as Record<string, number>
    const quota = quotas[capability]
    if (quota && quota > 0) {
      const capUsage = todayUsage.byCapability[capability] ?? 0
      if (capUsage >= quota) {
        return {
          allowed: false,
          reason: `Daily ${capability} quota exceeded (${capUsage} / ${quota})`,
          budgetStatus: 'exceeded',
          dailySpendCents: todayUsage.costCents,
          monthlySpendCents: monthUsage.costCents,
          dailyLimitCents: config.dailyBudgetCents,
          monthlyLimitCents: config.monthlyBudgetCents,
        }
      }
    }
  }

  // Budget warning (75%+)
  const monthPct = config.monthlyBudgetCents > 0
    ? (monthUsage.costCents / config.monthlyBudgetCents) * 100
    : 0

  return {
    allowed: true,
    budgetStatus: monthPct >= 75 ? 'warning' : 'ok',
    dailySpendCents: todayUsage.costCents,
    monthlySpendCents: monthUsage.costCents,
    dailyLimitCents: config.dailyBudgetCents,
    monthlyLimitCents: config.monthlyBudgetCents,
  }
}

/**
 * Get budget summary for an app (for dashboard display).
 */
export async function getAppBudgetSummary(appSlug: string): Promise<AppBudgetSummary> {
  const config = await getConfig(appSlug)

  if (!config) {
    return {
      appSlug,
      paused: false,
      pauseReason: '',
      monthlyBudgetCents: 0,
      dailyBudgetCents: 0,
      requestsPerMinute: 100,
      requestsPerDay: 10000,
      currentMonthCostCents: 0,
      currentDayRequests: 0,
      capabilityQuotas: {},
      premiumToggles: {},
      status: 'ok',
    }
  }

  const [todayUsage, monthUsage] = await Promise.all([
    getTodayUsage(appSlug),
    getMonthUsage(appSlug),
  ])

  let status: 'ok' | 'warning' | 'exceeded' | 'paused' = 'ok'
  if (config.paused) status = 'paused'
  else if (config.monthlyBudgetCents > 0 && monthUsage.costCents >= config.monthlyBudgetCents) status = 'exceeded'
  else if (config.monthlyBudgetCents > 0 && monthUsage.costCents >= config.monthlyBudgetCents * 0.75) status = 'warning'

  return {
    appSlug,
    paused: config.paused,
    pauseReason: config.pauseReason,
    monthlyBudgetCents: config.monthlyBudgetCents,
    dailyBudgetCents: config.dailyBudgetCents,
    requestsPerMinute: config.requestsPerMinute,
    requestsPerDay: config.requestsPerDay,
    currentMonthCostCents: monthUsage.costCents,
    currentDayRequests: todayUsage.requests,
    capabilityQuotas: config.capabilityQuotas as Record<string, number>,
    premiumToggles: config.premiumToggles as Record<string, boolean>,
    status,
  }
}

/**
 * Upsert per-app budget configuration.
 */
export async function upsertAppBudget(
  appSlug: string,
  updates: Partial<{
    monthlyBudgetCents: number
    dailyBudgetCents: number
    requestsPerMinute: number
    requestsPerDay: number
    capabilityQuotas: Record<string, number>
    premiumToggles: Record<string, boolean>
    paused: boolean
    pauseReason: string
  }>,
): Promise<void> {
  const data: Record<string, unknown> = {}
  if (updates.monthlyBudgetCents !== undefined) data.monthlyBudgetCents = updates.monthlyBudgetCents
  if (updates.dailyBudgetCents !== undefined) data.dailyBudgetCents = updates.dailyBudgetCents
  if (updates.requestsPerMinute !== undefined) data.requestsPerMinute = updates.requestsPerMinute
  if (updates.requestsPerDay !== undefined) data.requestsPerDay = updates.requestsPerDay
  if (updates.capabilityQuotas !== undefined) data.capabilityQuotas = JSON.stringify(updates.capabilityQuotas)
  if (updates.premiumToggles !== undefined) data.premiumToggles = JSON.stringify(updates.premiumToggles)
  if (updates.paused !== undefined) data.paused = updates.paused
  if (updates.pauseReason !== undefined) data.pauseReason = updates.pauseReason

  await prisma.appBudgetConfig.upsert({
    where: { appSlug },
    create: { appSlug, ...data },
    update: data,
  })

  // Invalidate cache
  configCache.delete(appSlug)
}

/**
 * Emergency pause/unpause an app.
 */
export async function setAppPaused(appSlug: string, paused: boolean, reason?: string): Promise<void> {
  await upsertAppBudget(appSlug, {
    paused,
    pauseReason: reason ?? (paused ? 'Emergency pause by administrator' : ''),
  })
}
