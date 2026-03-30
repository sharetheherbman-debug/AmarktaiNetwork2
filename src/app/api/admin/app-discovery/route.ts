import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { discoverApp, generateOnboardingRecommendations } from '@/lib/app-discovery'
import { getAllCapabilityPacks, getCapabilityPack } from '@/lib/capability-packs'

/**
 * GET /api/admin/app-discovery
 * Returns all available capability packs.
 */
export async function GET() {
  const session = await getSession()
  if (!session?.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const packs = getAllCapabilityPacks()
  return NextResponse.json({ packs })
}

/**
 * POST /api/admin/app-discovery
 * Analyzes an app URL and proposes optimal AI configuration.
 * Body: { name: string, url: string, docsUrl?: string, description?: string }
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, url, docsUrl, description } = body

    if (!name || !url) {
      return NextResponse.json(
        { error: 'name and url are required' },
        { status: 400 }
      )
    }

    const result = await discoverApp({ name, url, docsUrl, description })
    const recommendations = generateOnboardingRecommendations(result)
    const pack = getCapabilityPack(result.proposedConfig.capabilityPackId)

    return NextResponse.json({
      discovery: result,
      recommendations,
      capabilityPack: pack ?? null,
    })
  } catch (error) {
    console.error('App discovery error:', error)
    return NextResponse.json(
      { error: 'Discovery analysis failed' },
      { status: 500 }
    )
  }
}
