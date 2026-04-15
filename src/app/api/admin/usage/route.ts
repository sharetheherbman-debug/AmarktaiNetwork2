import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  getAppUsageSummary,
  getPlatformUsageSummary,
} from '@/lib/usage-meter'

/**
 * GET /api/admin/usage
 *
 * Query params:
 *   appSlug  — usage for specific app
 *   platform — platform-wide summary
 *   days     — lookback period (default 30)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') ?? '30') || 30
  const appSlug = searchParams.get('appSlug')

  if (searchParams.has('platform') || !appSlug) {
    const summary = await getPlatformUsageSummary(days)
    return NextResponse.json({ usage: summary })
  }

  const summary = await getAppUsageSummary(appSlug, days)
  return NextResponse.json({ usage: summary })
}
