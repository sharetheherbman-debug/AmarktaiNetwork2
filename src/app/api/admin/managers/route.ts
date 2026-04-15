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
  type ManagerType,
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
    const type = searchParams.get('type') as ManagerType | null
    if (type && MANAGER_RUNNERS[type]) {
      const result = await MANAGER_RUNNERS[type]()
      return NextResponse.json({ result })
    }
    const results = await runAllManagerChecks()
    return NextResponse.json({ results })
  }

  // Get statuses
  const statuses = await getAllManagerStatuses()
  return NextResponse.json({ managers: statuses })
}
