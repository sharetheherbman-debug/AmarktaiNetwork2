/**
 * POST /api/aiva/run
 *
 * Unified Aiva intelligence endpoint.
 *
 * Aiva is the central AI brain of AmarktAI Network.
 * This route handles ALL user requests by:
 *   1. Understanding intent via the Aiva system prompt
 *   2. Detecting which capability is needed
 *   3. Executing via GenX (first) → fallback providers
 *   4. Maintaining session-level conversation context
 *   5. Returning a unified response with capability routing info
 *
 * Input:
 *   { message: string, sessionId?: string, context?: string, appHint?: string }
 *
 * Output:
 *   { result, capabilityUsed, outputType, sessionId, jobId?, artifactId?,
 *     fallbackUsed, navigateTo?, provider, model }
 *
 * Server-side only. Requires active admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSession } from '@/lib/session'
import { executeCapability } from '@/lib/capability-router'
import { getVaultApiKey } from '@/lib/brain'
import { getGenXStatusAsync, callGenXChat, type GenXChatMessage } from '@/lib/genx-client'

// ── Aiva System Prompt ────────────────────────────────────────────────────────

const AIVA_SYSTEM_PROMPT = `You are Aiva, the intelligence of AmarktAI.

You:
- understand user intent
- decide what needs to happen
- route tasks to the correct system
- provide clear responses

You are NOT a chatbot. You are:
- an operator
- a system controller
- an intelligent assistant

You:
- do not expose internal systems
- do not mention provider names
- do not confuse the user

You always:
- act
- explain simply
- deliver results

When the user gives you a command, respond with a short, clear acknowledgment of what you are doing or what they need to do next. Keep responses concise and direct.`

// ── Session Context Store ─────────────────────────────────────────────────────
// In-memory session store — session-level persistence as required.
// Clears on server restart (minimal persistence per spec).

interface SessionMessage {
  role: 'user' | 'assistant'
  content: string
}

const sessionStore = new Map<string, SessionMessage[]>()

const MAX_SESSION_MESSAGES = 20
const SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
const sessionTimestamps = new Map<string, number>()

function getSession_context(sessionId: string): SessionMessage[] {
  // Prune expired sessions
  const now = Date.now()
  for (const [sid, ts] of sessionTimestamps) {
    if (now - ts > SESSION_TTL_MS) {
      sessionStore.delete(sid)
      sessionTimestamps.delete(sid)
    }
  }
  return sessionStore.get(sessionId) ?? []
}

function saveSessionMessage(sessionId: string, msg: SessionMessage) {
  const history = sessionStore.get(sessionId) ?? []
  history.push(msg)
  // Keep only the most recent messages
  if (history.length > MAX_SESSION_MESSAGES) {
    history.splice(0, history.length - MAX_SESSION_MESSAGES)
  }
  sessionStore.set(sessionId, history)
  sessionTimestamps.set(sessionId, Date.now())
}

// ── Capability Detection ──────────────────────────────────────────────────────

/**
 * Detect capability from user message + optional app hint.
 * Returns a capability string + whether to execute inline or navigate.
 */
function detectAivaCapability(
  message: string,
  appHint?: string,
): { capability: string; executeInline: boolean; navigateTo?: string } {
  if (appHint) {
    const hint = appHint.toLowerCase()
    if (hint === 'repo' || hint === 'repo-workbench' || hint === 'github') {
      return { capability: 'repo_workbench', executeInline: false, navigateTo: 'github' }
    }
    if (hint === 'music') return { capability: 'music_generation', executeInline: true }
    if (hint === 'video') return { capability: 'video_generation', executeInline: true }
    if (hint === 'image') return { capability: 'image_generation', executeInline: true }
    if (hint === 'code') return { capability: 'code', executeInline: true }
  }

  const t = message.toLowerCase()

  // Repo / code fix
  if (
    (t.includes('fix') || t.includes('repair') || t.includes('debug') || t.includes('audit')) &&
    (t.includes('repo') || t.includes('codebase') || t.includes('project') || t.includes('code'))
  ) return { capability: 'repo_workbench', executeInline: false, navigateTo: 'github' }

  // Music
  if (
    (t.includes('create') || t.includes('generate') || t.includes('make') || t.includes('compose') || t.includes('write')) &&
    (t.includes('music') || t.includes('song') || t.includes('track') || t.includes('beat') || t.includes('melody'))
  ) return { capability: 'music_generation', executeInline: true }

  // Video
  if (
    (t.includes('create') || t.includes('generate') || t.includes('make') || t.includes('produce')) &&
    t.includes('video')
  ) return { capability: 'video_generation', executeInline: true }

  // Image
  if (
    (t.includes('generate') || t.includes('create') || t.includes('draw') || t.includes('make') || t.includes('design')) &&
    (t.includes('image') || t.includes('picture') || t.includes('photo') || t.includes('artwork') || t.includes('logo') || t.includes('banner') || t.includes('visual'))
  ) return { capability: 'image_generation', executeInline: true }

  // Code generation
  if (
    (t.includes('write') || t.includes('generate') || t.includes('implement') || t.includes('create') || t.includes('build')) &&
    (t.includes('code') || t.includes('function') || t.includes('class') || t.includes('script') || t.includes('component') || t.includes('api'))
  ) return { capability: 'code', executeInline: true }

  // Build a website / landing page / app
  if (
    (t.includes('build') || t.includes('create') || t.includes('design')) &&
    (t.includes('website') || t.includes('landing page') || t.includes('app') || t.includes('ui'))
  ) return { capability: 'app_build', executeInline: false, navigateTo: 'build-app' }

  // Deploy
  if (t.includes('deploy') || t.includes('deployment')) {
    return { capability: 'deploy_plan', executeInline: true }
  }

  // Research
  if (t.includes('research') || (t.includes('search') && t.includes('web')) || t.includes('look up')) {
    return { capability: 'research', executeInline: true }
  }

  // Workflow
  if (t.includes('workflow') || t.includes('automate') || t.includes('automation')) {
    return { capability: 'workflow', executeInline: false, navigateTo: 'workflows' }
  }

  return { capability: 'chat', executeInline: true }
}

// ── Chat Provider ─────────────────────────────────────────────────────────────

const CHAT_FALLBACK_PROVIDERS = [
  { key: 'groq',     baseUrl: 'https://api.groq.com/openai',  model: 'llama-3.3-70b-versatile' },
  { key: 'openai',   baseUrl: 'https://api.openai.com',       model: 'gpt-4o-mini' },
  { key: 'gemini',   baseUrl: null,                           model: 'gemini-2.0-flash' },
  { key: 'deepseek', baseUrl: 'https://api.deepseek.com',     model: 'deepseek-chat' },
] as const

type FallbackKey = typeof CHAT_FALLBACK_PROVIDERS[number]['key']

async function callFallbackChat(
  key: FallbackKey,
  apiKey: string,
  baseUrl: string | null,
  model: string,
  systemPrompt: string,
  messages: SessionMessage[],
): Promise<string | null> {
  if (key === 'gemini') {
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const body: Record<string, unknown> = { contents }
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return null
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  }

  const base = baseUrl ?? 'https://api.openai.com'
  const chatMessages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ]
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: chatMessages, max_tokens: 1024, temperature: 0.7 }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) return null
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  return data?.choices?.[0]?.message?.content ?? null
}

async function getAivaResponse(
  messages: SessionMessage[],
): Promise<{ reply: string | null; provider: string | null; model: string | null }> {
  // GenX first
  try {
    const genxStatus = await getGenXStatusAsync()
    if (genxStatus.available) {
      const genxMessages: GenXChatMessage[] = [
        { role: 'system', content: AIVA_SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ]
      const result = await callGenXChat({
        model: 'genx/default-chat',
        messages: genxMessages,
        max_tokens: 512,
        metadata: { source: 'aiva-run' },
      })
      if (result.success && result.output) {
        return { reply: result.output, provider: 'genx', model: result.model }
      }
    }
  } catch {
    // fall through to providers
  }

  // Fallback providers
  for (const provDef of CHAT_FALLBACK_PROVIDERS) {
    const apiKey = await getVaultApiKey(provDef.key).catch(() => null)
    if (!apiKey) continue
    try {
      const reply = await callFallbackChat(
        provDef.key,
        apiKey,
        provDef.baseUrl,
        provDef.model,
        AIVA_SYSTEM_PROMPT,
        messages,
      )
      if (reply) return { reply, provider: provDef.key, model: provDef.model }
    } catch {
      // try next
    }
  }

  return { reply: null, provider: null, model: null }
}

// ── Navigation labels ─────────────────────────────────────────────────────────

const NAVIGATE_LABELS: Record<string, string> = {
  github: 'Repo Workbench',
  'build-app': 'App Builder',
  workflows: 'Workflow Builder',
  music: 'Music Studio',
  video: 'Video Generator',
  images: 'Image Generator',
  'ai-lab': 'AI Lab',
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { message?: unknown; sessionId?: unknown; context?: unknown; appHint?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const sessionId = typeof body.sessionId === 'string' && body.sessionId
      ? body.sessionId
      : randomUUID()

    const appHint = typeof body.appHint === 'string' ? body.appHint : undefined

    // Load session history
    const history = getSession_context(sessionId)

    // Detect capability
    const { capability, executeInline, navigateTo } = detectAivaCapability(message, appHint)

    // Save user message to session
    saveSessionMessage(sessionId, { role: 'user', content: message })
    const conversationMessages = getSession_context(sessionId)

    // ── Navigate-only capabilities ──────────────────────────────────────────
    if (!executeInline && navigateTo) {
      const sectionLabel = NAVIGATE_LABELS[navigateTo] ?? navigateTo

      // Get Aiva's contextual explanation
      const explainMessages: SessionMessage[] = [
        ...history,
        { role: 'user', content: message },
        {
          role: 'user',
          content: `The user wants to use "${sectionLabel}". Give a short, helpful 1-2 sentence response saying you're routing them there. Do not mention technical details.`,
        },
      ]
      const { reply: aiReply, provider, model } = await getAivaResponse(explainMessages)
      const result = aiReply ?? `Taking you to ${sectionLabel} now.`

      saveSessionMessage(sessionId, { role: 'assistant', content: result })

      return NextResponse.json({
        result,
        capabilityUsed: capability,
        outputType: 'text',
        sessionId,
        navigateTo,
        sectionLabel,
        fallbackUsed: provider !== 'genx',
        provider,
        model,
      })
    }

    // ── Inline execution ────────────────────────────────────────────────────
    if (capability === 'chat' || capability === 'research' || capability === 'deploy_plan') {
      // Pure chat / research — get Aiva's response
      const { reply, provider, model } = await getAivaResponse(conversationMessages)
      const result = reply ?? "I couldn't generate a response. Please check that at least one AI provider is configured."
      saveSessionMessage(sessionId, { role: 'assistant', content: result })

      return NextResponse.json({
        result,
        capabilityUsed: capability,
        outputType: capability === 'deploy_plan' ? 'markdown' : 'text',
        sessionId,
        fallbackUsed: provider !== 'genx',
        provider,
        model,
      })
    }

    // ── Media / code capabilities — execute via capability-router ──────────
    const capResult = await executeCapability({
      input: message,
      capability,
      saveArtifact: true,
      traceId: randomUUID(),
    })

    let resultText = capResult.output

    // For async jobs still processing, give a status message
    if (!resultText && capResult.jobId) {
      resultText = `Job started. Tracking ID: ${capResult.jobId}`
    }
    if (!resultText) {
      resultText = capResult.error ?? 'Execution completed — no output returned.'
    }

    // Also get Aiva's conversational acknowledgment
    const ackMessages: SessionMessage[] = [
      ...history,
      { role: 'user', content: message },
    ]
    const isFailed = !capResult.success
    const ackContext = isFailed
      ? `The ${capability} capability failed with: "${capResult.error ?? 'unknown error'}". Tell the user briefly, suggest they check provider configuration.`
      : `The ${capability} capability executed successfully. Give a short 1-sentence confirmation.`
    ackMessages.push({ role: 'user', content: ackContext })

    const { reply: ackReply } = await getAivaResponse(ackMessages)
    const acknowledgment = ackReply ?? (isFailed ? `${capability} failed.` : `Done.`)
    saveSessionMessage(sessionId, { role: 'assistant', content: acknowledgment })

    return NextResponse.json({
      result: resultText,
      acknowledgment,
      capabilityUsed: capResult.capability,
      outputType: capResult.outputType,
      sessionId,
      jobId: capResult.jobId ?? undefined,
      artifactId: capResult.artifactId ?? undefined,
      fallbackUsed: capResult.fallbackUsed,
      warning: capResult.warning ?? undefined,
      provider: capResult.provider,
      model: capResult.model,
      success: capResult.success,
    })
  } catch (err) {
    console.error('[aiva/run] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
