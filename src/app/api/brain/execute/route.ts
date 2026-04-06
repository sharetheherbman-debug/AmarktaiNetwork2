/**
 * POST /api/brain/execute
 *
 * Canonical app-facing Brain Gateway — execute alias.
 *
 * This route is the documented entry point for all AI execution requests.
 * It accepts two request shapes:
 *
 * 1. Standard (same as /api/brain/request):
 *    { appId, appSecret, taskType, message, externalUserId?, metadata? }
 *
 * 2. executeTask() interface (enriched):
 *    {
 *      app_id, app_secret, mode, task, user_context?,
 *      externalUserId?, metadata?
 *    }
 *    Fields are normalised to the standard schema before processing.
 *
 * The full pipeline runs here:
 *   authenticate → emotion detection → memory retrieval → orchestrate
 *   → provider selection → model execution → content filter → respond
 *
 * @example
 * // Standard
 * fetch('/api/brain/execute', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ appId: 'my-app', appSecret: '...', taskType: 'chat', message: 'Hello' })
 * })
 *
 * @example
 * // executeTask interface
 * fetch('/api/brain/execute', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     app_id: 'my-app', app_secret: '...', mode: 'chat',
 *     task: 'Hello', user_context: { name: 'Alice', language: 'en' }
 *   })
 * })
 */

import { NextRequest, NextResponse } from 'next/server'
import { POST as handleRequest } from '@/app/api/brain/request/route'

/**
 * Normalise the executeTask() wire format into the standard brain/request
 * schema before forwarding to the shared handler.
 */
async function normaliseBody(request: NextRequest): Promise<NextRequest> {
  let raw: Record<string, unknown>
  try {
    raw = await request.json()
  } catch {
    return request
  }

  // If the request already uses the standard shape, pass through unchanged.
  if ('appId' in raw || 'taskType' in raw) {
    return new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(raw),
    })
  }

  // executeTask() → standard schema normalisation
  const normalised: Record<string, unknown> = {
    appId: raw.app_id ?? raw.appId,
    appSecret: raw.app_secret ?? raw.appSecret,
    taskType: raw.mode ?? raw.taskType ?? 'chat',
    message: raw.task ?? raw.message ?? '',
    externalUserId: raw.externalUserId,
    traceId: raw.traceId,
    requestMode: raw.requestMode,
    // Merge user_context into metadata so the orchestrator can use it
    metadata: {
      ...(typeof raw.metadata === 'object' && raw.metadata !== null ? raw.metadata as Record<string, unknown> : {}),
      ...(typeof raw.user_context === 'object' && raw.user_context !== null
        ? { user_context: raw.user_context }
        : {}),
    },
  }

  return new NextRequest(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(normalised),
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const normalised = await normaliseBody(request)
  return handleRequest(normalised) as Promise<NextResponse>
}
