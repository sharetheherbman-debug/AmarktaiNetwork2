import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  checkAppBudget,
  getAppBudgetSummary,
  upsertAppBudget,
  setAppPaused,
} from '@/lib/app-budget-enforcement'

/**
 * GET /api/admin/app-budgets
 *
 * Query params:
 *   appSlug  — get budget for a specific app
 *   check    — run budget enforcement check (requires appSlug)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const appSlug = searchParams.get('appSlug')

  if (!appSlug) {
    return NextResponse.json({ error: 'appSlug required' }, { status: 400 })
  }

  if (searchParams.has('check')) {
    const result = await checkAppBudget(appSlug, searchParams.get('capability') ?? undefined)
    return NextResponse.json({ check: result })
  }

  const summary = await getAppBudgetSummary(appSlug)
  return NextResponse.json({ budget: summary })
}

/**
 * POST /api/admin/app-budgets
 *
 * Body: {
 *   appSlug: string
 *   action?: 'pause' | 'unpause' | 'update'
 *   monthlyBudgetCents?: number
 *   dailyBudgetCents?: number
 *   requestsPerMinute?: number
 *   requestsPerDay?: number
 *   capabilityQuotas?: Record<string, number>
 *   premiumToggles?: Record<string, boolean>
 *   pauseReason?: string
 * }
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const appSlug = body.appSlug as string
  if (!appSlug) {
    return NextResponse.json({ error: 'appSlug required' }, { status: 400 })
  }

  const action = (body.action as string) ?? 'update'

  if (action === 'pause') {
    await setAppPaused(appSlug, true, (body.pauseReason as string) ?? undefined)
    return NextResponse.json({ paused: true })
  }

  if (action === 'unpause') {
    await setAppPaused(appSlug, false)
    return NextResponse.json({ paused: false })
  }

  // action === 'update'
  await upsertAppBudget(appSlug, {
    monthlyBudgetCents: body.monthlyBudgetCents as number | undefined,
    dailyBudgetCents: body.dailyBudgetCents as number | undefined,
    requestsPerMinute: body.requestsPerMinute as number | undefined,
    requestsPerDay: body.requestsPerDay as number | undefined,
    capabilityQuotas: body.capabilityQuotas as Record<string, number> | undefined,
    premiumToggles: body.premiumToggles as Record<string, boolean> | undefined,
  })

  const summary = await getAppBudgetSummary(appSlug)
  return NextResponse.json({ budget: summary })
}
