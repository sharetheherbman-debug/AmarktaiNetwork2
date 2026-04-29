/**
 * GenX Client — AmarktAI Network
 *
 * GenX is the primary AI execution layer for the AmarktAI Network.
 * All AI requests are routed through GenX by default. Direct provider
 * routing (openai/groq/gemini/etc.) is only used as a fallback when
 * GenX is unavailable or returns an error.
 *
 * Endpoints:
 *   chat:   POST /v1/chat/completions
 *   media:  POST /api/v1/generate
 *   jobs:   GET  /api/v1/jobs/:id
 *   models: GET  /api/v1/models
 *
 * Model selection is policy-driven:
 *   best      — highest-capability model in GenX catalog (workspace default)
 *   cheap     — lowest-cost model for the capability
 *   balanced  — cost/quality tradeoff model
 *   fixed     — explicit model ID provided by the caller
 *
 * Server-side only. Never import from client components.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type GenXModelPolicy = 'best' | 'cheap' | 'balanced' | 'fixed'

export type GenXCapability =
  | 'chat'
  | 'code'
  | 'code_generation'
  | 'reasoning'
  | 'image_generation'
  | 'image_edit'
  | 'image_editing'
  | 'video_generation'
  | 'music_generation'
  | 'lyrics_generation'
  | 'tts'
  | 'stt'
  | 'embeddings'
  | 'multimodal'
  | 'research'
  | 'adult'
  | 'adult_text'
  | 'adult_image'
  | 'adult_video'

export type GenXOperationType =
  | 'chat'
  | 'generate'
  | 'edit'
  | 'plan'
  | 'code'
  | 'summarise'
  | 'classify'
  | 'embed'
  | 'tts'
  | 'stt'

export interface GenXModel {
  id: string
  name: string
  provider?: string
  category?: string
  capabilities: GenXCapability[]
  costTier: 'free' | 'very_low' | 'low' | 'medium' | 'high' | 'premium'
  latencyTier: 'ultra_low' | 'low' | 'medium' | 'high'
  contextWindow: number
  supportsAdult?: boolean
}

export interface GenXChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenXChatRequest {
  model: string
  messages: GenXChatMessage[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
  metadata?: Record<string, unknown>
}

export interface GenXChatResponse {
  id: string
  model: string
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface GenXMediaRequest {
  model: string
  prompt: string
  type: 'image' | 'video' | 'audio'
  width?: number
  height?: number
  duration?: number
  style?: string
  params?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface GenXMediaResponse {
  id: string
  job_id?: string
  model: string
  type: 'image' | 'video' | 'audio'
  url?: string
  result_url?: string
  base64?: string
  jobId?: string    // present when generation is async
  status: 'completed' | 'pending' | 'processing' | 'queued' | 'failed'
  error?: string
}

export interface GenXJobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'succeeded' | 'failed'
  resultUrl?: string | null
  result?: GenXMediaResponse
  error?: string
  createdAt: string
  updatedAt: string
}

export interface GenXCallResult {
  success: boolean
  output: string | null
  model: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  latencyMs: number
  error: string | null
  genxUsed: boolean
}

export interface GenXMediaResult {
  success: boolean
  url: string | null
  jobId: string | null
  status: 'pending' | 'processing' | 'completed' | 'succeeded' | 'failed'
  model: string
  latencyMs: number
  error: string | null
}

export interface GenXStatus {
  available: boolean
  apiUrl: string | null
  error: string | null
}

// ── Known GenX model catalog (static fallback when live catalog unavailable) ──

/** Known GenX text / code / reasoning models */
export const GENX_TEXT_MODELS = [
  'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.3-codex', 'gpt-5', 'gpt-5-mini',
  'claude-sonnet-4-6', 'gemini-3.1-pro', 'grok-4.2', 'grok-4.2-reasoning',
] as const

/** Known GenX image generation models */
export const GENX_IMAGE_MODELS = [
  'gpt-image-2', 'nano-banana-2', 'nano-banana-pro',
  'grok-imagine', 'grok-imagine-pro', 'recraft-v4',
  'genxlm-pro-v1-img', 'genxlm-pro-v1-img-fast',
] as const

/** Known GenX video generation models */
export const GENX_VIDEO_MODELS = [
  'veo-3.1', 'veo-3.1-fast', 'grok-imagine-video',
  'kling-v3-pro', 'kling-v3-pro-i2v',
  'kling-v2.5-turbo', 'kling-v2.5-turbo-i2v',
  'kling-v2.6-pro', 'kling-v2.6-pro-i2v',
  'seedance-v1-fast', 'seedance-v1-fast-i2v',
  'seedance-2.0', 'seedance-2.0-i2v',
  'pixverse-v5.5', 'pixverse-v5.5-i2v',
  'pixverse-v6', 'pixverse-v6-i2v',
] as const

/** Known GenX music/audio generation models */
export const GENX_AUDIO_MODELS = [
  'lyria-3-pro-preview', 'lyria-3-clip-preview',
] as const

/** Known GenX image-to-video models */
export const GENX_I2V_MODELS = [
  'kling-v2.5-turbo-i2v', 'kling-v2.6-pro-i2v',
  'seedance-v1-fast-i2v', 'pixverse-v5.5-i2v', 'pixverse-v6-i2v',
] as const

/** Known GenX TTS / voice models */
export const GENX_TTS_MODELS = [
  'grok-tts', 'aura-2', 'genxlm-voice-v1',
] as const

/** Known GenX STT / transcription models */
export const GENX_STT_MODELS = [
  'genxlm-pro-v1-tr',
] as const

const GENX_DEFAULT_MODELS: Record<GenXOperationType, string> = {
  chat:      GENX_TEXT_MODELS[0],
  generate:  GENX_IMAGE_MODELS[0],
  edit:      GENX_IMAGE_MODELS[0],
  plan:      GENX_TEXT_MODELS[0],
  code:      'gpt-5.3-codex',
  summarise: GENX_TEXT_MODELS[0],
  classify:  GENX_TEXT_MODELS[0],
  embed:     GENX_TEXT_MODELS[0],
  tts:       GENX_TTS_MODELS[0],
  stt:       GENX_STT_MODELS[0],
}

// ── Configuration ─────────────────────────────────────────────────────────────

const GENX_TIMEOUT  = 60_000 // 60 s
const PROBE_TIMEOUT = 10_000 // 10 s — fast probe only
const ENDPOINT_PROFILE_TTL_MS = 5 * 60 * 1000 // 5 min

/**
 * Whether adult content is supported by the connected GenX deployment.
 * Controlled by the GENX_ADULT_CONTENT_SUPPORTED env var.
 * Defaults to false to prevent unintentional adult routing.
 */
export const GENX_ADULT_CONTENT_SUPPORTED =
  process.env.GENX_ADULT_CONTENT_SUPPORTED === 'true'

/**
 * Discovered endpoint profile — set after probing the GenX deployment.
 * All AI calls use these paths instead of hardcoded ones, eliminating
 * 404/405 confusion when servers expose non-standard endpoint layouts.
 */
export interface GenXEndpointProfile {
  baseUrl: string
  /** Path that serves GET /models catalog, e.g. '/api/v1/models' or '/v1/models' */
  catalogPath: string
  /** Path for POST chat completions, e.g. '/v1/chat/completions' */
  chatPath: string
  /** Path for POST media generation, e.g. '/api/v1/generate' or '/v1/generate' */
  generatePath: string
  /** Unix timestamp when this profile was discovered */
  probeTime: number
}

/** In-process profile cache (one per Node.js process / worker). */
let _endpointProfile: GenXEndpointProfile | null = null

/** Invalidate the cached endpoint profile, forcing re-discovery on next call. */
export function invalidateEndpointProfile(): void {
  _endpointProfile = null
}

/**
 * Resolve the active GenX API URL and key.
 * Priority: DB (IntegrationConfig key='genx') > environment variables.
 * This allows the admin to configure GenX via the Settings UI without
 * redeploying.
 */
async function resolveGenXConfig(): Promise<{ apiUrl: string; apiKey: string }> {
  let apiUrl = process.env.GENX_API_URL ?? ''
  let apiKey = process.env.GENX_API_KEY ?? ''

  try {
    // Lazy import to avoid circular dependency — prisma is safe to import here
    const { prisma } = await import('@/lib/prisma')
    const { decryptVaultKey } = await import('@/lib/crypto-vault')
    const row = await prisma.integrationConfig.findUnique({ where: { key: 'genx' } })
    if (row?.apiUrl) apiUrl = row.apiUrl
    if (row?.apiKey) {
      const decrypted = decryptVaultKey(row.apiKey)
      if (decrypted) apiKey = decrypted
    }
  } catch {
    // DB unavailable — fall through to env vars
  }

  return { apiUrl, apiKey }
}

/**
 * Normalise a raw URL to a clean base URL (no trailing slash, no
 * well-known path suffixes).  Returns null when the URL is invalid.
 *
 * Also auto-corrects the GenX dashboard hostname (genx.sh) to the
 * API hostname (query.genx.sh) so that accidentally entering the
 * sign-up/dashboard URL does not cause HTML responses.
 */
function normaliseBaseUrl(raw: string): string | null {
  if (!raw) return null
  let url: URL
  try { url = new URL(raw) } catch { return null }
  // Redirect dashboard hostname to the API hostname
  if (url.hostname === 'genx.sh') {
    url.hostname = 'query.genx.sh'
  }
  const clean = url.pathname
    .replace(/\/api\/v1\/models\/?$/, '')
    .replace(/\/v1\/models\/?$/, '')
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '')
  return `${url.origin}${clean}`
}

/** Attempt a single probe request; return true when the endpoint is alive. */
async function probeEndpoint(
  url: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  body?: string,
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
    })
    // Any response except 404/405 means the endpoint exists
    return res.status !== 404 && res.status !== 405
  } catch {
    return false
  }
}

/**
 * Discover working endpoint paths by probing the GenX deployment.
 *
 * Catalog candidates:   /api/v1/models  →  /v1/models
 * Chat candidates:      /v1/chat/completions  (standard OpenAI-compat path)
 * Generate candidates:  /api/v1/generate  →  /v1/generate
 *
 * Caches the discovered profile for ENDPOINT_PROFILE_TTL_MS (5 min).
 * If all catalog probes fail the profile still records the default paths
 * so callers receive a clear error rather than a silent wrong URL.
 */
async function discoverEndpointProfile(baseUrl: string, apiKey: string): Promise<GenXEndpointProfile> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  // Probe catalog
  let catalogPath = '/api/v1/models'
  if (!await probeEndpoint(`${baseUrl}/api/v1/models`, 'GET', headers)) {
    if (await probeEndpoint(`${baseUrl}/v1/models`, 'GET', headers)) {
      catalogPath = '/v1/models'
    }
  }

  // Chat completions — only one standard path in OpenAI-compat APIs
  const chatPath = '/v1/chat/completions'

  // Probe generate
  const genProbeBody = JSON.stringify({ model: '__probe__', params: { prompt: 'probe' } })
  let generatePath = '/api/v1/generate'
  if (!await probeEndpoint(`${baseUrl}/api/v1/generate`, 'POST', headers, genProbeBody)) {
    if (await probeEndpoint(`${baseUrl}/v1/generate`, 'POST', headers, genProbeBody)) {
      generatePath = '/v1/generate'
    }
  }

  return { baseUrl, catalogPath, chatPath, generatePath, probeTime: Date.now() }
}

/**
 * Return a cached or freshly-discovered endpoint profile.
 * Re-probes when the cached profile is older than ENDPOINT_PROFILE_TTL_MS
 * or when the configured baseUrl changes.
 */
async function getEndpointProfile(): Promise<GenXEndpointProfile | null> {
  const { apiUrl, apiKey } = await resolveGenXConfig()
  const baseUrl = normaliseBaseUrl(apiUrl)
  if (!baseUrl) return null

  const now = Date.now()
  if (
    _endpointProfile &&
    _endpointProfile.baseUrl === baseUrl &&
    now - _endpointProfile.probeTime < ENDPOINT_PROFILE_TTL_MS
  ) {
    return _endpointProfile
  }

  const profile = await discoverEndpointProfile(baseUrl, apiKey)
  _endpointProfile = profile
  return profile
}

async function buildHeaders(): Promise<Record<string, string>> {
  const { apiKey } = await resolveGenXConfig()
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) h['Authorization'] = `Bearer ${apiKey}`
  return h
}

// ── Status ────────────────────────────────────────────────────────────────────

export function getGenXStatus(): GenXStatus {
  const envUrl = process.env.GENX_API_URL ?? ''
  if (!envUrl) {
    return {
      available: false,
      apiUrl: null,
      error: 'GENX_API_URL not configured',
    }
  }
  return { available: true, apiUrl: envUrl, error: null }
}

/**
 * Async version of getGenXStatus that also checks the DB-stored config.
 * Used by routes that need accurate status including DB-saved settings.
 */
export async function getGenXStatusAsync(): Promise<GenXStatus> {
  const { apiUrl } = await resolveGenXConfig()
  if (!apiUrl) {
    return { available: false, apiUrl: null, error: 'GenX not configured (GENX_API_URL not set and no DB config)' }
  }
  return { available: true, apiUrl, error: null }
}

// ── Model Catalog ─────────────────────────────────────────────────────────────

/** In-memory model catalog cache. Refreshed on first call and every 5 minutes. */
let _modelCache: GenXModel[] | null = null
let _modelCacheAge = 0
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function normaliseStatus(status: unknown): GenXMediaResult['status'] {
  const raw = typeof status === 'string' ? status.toLowerCase() : ''
  if (raw === 'completed' || raw === 'complete' || raw === 'success' || raw === 'succeeded') return 'completed'
  if (raw === 'failed' || raw === 'error' || raw === 'cancelled' || raw === 'canceled') return 'failed'
  if (raw === 'processing' || raw === 'running' || raw === 'in_progress') return 'processing'
  return 'pending'
}

function inferCapabilities(raw: Record<string, unknown>, id: string): GenXCapability[] {
  const category = asString(raw.category)?.toLowerCase()
  const type = asString(raw.type)?.toLowerCase()
  const provider = asString(raw.provider)?.toLowerCase() ?? ''
  const haystack = [
    id,
    asString(raw.name),
    asString(raw.description),
    category,
    type,
    provider,
    ...asStringArray(raw.capabilities),
  ].filter(Boolean).join(' ').toLowerCase()

  const capabilities = new Set<GenXCapability>()
  for (const cap of asStringArray(raw.capabilities)) {
    const normalised = cap.toLowerCase().replace(/\s+/g, '_') as GenXCapability
    capabilities.add(normalised)
  }

  if (category === 'text' || type === 'text') capabilities.add('chat')
  if (category === 'image' || type === 'image') capabilities.add('image_generation')
  if (category === 'video' || type === 'video') capabilities.add('video_generation')
  if (category === 'voice' || type === 'voice') capabilities.add('tts')
  if (category === 'audio' || type === 'audio') capabilities.add('music_generation')
  if (category === 'transcription' || type === 'transcription') capabilities.add('stt')

  if (haystack.includes('codex') || haystack.includes('code')) capabilities.add('code_generation')
  if (haystack.includes('reason')) capabilities.add('reasoning')
  if (haystack.includes('edit')) capabilities.add('image_edit')
  if (haystack.includes('music') || haystack.includes('lyria') || haystack.includes('song')) capabilities.add('music_generation')
  if (haystack.includes('tts') || haystack.includes('text-to-speech') || haystack.includes('aura')) capabilities.add('tts')
  if (haystack.includes('stt') || haystack.includes('transcription') || haystack.includes('speech-to-text')) capabilities.add('stt')
  if (haystack.includes('adult') || haystack.includes('nsfw')) capabilities.add('adult')

  return [...capabilities]
}

function normaliseModel(raw: unknown): GenXModel | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id) ?? asString(raw.model) ?? asString(raw.model_id) ?? asString(raw.slug)
  if (!id) return null
  const provider = asString(raw.provider)
  const category = asString(raw.category) ?? asString(raw.type)
  return {
    id,
    name: asString(raw.name) ?? id,
    provider,
    category,
    capabilities: inferCapabilities(raw, id),
    costTier: 'medium',
    latencyTier: 'medium',
    contextWindow: typeof raw.contextWindow === 'number'
      ? raw.contextWindow
      : typeof raw.context_window === 'number' ? raw.context_window : 0,
    supportsAdult: Boolean(raw.supportsAdult ?? raw.supports_adult ?? raw.adult),
  }
}

export interface GenXStreamEvent {
  type: 'chunk' | 'done' | 'error'
  content?: string
  error?: string
  model?: string
}

function extractModelList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (!isRecord(data)) return []
  const candidates = [data.models, data.data, data.items, data.results]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

/** Fetch the GenX model catalog using the discovered catalog endpoint. */
export async function listGenXModels(): Promise<GenXModel[]> {
  const profile = await getEndpointProfile()
  if (!profile) return []

  const now = Date.now()
  if (_modelCache && now - _modelCacheAge < MODEL_CACHE_TTL_MS) return _modelCache

  try {
    const res = await fetch(`${profile.baseUrl}${profile.catalogPath}`, {
      headers: await buildHeaders(),
      signal: AbortSignal.timeout(GENX_TIMEOUT),
    })
    if (!res.ok) return _modelCache ?? []
    const data = await res.json() as unknown
    const models = extractModelList(data)
      .map(normaliseModel)
      .filter((model): model is GenXModel => model !== null)
    _modelCache = models
    _modelCacheAge = now
    return models
  } catch {
    return _modelCache ?? []
  }
}

// ── Policy-Driven Model Selection ─────────────────────────────────────────────

/**
 * Select the best GenX model for a request based on policy, capability, and operation type.
 *
 * Policy semantics:
 *   best      — highest-capability model for the requested capability (workspace default)
 *   cheap     — lowest cost tier that satisfies the capability
 *   balanced  — medium cost tier, first match
 *   fixed     — return the fixedModelId directly (no catalog lookup)
 */
export async function selectGenXModel(
  policy: GenXModelPolicy,
  capability: GenXCapability,
  operationType: GenXOperationType,
  fixedModelId?: string,
): Promise<string> {
  // For 'fixed' policy, return the specified model ID directly
  if (policy === 'fixed' && fixedModelId) return fixedModelId

  const models = await listGenXModels()

  // Filter models that support the requested capability
  const capable = models.filter((m) => {
    if (m.capabilities.includes(capability)) return true
    if (capability === 'code' && m.capabilities.includes('code_generation')) return true
    if (capability === 'code_generation' && m.capabilities.includes('code')) return true
    if (capability === 'image_editing' && m.capabilities.includes('image_edit')) return true
    if (capability === 'image_edit' && m.capabilities.includes('image_editing')) return true
    if (capability === 'adult_image' && (m.supportsAdult || m.capabilities.includes('adult'))) return true
    if (capability === 'adult_video' && (m.supportsAdult || m.capabilities.includes('adult'))) return true
    return false
  })

  if (capable.length === 0) {
    // GenX catalog unavailable or no model matches — return a sensible default
    // that GenX itself will validate/route
    return resolveDefaultByOperation(operationType)
  }

  // Cost tier ordering (low to high)
  const COST_ORDER: GenXModel['costTier'][] = ['free', 'very_low', 'low', 'medium', 'high', 'premium']

  switch (policy) {
    case 'best': {
      // Sort by cost tier descending (premium first), then latency ascending
      const sorted = [...capable].sort((a, b) => {
        const costDiff = COST_ORDER.indexOf(b.costTier) - COST_ORDER.indexOf(a.costTier)
        if (costDiff !== 0) return costDiff
        const LATENCY_ORDER: GenXModel['latencyTier'][] = ['ultra_low', 'low', 'medium', 'high']
        return LATENCY_ORDER.indexOf(a.latencyTier) - LATENCY_ORDER.indexOf(b.latencyTier)
      })
      return sorted[0]?.id ?? resolveDefaultByOperation(operationType)
    }

    case 'cheap': {
      const sorted = [...capable].sort((a, b) =>
        COST_ORDER.indexOf(a.costTier) - COST_ORDER.indexOf(b.costTier),
      )
      return sorted[0]?.id ?? resolveDefaultByOperation(operationType)
    }

    case 'balanced': {
      // Prefer medium tier; fall back to low, then high
      const medium = capable.find((m) => m.costTier === 'medium')
      if (medium) return medium.id
      const low = capable.find((m) => m.costTier === 'low')
      if (low) return low.id
      return capable[0]?.id ?? resolveDefaultByOperation(operationType)
    }

    default:
      return capable[0]?.id ?? resolveDefaultByOperation(operationType)
  }
}

/**
 * Resolve a sensible GenX default model name for an operation type when the
 * catalog is unavailable. These are opaque identifiers that GenX itself resolves.
 */
function resolveDefaultByOperation(operationType: GenXOperationType): string {
  return GENX_DEFAULT_MODELS[operationType]
}

// ── Chat Execution ────────────────────────────────────────────────────────────

/**
 * Call GenX chat completions using the discovered chatPath.
 * Returns a normalised result. Never throws.
 */
export async function callGenXChat(request: GenXChatRequest): Promise<GenXCallResult> {
  const start = Date.now()

  const profile = await getEndpointProfile()
  if (!profile) {
    return {
      success: false, output: null, model: request.model,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latencyMs: 0, error: 'GenX not configured (GENX_API_URL not set)', genxUsed: false,
    }
  }

  const chatUrl = `${profile.baseUrl}${profile.chatPath}`

  try {
    const res = await fetch(chatUrl, {
      method: 'POST',
      headers: await buildHeaders(),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(GENX_TIMEOUT),
    })

    const latencyMs = Date.now() - start

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } | string }
      const msg = typeof errBody.error === 'string' ? errBody.error : errBody.error?.message ?? `HTTP ${res.status}`
      return { success: false, output: null, model: request.model, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, latencyMs, error: `GenX error: ${msg}`, genxUsed: true }
    }

    const data = await res.json() as GenXChatResponse
    const output = data.choices?.[0]?.message?.content ?? null

    return {
      success: true,
      output,
      model: data.model ?? request.model,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.usage?.completion_tokens ?? 0,
        total_tokens: data.usage?.total_tokens ?? 0,
      },
      latencyMs,
      error: null,
      genxUsed: true,
    }
  } catch (err) {
    return {
      success: false, output: null, model: request.model,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latencyMs: Date.now() - start,
      error: `GenX request failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      genxUsed: true,
    }
  }
}

// ── Media Generation ──────────────────────────────────────────────────────────

/**
 * Stream GenX chat completions through the OpenAI-compatible SSE endpoint.
 * This is used by Aiva so conversation can render token-by-token.
 */
export async function streamGenXChat(
  request: GenXChatRequest,
  onEvent: (event: GenXStreamEvent) => void,
  signal?: AbortSignal,
): Promise<{ success: boolean; output: string; model: string; error: string | null }> {
  const profile = await getEndpointProfile()
  if (!profile) {
    const error = 'GenX not configured (GENX_API_URL not set)'
    onEvent({ type: 'error', error })
    return { success: false, output: '', model: request.model, error }
  }

  let output = ''
  try {
    const res = await fetch(`${profile.baseUrl}${profile.chatPath}`, {
      method: 'POST',
      headers: await buildHeaders(),
      body: JSON.stringify({ ...request, stream: true }),
      signal,
    })

    if (!res.ok || !res.body) {
      const errBody = await res.text().catch(() => '')
      const error = `GenX stream error: ${errBody || `HTTP ${res.status}`}`
      onEvent({ type: 'error', error })
      return { success: false, output, model: request.model, error }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data) as {
            model?: string
            choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>
          }
          const chunk = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? ''
          if (chunk) {
            output += chunk
            onEvent({ type: 'chunk', content: chunk, model: parsed.model ?? request.model })
          }
        } catch {
          // Ignore malformed provider heartbeat lines.
        }
      }
    }

    onEvent({ type: 'done', model: request.model })
    return { success: true, output, model: request.model, error: null }
  } catch (err) {
    const error = err instanceof Error && err.name === 'AbortError'
      ? 'Stream cancelled'
      : `GenX stream failed: ${err instanceof Error ? err.message : 'unknown error'}`
    onEvent({ type: 'error', error })
    return { success: false, output, model: request.model, error }
  }
}

/**
 * Call GenX media generation using the discovered generatePath.
 * Returns a normalised result. Never throws.
 */
export async function callGenXMedia(request: GenXMediaRequest): Promise<GenXMediaResult> {
  const start = Date.now()

  const profile = await getEndpointProfile()
  if (!profile) {
    return {
      success: false, url: null, jobId: null, status: 'failed',
      model: request.model, latencyMs: 0,
      error: 'GenX not configured (GENX_API_URL not set)',
    }
  }

  const generateUrl = `${profile.baseUrl}${profile.generatePath}`
  const params: Record<string, unknown> = {
    prompt: request.prompt,
    ...request.params,
  }
  if (request.width) params.width = request.width
  if (request.height) params.height = request.height
  if (request.duration) params.duration = request.duration
  if (request.style) params.style = request.style

  // GenX accepts model-specific params. Keep type as a hint for this app's
  // generic execution layer; providers that do not need it can ignore it.
  params.type = request.type

  const metadata = request.metadata
    ? Object.fromEntries(
        Object.entries(request.metadata)
          .filter(([, value]) => value !== undefined && value !== null)
          .slice(0, 16)
          .map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]),
      )
    : undefined

  try {
    const res = await fetch(generateUrl, {
      method: 'POST',
      headers: await buildHeaders(),
      body: JSON.stringify({
        model: request.model,
        params,
        ...(metadata ? { metadata } : {}),
      }),
      signal: AbortSignal.timeout(GENX_TIMEOUT),
    })

    const latencyMs = Date.now() - start

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: string | { message?: string }, message?: string }
      const error = typeof errBody.error === 'string'
        ? errBody.error
        : errBody.error?.message ?? errBody.message ?? `GenX HTTP ${res.status}`
      return { success: false, url: null, jobId: null, status: 'failed' as const, model: request.model, latencyMs, error }
    }

    const data = await res.json() as Record<string, unknown>
    const status = normaliseStatus(data.status)
    const jobId = asString(data.job_id) ?? asString(data.jobId) ?? (
      status === 'pending' || status === 'processing' ? asString(data.id) : undefined
    )
    const url = asString(data.result_url)
      ?? asString(data.resultUrl)
      ?? asString(data.url)
      ?? asString(data.output_url)
      ?? asString(data.file_url)
    const model = asString(data.model) ?? request.model
    const error = asString(data.error) ?? (isRecord(data.error) ? asString(data.error.message) : undefined)

    return {
      success: status !== 'failed',
      url: url ?? null,
      jobId: jobId ?? null,
      status,
      model,
      latencyMs,
      error: error ?? null,
    }
  } catch (err) {
    return {
      success: false, url: null, jobId: null, status: 'failed',
      model: request.model, latencyMs: Date.now() - start,
      error: `GenX media request failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }
}

// ── Job Polling ───────────────────────────────────────────────────────────────

/**
 * Poll GenX /api/v1/jobs/:id for async job status.
 */
export async function getGenXJobStatus(jobId: string): Promise<GenXJobStatus | null> {
  const profile = await getEndpointProfile()
  if (!profile) return null

  try {
    const res = await fetch(`${profile.baseUrl}/api/v1/jobs/${encodeURIComponent(jobId)}`, {
      headers: await buildHeaders(),
      signal: AbortSignal.timeout(GENX_TIMEOUT),
    })
    if (!res.ok) return null
    const data = await res.json() as Record<string, unknown>
    const status = normaliseStatus(data.status)
    const id = asString(data.id) ?? asString(data.job_id) ?? jobId
    const resultUrl = asString(data.result_url)
      ?? asString(data.resultUrl)
      ?? asString(data.url)
      ?? asString(data.output_url)
      ?? null
    const error = asString(data.error) ?? (isRecord(data.error) ? asString(data.error.message) : undefined)
    const model = asString(data.model) ?? 'unknown'
    return {
      id,
      status: status === 'completed' ? 'completed' : status,
      resultUrl,
      result: resultUrl ? {
        id,
        model,
        type: 'image',
        url: resultUrl,
        result_url: resultUrl,
        status: 'completed',
      } : undefined,
      error,
      createdAt: asString(data.created_at) ?? asString(data.createdAt) ?? '',
      updatedAt: asString(data.updated_at) ?? asString(data.updatedAt) ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Return the currently cached endpoint profile (if any).
 * Used by the status route to expose which endpoints were discovered.
 */
export function getCachedEndpointProfile(): GenXEndpointProfile | null {
  return _endpointProfile
}

// ── Adult Capability ──────────────────────────────────────────────────────────

/**
 * Audit note: Adult content routing via GenX.
 *
 * GenX adult content support is controlled by GENX_ADULT_CONTENT_SUPPORTED=true.
 * When false (default), adult requests are NOT routed through GenX — the caller
 * must implement a separate provider path. This file explicitly does not fake
 * adult availability. Any adult capability must be explicitly enabled by
 * setting GENX_ADULT_CONTENT_SUPPORTED=true in the deployment environment.
 */
export function getAdultCapabilityStatus(): {
  supported: boolean
  route: 'genx' | 'separate_provider' | 'unavailable'
  note: string
} {
  if (GENX_ADULT_CONTENT_SUPPORTED) {
    return {
      supported: true,
      route: 'genx',
      note: 'Adult content is enabled and routed through GenX. Ensure your GenX deployment complies with applicable content policy.',
    }
  }
  return {
    supported: false,
    route: 'separate_provider',
    note: 'GenX adult content support is not enabled. Set GENX_ADULT_CONTENT_SUPPORTED=true to enable after verifying your GenX deployment supports adult content.',
  }
}

export interface AdultProviderReadiness {
  provider: 'together' | 'huggingface' | 'xai'
  configured: boolean
}

export interface AdultCapabilityReadiness {
  status: 'READY' | 'BLOCKED' | 'UNAVAILABLE'
  supported: boolean
  route: 'adult_provider_chain' | 'unavailable'
  providers: AdultProviderReadiness[]
  textModels: {
    available: boolean
    configured: boolean
    modelCount: number
    preferredModel: string
    route: 'huggingface_private_endpoint' | 'local_gguf_runtime' | 'blocked'
  }
  imageModels: {
    available: boolean
    configured: boolean
    modelCount: number
    preferredModel: string
    route: 'huggingface_inference_api' | 'huggingface_private_endpoint' | 'blocked'
  }
  videoModels: {
    available: false
    configured: boolean
    modelCount: number
    route: 'specialist_endpoint_required'
  }
  note: string
}

/**
 * Adult/suggestive generation is intentionally separate from the normal GenX
 * safe model chain. It may only use explicit adult-capable provider keys:
 * Together AI, Hugging Face, and xAI/Grok.
 */
export async function getAdultCapabilityStatusAsync(): Promise<AdultCapabilityReadiness> {
  const {
    getAdultImageModels,
    getAdultTextModels,
    getAdultVideoModels,
    getDefaultAdultImageModel,
    getDefaultAdultTextModel,
  } = await import('@/lib/adult-model-catalog')
  const adultTextModels = getAdultTextModels()
  const adultImageModels = getAdultImageModels()
  const adultVideoModels = getAdultVideoModels()
  const preferredAdultTextModel = getDefaultAdultTextModel()
  const preferredAdultImageModel = getDefaultAdultImageModel()
  const providers: AdultProviderReadiness[] = [
    { provider: 'together', configured: false },
    { provider: 'huggingface', configured: false },
    { provider: 'xai', configured: false },
  ]

  try {
    const { getVaultApiKey } = await import('@/lib/brain')
    providers[0].configured = Boolean(await getVaultApiKey('together'))
    providers[1].configured = Boolean(await getVaultApiKey('huggingface'))
    providers[2].configured = Boolean(await getVaultApiKey('xai') || await getVaultApiKey('grok'))
  } catch {
    providers[0].configured = Boolean(process.env.TOGETHER_API_KEY)
    providers[1].configured = Boolean(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN)
    providers[2].configured = Boolean(process.env.XAI_API_KEY || process.env.GROK_API_KEY)
  }

  let hfAdultEndpointConfigured = false
  try {
    const { prisma } = await import('@/lib/prisma')
    const row = await prisma.integrationConfig.findUnique({ where: { key: 'adult_mode' } })
    if (row?.notes) {
      const notes = JSON.parse(row.notes) as { providerType?: string; specialistEndpoint?: string }
      hfAdultEndpointConfigured = notes.providerType === 'huggingface' && Boolean(notes.specialistEndpoint)
    }
  } catch {
    hfAdultEndpointConfigured = Boolean(process.env.ADULT_HF_ENDPOINT_URL)
  }

  const textModels = {
    available: providers[1].configured && hfAdultEndpointConfigured,
    configured: providers[1].configured,
    modelCount: adultTextModels.length,
    preferredModel: preferredAdultTextModel.id,
    route: (providers[1].configured && hfAdultEndpointConfigured
      ? 'huggingface_private_endpoint'
      : 'blocked') as AdultCapabilityReadiness['textModels']['route'],
  }

  const imageModels = {
    available: providers[1].configured,
    configured: providers[1].configured,
    modelCount: adultImageModels.length,
    preferredModel: preferredAdultImageModel.id,
    route: (providers[1].configured
      ? 'huggingface_inference_api'
      : 'blocked') as AdultCapabilityReadiness['imageModels']['route'],
  }

  const videoModels: AdultCapabilityReadiness['videoModels'] = {
    available: false,
    configured: providers[1].configured,
    modelCount: adultVideoModels.length,
    route: 'specialist_endpoint_required' as const,
  }

  const hasProvider = providers.some((provider) => provider.configured)
  if (!hasProvider) {
    return {
      status: 'UNAVAILABLE',
      supported: false,
      route: 'unavailable',
      providers,
      textModels,
      imageModels,
      videoModels,
      note: 'Adult mode requires at least one configured adult provider key: Together AI, Hugging Face, or xAI/Grok.',
    }
  }

  return {
    status: 'READY',
    supported: true,
    route: 'adult_provider_chain',
    providers,
    textModels,
    imageModels,
    videoModels,
    note: textModels.available
      ? 'Adult mode can use the explicit provider chain. Adult text roleplay models are available through the configured Hugging Face endpoint. Guardrails still block minors, non-consensual, illegal, and unsupported explicit requests.'
      : 'Adult image mode can use configured specialist providers. Adult text roleplay models are cataloged, but require a Hugging Face private endpoint or local GGUF runtime before they are marked ready.',
  }
}
