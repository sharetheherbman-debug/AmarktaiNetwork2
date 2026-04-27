import { NextResponse, NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { routeWorkspaceTask } from '@/lib/workspace-executor'
import type { GenXModelPolicy, GenXCapability, GenXOperationType } from '@/lib/genx-client'

/**
 * POST /api/admin/workspace/run — execute a workspace AI task via GenX.
 *
 * Body:
 *   task              string  — the user prompt / task description
 *   systemPrompt      string? — optional system instructions
 *   fileContexts      Array?  — [{ path, content, language? }] files to inject as context
 *   capability        string? — GenX capability hint (chat | code | reasoning | …)
 *   operationType     string? — operation hint (chat | code | summarise | …)
 *   policyOverride    string? — override workspace model policy for this call
 *   fixedModelOverride string? — use this exact model ID (overrides policy)
 *   maxTokens         number? — max output tokens (default 4096)
 *   temperature       number? — sampling temperature
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { task, systemPrompt, fileContexts, capability, operationType, policyOverride, fixedModelOverride, maxTokens, temperature } = body

    if (!task || typeof task !== 'string' || !task.trim()) {
      return NextResponse.json({ error: 'task is required and must be a non-empty string' }, { status: 400 })
    }

    const result = await routeWorkspaceTask({
      task,
      systemPrompt: systemPrompt ?? undefined,
      fileContexts: Array.isArray(fileContexts) ? fileContexts : undefined,
      capability:    capability    as GenXCapability    | undefined,
      operationType: operationType as GenXOperationType | undefined,
      policyOverride: policyOverride as GenXModelPolicy | undefined,
      fixedModelOverride: fixedModelOverride ?? undefined,
      maxTokens: typeof maxTokens === 'number' ? maxTokens : undefined,
      temperature:   typeof temperature === 'number' ? temperature : undefined,
    })

    return NextResponse.json(result, { status: result.success ? 200 : 422 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Workspace task execution failed' },
      { status: 500 },
    )
  }
}
