import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { CANONICAL_PROVIDERS } from '@/lib/provider-catalog'

/** GET /api/admin/providers/catalog — returns the canonical provider list for dropdowns */
export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(
    CANONICAL_PROVIDERS.map((p) => ({
      key: p.key,
      displayName: p.displayName,
      defaultBaseUrl: p.defaultBaseUrl,
      healthCheckSupported: p.healthCheckSupported,
      supportedCapabilityFamilies: p.supportedCapabilityFamilies,
      sortOrder: p.sortOrder,
    })),
  )
}
