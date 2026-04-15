import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  getAllRoutingProfiles,
  getRoutingProfile,
  buildFallbackChain,
  profileToRoutingOverrides,
  shouldRetry,
  type RoutingProfileId,
} from '@/lib/routing-profiles'

/**
 * GET /api/admin/routing-profiles
 *
 * Query params:
 *   id             - get a specific profile by ID
 *   chain          - return the full fallback chain for a profile ID
 *   overrides      - return RoutingContext overrides for a profile ID
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') as RoutingProfileId | null

  if (searchParams.has('chain') && id) {
    const profile = getRoutingProfile(id)
    return NextResponse.json({
      profileId: id,
      chain: buildFallbackChain(profile),
    })
  }

  if (searchParams.has('overrides') && id) {
    const profile = getRoutingProfile(id)
    return NextResponse.json({
      profileId: id,
      overrides: profileToRoutingOverrides(profile),
    })
  }

  if (id) {
    const profile = getRoutingProfile(id)
    return NextResponse.json({ profile })
  }

  return NextResponse.json({
    profiles: getAllRoutingProfiles(),
    count: getAllRoutingProfiles().length,
  })
}

/**
 * POST /api/admin/routing-profiles
 *
 * action: 'should_retry'
 *   profileId, attempt, lastErrorMessage, providerKey
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

  if (action === 'should_retry') {
    const profileId = (body.profileId as RoutingProfileId) ?? 'balanced'
    const profile = getRoutingProfile(profileId)
    const decision = shouldRetry(profile.retryPolicy, {
      attempt: Number(body.attempt ?? 0),
      lastErrorMessage: body.lastErrorMessage ? String(body.lastErrorMessage) : null,
      providerKey: String(body.providerKey ?? ''),
    })
    return NextResponse.json({ decision })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
