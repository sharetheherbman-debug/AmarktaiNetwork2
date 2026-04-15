import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  runAllManagerChecks,
  getAllManagerStatuses,
  runRoutingManagerCheck,
  runQueueManagerCheck,
  runArtifactManagerCheck,
  runAppManagerCheck,
  runLearningManagerCheck,
  runGrowthManagerCheck,
} from '@/lib/manager-agents'

const MANAGER_RUNNERS: Record<string, () => Promise<unknown>> = {
  routing: runRoutingManagerCheck,
  queue: runQueueManagerCheck,
  artifact: runArtifactManagerCheck,
  app: runAppManagerCheck,
  learning: runLearningManagerCheck,
  growth: runGrowthManagerCheck,
}

/**
 * GET /api/admin/managers
 *
 * Query params:
 *   status  — get all manager statuses
 *   run     — run all manager checks
 *   type    — run specific manager check (e.g. ?type=routing)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  // Run all checks
  if (searchParams.has('run')) {
    const type = searchParams.get('type')
    // Validate against known manager types to prevent dynamic dispatch to unexpected methods
    const validTypes = new Set(['routing', 'queue', 'artifact', 'app', 'learning', 'growth'])
    if (type && validTypes.has(type)) {
      const runner = MANAGER_RUNNERS[type]
      if (runner) {
        const result = await runner()
        return NextResponse.json({ result })
      }
    }
    const results = await runAllManagerChecks()
    return NextResponse.json({ results })
  }

  // Get statuses
  const statuses = await getAllManagerStatuses()
  return NextResponse.json({ managers: statuses })
}
