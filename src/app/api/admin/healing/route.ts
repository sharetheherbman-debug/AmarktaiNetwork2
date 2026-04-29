import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  runHealingChecks,
  runAndPersistHealingChecks,
  getPersistedHealingRecords,
} from '@/lib/self-healing'

/**
 * GET /api/admin/healing
 *
 * Query params:
 *   persist=true   — run checks, apply auto-healing, and persist results to DB (default: read-only)
 *   history=true   — return persisted healing records from DB instead of running live checks
 *   limit=N        — max records to return when history=true (default: 50)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const persist = searchParams.get('persist') === 'true'
  const history = searchParams.get('history') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200)

  try {
    if (history) {
      const records = await getPersistedHealingRecords(limit)
      return NextResponse.json({ records, count: records.length })
    }

    // Run live healing checks — with or without DB persistence
    const status = persist
      ? await runAndPersistHealingChecks()
      : await runHealingChecks()

    return NextResponse.json(status)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Healing check failed' },
      { status: 500 },
    )
  }
}
