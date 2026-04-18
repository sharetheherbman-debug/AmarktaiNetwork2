/**
 * POST /api/brain/relay
 *
 * App-to-app relay through the AmarktAI Network brain.
 *
 * Allows a connected app (App A) to dispatch a task to another connected app's
 * AI agent (App B) and receive the result. This is the "network" in AmarktAI
 * Network — apps can cross-pollinate knowledge and capabilities.
 *
 * Flow:
 *   App A authenticates → brain validates App A → locates App B's active agent
 *   → routes message through App B's full pipeline → returns response to App A
 *
 * Body:
 *   fromAppId     — the calling app's slug (must be authenticated)
 *   fromAppSecret — the calling app's secret
 *   toAppSlug     — the target app's slug to route the request through
 *   taskType      — task type for the target agent (default: 'chat')
 *   message       — the prompt/payload to send
 *   traceId       — optional caller-supplied trace ID
 *
 * Security:
 *   - App A must authenticate with its own credentials
 *   - App A cannot impersonate App B
 *   - Both apps must be active (disabled apps are rejected)
 *   - The target app's rate limit and budget caps apply
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { authenticateApp, logBrainEvent } from '@/lib/brain'
import { getAppAgent, buildAgentSystemPrompt } from '@/lib/app-agent'
import { orchestrate } from '@/lib/orchestrator'
import { scanContent, blockedExplanation, loadAppSafetyConfigFromDB } from '@/lib/content-filter'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limiter'
import { checkAppBudget } from '@/lib/app-budget-enforcement'
import { prisma } from '@/lib/prisma'
import { dispatchEvent } from '@/lib/webhook-manager'
import { emitSystemEvent } from '@/lib/event-bus'

const relaySchema = z.object({
  fromAppId: z.string().min(1).max(200),
  fromAppSecret: z.string().min(1),
  toAppSlug: z.string().min(1).max(200),
  taskType: z.string().min(1).max(100).default('chat'),
  message: z.string().min(1).max(32_000),
  traceId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const start = Date.now()

  let body: z.infer<typeof relaySchema>
  try {
    body = relaySchema.parse(await request.json())
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof z.ZodError
          ? `Invalid request: ${err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`
          : 'Invalid JSON body',
      },
      { status: 422 },
    )
  }

  const traceId = body.traceId || randomUUID()

  // ── Security: sender cannot relay to itself ────────────────────────────
  if (body.fromAppId === body.toAppSlug) {
    return NextResponse.json(
      { error: 'fromAppId and toAppSlug must be different apps.' },
      { status: 422 },
    )
  }

  // ── Pre-auth content scan ─────────────────────────────────────────────
  const inputFilter = scanContent(body.message)
  if (inputFilter.flagged) {
    return NextResponse.json(
      {
        error: 'Input blocked by safety filter',
        traceId,
        categories: inputFilter.categories,
        message: blockedExplanation(inputFilter.categories),
      },
      { status: 403 },
    )
  }

  // ── Authenticate the sending app ──────────────────────────────────────
  const auth = await authenticateApp(body.fromAppId, body.fromAppSecret)
  if (!auth.ok || !auth.app) {
    return NextResponse.json(
      { error: auth.error ?? 'Unauthorized' },
      { status: auth.statusCode },
    )
  }

  // ── Rate-limit the sender ────────────────────────────────────────────
  const rateLimitResult = await checkRateLimit('app', auth.app.slug)
  if (!rateLimitResult.allowed) {
    const headers = getRateLimitHeaders(rateLimitResult)
    return NextResponse.json(
      { error: 'Rate limit exceeded for the sending app.', traceId },
      { status: 429, headers },
    )
  }

  // ── Locate target app ─────────────────────────────────────────────────
  const targetApp = await prisma.product.findUnique({
    where: { slug: body.toAppSlug },
    select: { id: true, name: true, slug: true, category: true, status: true },
  })
  if (!targetApp) {
    return NextResponse.json(
      { error: `Target app "${body.toAppSlug}" not found.`, traceId },
      { status: 404 },
    )
  }
  if (targetApp.status === 'archived' || targetApp.status === 'disabled') {
    return NextResponse.json(
      { error: `Target app "${body.toAppSlug}" is currently inactive.`, traceId },
      { status: 403 },
    )
  }

  // ── Budget check for sender ───────────────────────────────────────────
  try {
    const budgetCheck = await checkAppBudget(auth.app.slug, body.taskType)
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { error: budgetCheck.reason ?? 'Budget limit reached for the sending app.', traceId },
        { status: 429 },
      )
    }
  } catch {
    // Budget check failure must not block the relay
  }

  // ── Load target app safety config ─────────────────────────────────────
  await loadAppSafetyConfigFromDB(targetApp.slug)

  // ── Load target app agent ─────────────────────────────────────────────
  let agentSystemPrompt: string | undefined
  try {
    const agent = await getAppAgent(targetApp.slug)
    if (agent?.active) {
      agentSystemPrompt = buildAgentSystemPrompt(agent)
    }
  } catch {
    // Agent lookup failure must not block the relay
  }

  // ── Orchestrate through target app's pipeline ─────────────────────────
  // The agent system prompt is passed as a dedicated parameter so it reaches
  // the provider's native system role. A relay prefix is added to the user
  // message so the target agent knows the request origin.
  const relayPrefix = `[Relay request from app: ${auth.app.name} (${auth.app.slug})]\n`
  const result = await orchestrate({
    appSlug: targetApp.slug,
    appCategory: targetApp.category,
    taskType: body.taskType,
    message: relayPrefix + body.message,
    agentSystemPrompt,
  })

  const latencyMs = Date.now() - start
  const hasErrors = result.errors.length > 0
  const success = !hasErrors && result.output !== null

  // ── Log brain event ───────────────────────────────────────────────────
  await logBrainEvent({
    traceId,
    productId: auth.app.id,
    appSlug: auth.app.slug,
    taskType: body.taskType,
    executionMode: result.executionMode,
    classificationJson: JSON.stringify({ relay: true, fromApp: auth.app.slug, toApp: targetApp.slug }),
    routedProvider: result.routedProvider,
    routedModel: result.routedModel,
    validationUsed: result.validationUsed,
    consensusUsed: result.consensusUsed,
    confidenceScore: result.confidenceScore,
    success,
    errorMessage: hasErrors ? result.errors.join('; ') : null,
    warningsJson: JSON.stringify(result.warnings),
    latencyMs,
  })

  // ── SSE + webhooks (fire-and-forget) ──────────────────────────────────
  emitSystemEvent(success ? 'job_completed' : 'job_failed', {
    traceId,
    relay: true,
    fromAppSlug: auth.app.slug,
    toAppSlug: targetApp.slug,
    taskType: body.taskType,
    latencyMs,
    success,
  })

  dispatchEvent(auth.app.slug, success ? 'brain.request.completed' : 'brain.request.failed', {
    traceId,
    relay: true,
    toAppSlug: targetApp.slug,
    taskType: body.taskType,
    routedProvider: result.routedProvider,
    routedModel: result.routedModel,
    latencyMs,
    success,
  }).catch(() => {})

  if (!success) {
    return NextResponse.json(
      {
        success: false,
        traceId,
        fromApp: auth.app.slug,
        toApp: targetApp.slug,
        output: null,
        errors: result.errors,
        warnings: result.warnings,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    success: true,
    traceId,
    fromApp: auth.app.slug,
    toApp: targetApp.slug,
    routedProvider: result.routedProvider,
    routedModel: result.routedModel,
    executionMode: result.executionMode,
    output: result.output,
    warnings: result.warnings,
    errors: [],
    latencyMs,
    timestamp: new Date().toISOString(),
  })
}
