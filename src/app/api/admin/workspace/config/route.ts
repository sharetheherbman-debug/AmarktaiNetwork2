import { NextResponse, NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { getWorkspaceConfig, saveWorkspaceConfig } from '@/lib/workspace-executor'
import type { GenXModelPolicy } from '@/lib/genx-client'

const VALID_POLICIES = new Set<GenXModelPolicy>(['best', 'cheap', 'balanced', 'fixed'])

/** GET /api/admin/workspace/config — get workspace AI config */
export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await getWorkspaceConfig()
    return NextResponse.json(config)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load workspace config' },
      { status: 500 },
    )
  }
}

/** PATCH /api/admin/workspace/config — update workspace AI config */
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { modelPolicy, fixedModel, enabledFeatures, fileContexts } = body

    if (modelPolicy !== undefined && !VALID_POLICIES.has(modelPolicy as GenXModelPolicy)) {
      return NextResponse.json(
        { error: `Invalid modelPolicy "${modelPolicy}". Valid values: best, cheap, balanced, fixed` },
        { status: 400 },
      )
    }

    if (modelPolicy === 'fixed' && !fixedModel) {
      return NextResponse.json(
        { error: 'fixedModel is required when modelPolicy is "fixed"' },
        { status: 400 },
      )
    }

    const updated = await saveWorkspaceConfig({
      modelPolicy: modelPolicy as GenXModelPolicy | undefined,
      fixedModel:  fixedModel ?? undefined,
      enabledFeatures: Array.isArray(enabledFeatures) ? enabledFeatures : undefined,
      fileContexts: Array.isArray(fileContexts) ? fileContexts : undefined,
    })

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update workspace config' },
      { status: 500 },
    )
  }
}
