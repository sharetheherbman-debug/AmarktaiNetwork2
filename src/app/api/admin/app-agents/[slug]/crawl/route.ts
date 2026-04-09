/**
 * Admin API — App Agent Firecrawl
 *
 * POST /api/admin/app-agents/[slug]/crawl → Trigger website crawl for an app agent
 */

import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getAppAgent } from '@/lib/app-agent'
import { crawlAppWebsite, getFirecrawlStatus } from '@/lib/firecrawl'
import { prisma } from '@/lib/prisma'

interface SessionData { admin?: boolean }

async function requireAdmin(): Promise<boolean> {
  const session = await getIronSession<SessionData>(await cookies(), {
    cookieName: 'amarktai-admin-session',
    password: process.env.SESSION_SECRET || 'dev-secret-replace-in-production-min-32-chars',
  })
  return !!session.admin
}

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params

  // Check Firecrawl availability
  const status = getFirecrawlStatus()
  if (!status.available) {
    return NextResponse.json({
      error: 'Firecrawl is not configured',
      details: status.error,
      hint: 'Set FIRECRAWL_API_KEY in your environment variables.',
    }, { status: 503 })
  }

  // Get agent and its app URL
  const agent = await getAppAgent(slug)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (!agent.appUrl) {
    return NextResponse.json({ error: 'App URL not configured for this agent. Set it in the agent setup.' }, { status: 422 })
  }

  // Mark as crawling
  await prisma.appAgent.update({
    where: { appSlug: slug },
    data: { crawlStatus: 'crawling' },
  })

  try {
    const result = await crawlAppWebsite(agent.appUrl)

    // Update agent with crawl results
    await prisma.appAgent.update({
      where: { appSlug: slug },
      data: {
        crawlStatus: result.success ? 'completed' : 'failed',
        lastCrawlAt: new Date(),
        crawlSummary: result.summary,
        detectedNiche: result.detectedNiche,
        detectedCapabilities: JSON.stringify(result.aiCapabilitiesNeeded),
      },
    })

    return NextResponse.json({ crawl: result })
  } catch (err) {
    await prisma.appAgent.update({
      where: { appSlug: slug },
      data: { crawlStatus: 'failed' },
    })

    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Crawl failed',
    }, { status: 500 })
  }
}
