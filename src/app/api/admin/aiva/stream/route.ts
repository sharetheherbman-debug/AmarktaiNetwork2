import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { GENX_TEXT_MODELS, streamGenXChat } from '@/lib/genx-client'
import { getDashboardSummary } from '@/lib/dashboard-truth'

interface StreamBody {
  message?: string
  conversationId?: string
  modelOverride?: string
}

function sse(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

async function getOrCreateConversation(message: string, existingConvId?: string): Promise<string> {
  try {
    if (existingConvId) {
      const existing = await prisma.aivaConversation.findUnique({ where: { id: existingConvId } })
      if (existing) return existing.id
    }
    const conv = await prisma.aivaConversation.create({
      data: { title: message.slice(0, 60) || 'New Conversation' },
    })
    return conv.id
  } catch {
    return existingConvId ?? `ephemeral-${Date.now()}`
  }
}

async function saveMessage(data: {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  errorMessage?: string | null
}) {
  try {
    if (data.conversationId.startsWith('ephemeral-')) return null
    return await prisma.aivaMessage.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        capability: 'chat',
        provider: data.role === 'assistant' ? 'genx' : '',
        model: data.model ?? '',
        outputType: 'text',
        errorMessage: data.errorMessage ?? null,
      },
    })
  } catch {
    return null
  }
}

async function buildSystemPrompt(): Promise<string> {
  let status = 'System status is currently unavailable.'
  try {
    const summary = await getDashboardSummary()
    status = [
      `Health score: ${summary.healthScore}/100`,
      `Capabilities available: ${summary.availableCapabilities}/${summary.totalCapabilities}`,
      `Artifacts: ${summary.artifactCount}`,
      `Queue healthy: ${summary.queueHealthy ? 'yes' : 'no'}`,
      `Storage driver: ${summary.storageDriver}`,
      `Critical alerts: ${summary.criticalAlerts}`,
      `Unresolved alerts: ${summary.unresolvedAlerts}`,
    ].join('\n')
  } catch {
    // Keep Aiva responsive even if dashboard truth is temporarily unavailable.
  }

  return [
    'You are Aiva, the intelligence and operator for Amarktai Network.',
    'Amarktai Network is an AI operating system. Aiva is the system assistant, operator, app builder, and explainer.',
    'Be direct, practical, and truthful. Never fake success. Never claim something is ready unless it is verified.',
    'Do not expose or brand internal AI providers to the user unless they explicitly ask for low-level diagnostics.',
    'When something needs setup, state the exact setup needed.',
    'Current system state:',
    status,
  ].join('\n\n')
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: StreamBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const traceId = randomUUID()
  const conversationId = await getOrCreateConversation(message, body.conversationId)
  await saveMessage({ conversationId, role: 'user', content: message })

  const encoder = new TextEncoder()
  const model = body.modelOverride?.trim() || GENX_TEXT_MODELS[0]

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sse(event)))
      }

      send({ type: 'start', traceId, conversationId, model })

      let fullOutput = ''
      let errorMessage: string | null = null
      const systemPrompt = await buildSystemPrompt()

      const result = await streamGenXChat(
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          max_tokens: 4096,
          temperature: 0.7,
          metadata: { traceId, source: 'aiva-stream' },
        },
        (event) => {
          if (event.type === 'chunk' && event.content) {
            fullOutput += event.content
            send({ type: 'chunk', content: event.content })
          }
          if (event.type === 'error') {
            errorMessage = event.error ?? 'Streaming failed'
            send({ type: 'error', error: errorMessage })
          }
        },
        request.signal,
      )

      if (!result.success && !errorMessage) {
        errorMessage = result.error ?? 'Streaming failed'
        send({ type: 'error', error: errorMessage })
      }

      const saved = await saveMessage({
        conversationId,
        role: 'assistant',
        content: fullOutput,
        model: result.model,
        errorMessage,
      })

      send({
        type: 'done',
        traceId,
        conversationId,
        messageId: saved?.id ?? null,
        model: result.model,
        success: result.success,
      })
      controller.close()
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Trace-Id': traceId,
    },
  })
}
