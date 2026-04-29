/**
 * POST /api/brain/adult-text
 *
 * Adult-oriented text / conversation execution.
 *
 * This route is for consensual adult creative writing and roleplay only.
 * It never routes through GenX safe/default chat models and never silently
 * falls back to a normal provider. Supported specialist providers:
 * - Hugging Face private/local endpoint or compatible hosted model
 * - Together AI chat completions
 * - xAI/Grok chat completions
 * - Custom OpenAI-compatible endpoint
 */

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  blockedExplanation,
  getAppSafetyConfig,
  loadAppSafetyConfigFromDB,
  scanContent,
} from '@/lib/content-filter'
import { getVaultApiKey } from '@/lib/brain'
import { getAdultTextModel, getDefaultAdultTextModel } from '@/lib/adult-model-catalog'

type AdultTextProvider = 'auto' | 'huggingface' | 'together' | 'xai' | 'custom'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ProviderAttempt {
  provider: Exclude<AdultTextProvider, 'auto'>
  model: string
  status: 'ready' | 'needs_endpoint' | 'needs_key' | 'test_failed'
  error?: string
}

const DEFAULT_TOGETHER_ADULT_TEXT_MODEL = 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'
const DEFAULT_XAI_ADULT_TEXT_MODEL = 'grok-2-latest'

const SYSTEM_PROMPT =
  'You are an adult-oriented creative writing and conversation assistant for consenting adults only. ' +
  'You may handle mature themes when the user and all fictional characters are adults. ' +
  'Strictly refuse minors, coercion, exploitation, non-consensual content, threats, hate, illegal activity, instructions for harm, or degrading abuse. ' +
  'Keep the tone respectful, consent-aware, and non-degrading.'

const DEGRADING_PATTERNS: RegExp[] = [
  /\b(degrade|humiliate|worthless|subhuman)\s+(her|him|them|woman|man|person|partner)\b/i,
  /\b(degrading|humiliating|dehumanizing|dehumanising)\b/i,
  /\bworthless\b/i,
  /\bmake\s+(her|him|them)\s+(beg|cry|suffer)\b/i,
  /\bslave\b/i,
  /\bowned\s+(woman|man|person|partner)\b/i,
]

function validateUrl(raw: string): { url: URL | null; error: string | null } {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { url, error: 'Endpoint URL must use http or https.' }
    }
    const host = url.hostname.toLowerCase()
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(host) && process.env.NODE_ENV === 'production') {
      return { url, error: 'Private or loopback endpoint URLs are not allowed in production.' }
    }
    return { url, error: null }
  } catch {
    return { url: null, error: 'Invalid endpoint URL.' }
  }
}

function getBaseUrl(raw: string): string {
  return raw
    .replace(/\/v1\/chat\/completions\/?$/, '')
    .replace(/\/chat\/completions\/?$/, '')
    .replace(/\/generate\/?$/, '')
    .replace(/\/$/, '')
}

function getPrompt(body: Record<string, unknown>): string {
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  const message = typeof body.message === 'string' ? body.message : ''
  return (prompt || message).trim()
}

function getMessages(body: Record<string, unknown>, prompt: string): ChatMessage[] {
  if (Array.isArray(body.messages)) {
    const messages: ChatMessage[] = body.messages
      .filter((message): message is Record<string, unknown> => typeof message === 'object' && message !== null)
      .map((message) => {
        const role: ChatMessage['role'] =
          message.role === 'assistant' || message.role === 'system' ? message.role : 'user'
        return {
          role,
          content: typeof message.content === 'string' ? message.content : '',
        }
      })
      .filter((message) => message.content.trim().length > 0)
    if (messages.length > 0) return messages
  }
  return [{ role: 'user', content: prompt }]
}

function hasDegradingTerms(text: string): boolean {
  return DEGRADING_PATTERNS.some((pattern) => pattern.test(text))
}

function extractOpenAiText(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const record = data as { choices?: Array<{ message?: { content?: string }, text?: string }> }
  return record.choices?.[0]?.message?.content ?? record.choices?.[0]?.text ?? null
}

function extractHfText(data: unknown): string | null {
  if (typeof data === 'string') return data
  if (Array.isArray(data)) {
    const first = data[0] as { generated_text?: string } | undefined
    return first?.generated_text ?? null
  }
  if (typeof data === 'object' && data !== null) {
    const record = data as { generated_text?: string, output?: string, text?: string }
    return record.generated_text ?? record.output ?? record.text ?? null
  }
  return null
}

async function postOpenAiCompatible(opts: {
  endpoint: string
  apiKey: string | null
  model: string
  messages: ChatMessage[]
  timeoutMs?: number
}): Promise<{ output: string | null; error: string | null; status: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`
  const res = await fetch(`${getBaseUrl(opts.endpoint)}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...opts.messages],
      max_tokens: 900,
      temperature: 0.75,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
  })
  const text = await res.text().catch(() => '')
  if (!res.ok) return { output: null, error: text || `HTTP ${res.status}`, status: res.status }
  try {
    return { output: extractOpenAiText(JSON.parse(text)), error: null, status: res.status }
  } catch {
    return { output: text || null, error: null, status: res.status }
  }
}

async function postHuggingFaceRaw(opts: {
  endpoint: string
  apiKey: string | null
  prompt: string
  timeoutMs?: number
}): Promise<{ output: string | null; error: string | null; status: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`
  const res = await fetch(opts.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inputs: `${SYSTEM_PROMPT}\n\nUser: ${opts.prompt}\nAssistant:`,
      parameters: { max_new_tokens: 900, return_full_text: false, temperature: 0.75 },
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
  })
  const text = await res.text().catch(() => '')
  if (!res.ok) return { output: null, error: text || `HTTP ${res.status}`, status: res.status }
  try {
    return { output: extractHfText(JSON.parse(text)), error: null, status: res.status }
  } catch {
    return { output: text || null, error: null, status: res.status }
  }
}

async function tryHuggingFace(opts: {
  endpoint: string | null
  apiKey: string | null
  model: string
  prompt: string
  messages: ChatMessage[]
}): Promise<{ output: string | null; attempt: ProviderAttempt }> {
  const modelSpec = getAdultTextModel(opts.model)
  if (!opts.endpoint && modelSpec) {
    return {
      output: null,
      attempt: {
        provider: 'huggingface',
        model: opts.model,
        status: 'needs_endpoint',
        error: `${modelSpec.label} is a cataloged GGUF model. Configure a Hugging Face private endpoint or local GGUF runtime endpoint.`,
      },
    }
  }
  if (!opts.apiKey && !opts.endpoint) {
    return {
      output: null,
      attempt: { provider: 'huggingface', model: opts.model, status: 'needs_key', error: 'Hugging Face key or endpoint is required.' },
    }
  }

  const endpoint = opts.endpoint || `https://api-inference.huggingface.co/models/${opts.model}`
  const validated = validateUrl(endpoint)
  if (!validated.url) {
    return {
      output: null,
      attempt: { provider: 'huggingface', model: opts.model, status: 'test_failed', error: validated.error ?? 'Invalid endpoint.' },
    }
  }

  const chat = await postOpenAiCompatible({
    endpoint: validated.url.href,
    apiKey: opts.apiKey,
    model: opts.model,
    messages: opts.messages,
  }).catch((err) => ({ output: null, error: err instanceof Error ? err.message : String(err), status: 0 }))

  if (chat.output) return { output: chat.output, attempt: { provider: 'huggingface', model: opts.model, status: 'ready' } }

  const raw = await postHuggingFaceRaw({
    endpoint: validated.url.href,
    apiKey: opts.apiKey,
    prompt: opts.prompt,
  }).catch((err) => ({ output: null, error: err instanceof Error ? err.message : String(err), status: 0 }))

  if (raw.output) return { output: raw.output, attempt: { provider: 'huggingface', model: opts.model, status: 'ready' } }

  return {
    output: null,
    attempt: {
      provider: 'huggingface',
      model: opts.model,
      status: chat.status === 401 || chat.status === 403 || raw.status === 401 || raw.status === 403 ? 'needs_key' : 'test_failed',
      error: raw.error ?? chat.error ?? 'Hugging Face endpoint returned no text.',
    },
  }
}

async function tryTogether(apiKey: string | null, model: string, messages: ChatMessage[]): Promise<{ output: string | null; attempt: ProviderAttempt }> {
  if (!apiKey) {
    return { output: null, attempt: { provider: 'together', model, status: 'needs_key', error: 'Together AI key is required.' } }
  }
  const res = await postOpenAiCompatible({
    endpoint: 'https://api.together.xyz',
    apiKey,
    model,
    messages,
  }).catch((err) => ({ output: null, error: err instanceof Error ? err.message : String(err), status: 0 }))
  return res.output
    ? { output: res.output, attempt: { provider: 'together', model, status: 'ready' } }
    : { output: null, attempt: { provider: 'together', model, status: res.status === 401 || res.status === 403 ? 'needs_key' : 'test_failed', error: res.error ?? 'Together returned no text.' } }
}

async function tryXai(apiKey: string | null, model: string, messages: ChatMessage[]): Promise<{ output: string | null; attempt: ProviderAttempt }> {
  if (!apiKey) {
    return { output: null, attempt: { provider: 'xai', model, status: 'needs_key', error: 'xAI/Grok key is required.' } }
  }
  const res = await postOpenAiCompatible({
    endpoint: 'https://api.x.ai',
    apiKey,
    model,
    messages,
  }).catch((err) => ({ output: null, error: err instanceof Error ? err.message : String(err), status: 0 }))
  return res.output
    ? { output: res.output, attempt: { provider: 'xai', model, status: 'ready' } }
    : { output: null, attempt: { provider: 'xai', model, status: res.status === 401 || res.status === 403 ? 'needs_key' : 'test_failed', error: res.error ?? 'xAI/Grok returned no text.' } }
}

export async function POST(request: NextRequest) {
  const traceId = randomUUID()

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const prompt = getPrompt(body)
    if (!prompt) {
      return NextResponse.json({ success: false, traceId, error: 'prompt or message is required.' }, { status: 400 })
    }

    const appSlug = typeof body.appSlug === 'string' ? body.appSlug : '__admin_test__'
    await loadAppSafetyConfigFromDB(appSlug)
    const safety = getAppSafetyConfig(appSlug)
    if (safety.safeMode || !safety.adultMode) {
      return NextResponse.json({
        success: false,
        traceId,
        status: 'needs_adult_mode',
        error: 'Adult text requires adultMode=true and safeMode=false for this app.',
        current_config: safety,
      }, { status: 403 })
    }

    const inputScan = scanContent(prompt, appSlug)
    if (inputScan.flagged) {
      return NextResponse.json({
        success: false,
        traceId,
        status: 'policy_refused',
        categories: inputScan.categories,
        error: blockedExplanation(inputScan.categories),
      }, { status: 422 })
    }

    if (hasDegradingTerms(prompt)) {
      return NextResponse.json({
        success: false,
        traceId,
        status: 'policy_refused',
        categories: ['degrading_content'],
        error: 'Degrading, coercive, or dehumanizing adult content is not allowed.',
      }, { status: 422 })
    }

    const requestedProvider = (typeof body.provider === 'string' ? body.provider : 'auto') as AdultTextProvider
    const endpoint = typeof body.endpoint === 'string' && body.endpoint.trim() ? body.endpoint.trim() : null
    const defaultHfModel = getDefaultAdultTextModel().id
    const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : defaultHfModel
    const messages = getMessages(body, prompt)
    const attempts: ProviderAttempt[] = []

    if (requestedProvider === 'custom') {
      if (!endpoint) {
        return NextResponse.json({ success: false, traceId, status: 'needs_endpoint', error: 'Custom adult text provider requires endpoint.' }, { status: 400 })
      }
      const customKey = typeof body.apiKey === 'string' ? body.apiKey : null
      const customModel = typeof body.model === 'string' ? body.model : 'default'
      const res = await postOpenAiCompatible({ endpoint, apiKey: customKey, model: customModel, messages })
      if (!res.output) {
        return NextResponse.json({ success: false, traceId, status: 'test_failed', error: res.error ?? 'Custom endpoint returned no text.' }, { status: 502 })
      }
      return NextResponse.json(await buildSuccess({ traceId, provider: 'custom', model: customModel, output: res.output, appSlug }))
    }

    const hfKey = await getVaultApiKey('huggingface')
    const togetherKey = await getVaultApiKey('together')
    const xaiKey = await getVaultApiKey('xai') || await getVaultApiKey('grok')

    const chain: Array<() => Promise<{ output: string | null; attempt: ProviderAttempt }>> = []
    if (requestedProvider === 'auto' || requestedProvider === 'huggingface') {
      chain.push(() => tryHuggingFace({ endpoint, apiKey: hfKey, model, prompt, messages }))
    }
    if (requestedProvider === 'auto' || requestedProvider === 'together') {
      const togetherModel = typeof body.model === 'string' && requestedProvider === 'together'
        ? body.model
        : DEFAULT_TOGETHER_ADULT_TEXT_MODEL
      chain.push(() => tryTogether(togetherKey, togetherModel, messages))
    }
    if (requestedProvider === 'auto' || requestedProvider === 'xai') {
      const xaiModel = typeof body.model === 'string' && requestedProvider === 'xai'
        ? body.model
        : DEFAULT_XAI_ADULT_TEXT_MODEL
      chain.push(() => tryXai(xaiKey, xaiModel, messages))
    }

    for (const run of chain) {
      const result = await run()
      attempts.push(result.attempt)
      if (result.output) {
        return NextResponse.json(await buildSuccess({
          traceId,
          provider: result.attempt.provider,
          model: result.attempt.model,
          output: result.output,
          appSlug,
          attempts,
        }))
      }
    }

    return NextResponse.json({
      success: false,
      traceId,
      status: 'needs_setup',
      outputType: 'text',
      error: 'Adult text providers were reached in order, but no provider returned text. Configure a Hugging Face private/local endpoint, Together key/model, or xAI/Grok key/model.',
      attempts,
    }, { status: 503 })
  } catch (err) {
    return NextResponse.json({
      success: false,
      traceId,
      status: 'server_error',
      error: err instanceof Error ? err.message : 'Unknown adult text error.',
    }, { status: 500 })
  }
}

async function buildSuccess(opts: {
  traceId: string
  provider: string
  model: string
  output: string
  appSlug: string
  attempts?: ProviderAttempt[]
}) {
  const outputScan = scanContent(opts.output, opts.appSlug)
  if (outputScan.flagged) {
    return {
      success: false,
      traceId: opts.traceId,
      status: 'output_policy_refused',
      categories: outputScan.categories,
      output: null,
      error: blockedExplanation(outputScan.categories),
      attempts: opts.attempts,
    }
  }
  if (hasDegradingTerms(opts.output)) {
    return {
      success: false,
      traceId: opts.traceId,
      status: 'output_policy_refused',
      categories: ['degrading_content'],
      output: null,
      error: 'Model output was blocked because it contained degrading or dehumanizing content.',
      attempts: opts.attempts,
    }
  }
  return {
    success: true,
    traceId: opts.traceId,
    status: 'ready',
    capability: 'adult_text',
    outputType: 'text',
    provider: opts.provider,
    model: opts.model,
    output: opts.output,
    attempts: opts.attempts,
  }
}
