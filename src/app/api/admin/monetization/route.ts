import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  trackUsage,
  recordRevenue,
  upsertSubscription,
  getSubscription,
  isWithinGenerationLimit,
  getAppRevenueSummary,
  getPlatformMonetizationSummary,
  recordPipelineRun,
  getPipelineHistory,
  getAllTiers,
  estimateCost,
  type GenerationType,
  type SubscriptionTier,
} from '@/lib/monetization-engine'

/**
 * GET /api/admin/monetization
 *
 * Query params:
 *   appSlug  - get revenue summary for a specific app
 *   platform - get platform-wide summary
 *   tiers    - list subscription tiers
 *   pipeline - get pipeline run history for appSlug
 *   limit    - max pipeline results (default 30)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const appSlug = searchParams.get('appSlug')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10) || 30, 100)

  if (searchParams.has('platform')) {
    return NextResponse.json({ summary: getPlatformMonetizationSummary() })
  }

  if (searchParams.has('tiers')) {
    return NextResponse.json({ tiers: getAllTiers() })
  }

  if (appSlug && searchParams.has('pipeline')) {
    return NextResponse.json({ runs: getPipelineHistory(appSlug, limit) })
  }

  if (appSlug) {
    const summary = getAppRevenueSummary(appSlug)
    const subscription = getSubscription(appSlug)
    return NextResponse.json({ summary, subscription })
  }

  // Default: platform summary
  return NextResponse.json({ summary: getPlatformMonetizationSummary() })
}

/**
 * POST /api/admin/monetization
 *
 * action: 'track_usage' | 'record_revenue' | 'upsert_subscription' |
 *         'record_pipeline' | 'check_limit' | 'estimate_cost'
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = String(body.action ?? '')

  try {
    switch (action) {
      case 'track_usage': {
        const event = trackUsage({
          appSlug: String(body.appSlug ?? ''),
          userId: body.userId ? String(body.userId) : undefined,
          type: (body.type ?? 'chat') as GenerationType,
          model: String(body.model ?? 'unknown'),
          provider: String(body.provider ?? 'unknown'),
          inputTokens: Number(body.inputTokens ?? 0),
          outputTokens: Number(body.outputTokens ?? 0),
          success: body.success !== false,
          error: body.error ? String(body.error) : undefined,
          metadata: body.metadata as Record<string, unknown> | undefined,
        })
        return NextResponse.json({ event }, { status: 201 })
      }

      case 'record_revenue': {
        const event = recordRevenue({
          appSlug: String(body.appSlug ?? ''),
          userId: body.userId ? String(body.userId) : undefined,
          type: (body.type ?? 'usage_charge') as 'subscription_charge' | 'usage_charge' | 'premium_feature' | 'content_sale',
          tier: body.tier ? (body.tier as SubscriptionTier) : undefined,
          amountUsdCents: Number(body.amountUsdCents ?? 0),
          description: String(body.description ?? ''),
        })
        return NextResponse.json({ event }, { status: 201 })
      }

      case 'upsert_subscription': {
        if (!body.appSlug || !body.tier) {
          return NextResponse.json({ error: 'appSlug and tier required' }, { status: 400 })
        }
        const sub = upsertSubscription(
          String(body.appSlug),
          body.tier as SubscriptionTier,
          body.userId ? String(body.userId) : undefined,
        )
        return NextResponse.json({ subscription: sub }, { status: 201 })
      }

      case 'record_pipeline': {
        const run = recordPipelineRun({
          appSlug: String(body.appSlug ?? ''),
          pipelineType: (body.pipelineType ?? 'custom') as 'daily_summary' | 'content_batch' | 'report' | 'newsletter' | 'social_posts' | 'custom',
          itemsGenerated: Number(body.itemsGenerated ?? 0),
          costUsdCents: Number(body.costUsdCents ?? 0),
          status: (body.status ?? 'completed') as 'completed' | 'partial' | 'failed',
          startedAt: String(body.startedAt ?? new Date().toISOString()),
          completedAt: String(body.completedAt ?? new Date().toISOString()),
        })
        return NextResponse.json({ run }, { status: 201 })
      }

      case 'check_limit': {
        if (!body.appSlug || !body.type) {
          return NextResponse.json({ error: 'appSlug and type required' }, { status: 400 })
        }
        const withinLimit = isWithinGenerationLimit(String(body.appSlug), body.type as GenerationType)
        return NextResponse.json({ withinLimit, appSlug: body.appSlug, type: body.type })
      }

      case 'estimate_cost': {
        const cost = estimateCost(
          (body.type ?? 'chat') as GenerationType,
          String(body.model ?? 'gpt-4o'),
          Number(body.inputTokens ?? 0),
          Number(body.outputTokens ?? 0),
        )
        return NextResponse.json({ costUsdCents: cost, costUsd: (cost / 100).toFixed(4) })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Monetization engine error' },
      { status: 500 },
    )
  }
}
