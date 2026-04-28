/**
 * Admin API — Integrations Status
 *
 * GET /api/admin/integrations-status → Status of all external integrations
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getFirecrawlStatus } from '@/lib/firecrawl'
import { getMem0Status } from '@/lib/mem0-client'
import { getGraphitiStatus } from '@/lib/graphiti-client'
import { getLiteLLMStatus } from '@/lib/litellm-client'
import { getPostHogStatus } from '@/lib/posthog-client'
import { getLangGraphStatus } from '@/lib/langgraph-client'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const qdrantUrl = process.env.QDRANT_URL || ''
  const redisUrl = process.env.REDIS_URL || ''

  const [firecrawlStatus, mem0Status, posthogStatus] = await Promise.all([
    getFirecrawlStatus(),
    getMem0Status(),
    getPostHogStatus(),
  ])

  return NextResponse.json({
    integrations: {
      firecrawl: firecrawlStatus,
      qdrant: {
        available: !!qdrantUrl,
        url: qdrantUrl || null,
        error: qdrantUrl ? null : 'QDRANT_URL not configured',
      },
      mem0: mem0Status,
      graphiti: getGraphitiStatus(),
      litellm: getLiteLLMStatus(),
      posthog: posthogStatus,
      langgraph: getLangGraphStatus(),
      redis: {
        available: !!redisUrl,
        url: redisUrl ? '(configured)' : null,
        error: redisUrl ? null : 'REDIS_URL not configured',
      },
    },
  })
}
