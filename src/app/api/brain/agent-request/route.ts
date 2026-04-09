/**
 * Brain API — App Agent Request
 *
 * POST /api/brain/agent-request → Process request through App Agent → Super-Brain pipeline
 *
 * This is the production entry point for apps to send requests through their
 * dedicated App Agent. The agent augments the request with app-specific rules,
 * then routes through the central AmarktAI orchestration.
 */

import { NextResponse } from 'next/server'
import { authenticateApp, logBrainEvent } from '@/lib/brain'
import { processAppAgentRequest } from '@/lib/app-agent'
import { trackBrainRequest } from '@/lib/posthog-client'

export async function POST(req: Request) {
  const start = Date.now()

  let body: {
    appId?: string
    appSecret?: string
    taskType?: string
    message?: string
    userId?: string
    metadata?: Record<string, unknown>
    traceId?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { appId, appSecret, taskType, message, userId, metadata, traceId } = body

  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'Missing appId or appSecret' }, { status: 422 })
  }
  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 422 })
  }

  // Authenticate the calling app
  const auth = await authenticateApp(appId, appSecret)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode })
  }

  // Process through App Agent → Super-Brain pipeline
  const result = await processAppAgentRequest({
    appSlug: appId,
    message,
    taskType: taskType ?? 'chat',
    userId,
    metadata,
    traceId,
  })

  // Log brain event (non-blocking)
  logBrainEvent({
    traceId: result.traceId,
    productId: auth.app?.id ?? null,
    appSlug: appId,
    taskType: taskType ?? 'chat',
    executionMode: 'agent_chain',
    classificationJson: JSON.stringify({ agentId: result.agentId, appliedRules: result.appliedRules }),
    routedProvider: result.routedProvider,
    routedModel: result.routedModel,
    validationUsed: false,
    consensusUsed: false,
    confidenceScore: null,
    success: result.success,
    errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
    warningsJson: JSON.stringify(result.warnings),
    latencyMs: result.latencyMs,
  }).catch(() => {})

  // Track in PostHog (non-blocking)
  trackBrainRequest({
    appSlug: appId,
    taskType: taskType ?? 'chat',
    provider: result.routedProvider ?? 'none',
    model: result.routedModel ?? 'none',
    success: result.success,
    latencyMs: result.latencyMs,
    executionMode: 'agent_chain',
  }).catch(() => {})

  return NextResponse.json({
    success: result.success,
    traceId: result.traceId,
    agentId: result.agentId,
    output: result.output,
    routedProvider: result.routedProvider,
    routedModel: result.routedModel,
    budgetMode: result.budgetMode,
    appliedRules: result.appliedRules,
    warnings: result.warnings,
    errors: result.errors,
    latencyMs: Date.now() - start,
    memoryUsed: result.memoryUsed,
    retrievalUsed: result.retrievalUsed,
  })
}
