/**
 * @module litellm-client
 * @description LiteLLM integration for AmarktAI Network.
 *
 * Provides unified provider abstraction with:
 *   - Consistent provider/model interface
 *   - Fallback routing
 *   - Cost-aware model selection
 *   - Budget band enforcement (low / balanced / premium)
 *   - App-level budget policies
 *   - Premium escalation only when needed
 *
 * Requires LITELLM_API_URL env var. Falls back to direct provider calls if unavailable.
 * Server-side only.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface LiteLLMRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  max_tokens?: number
  temperature?: number
  metadata?: Record<string, unknown>
}

export interface LiteLLMResponse {
  success: boolean
  output: string | null
  model: string
  provider: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  cost: number
  latencyMs: number
  error: string | null
}

export interface LiteLLMStatus {
  available: boolean
  proxyUrl: string | null
  error: string | null
}

export interface BudgetBand {
  mode: 'low_cost' | 'balanced' | 'best_quality'
  maxCostPerRequest: number
  preferredModels: string[]
  fallbackModels: string[]
}

// ── Configuration ───────────────────────────────────────────────────────────

const LITELLM_API_URL = process.env.LITELLM_API_URL || ''
const LITELLM_API_KEY = process.env.LITELLM_API_KEY || ''
const LITELLM_TIMEOUT = 30_000

function isConfigured(): boolean {
  return !!LITELLM_API_URL
}

// ── Status ──────────────────────────────────────────────────────────────────

export function getLiteLLMStatus(): LiteLLMStatus {
  if (!LITELLM_API_URL) {
    return { available: false, proxyUrl: null, error: 'LITELLM_API_URL not configured' }
  }
  return { available: true, proxyUrl: LITELLM_API_URL, error: null }
}

// ── Budget Bands ────────────────────────────────────────────────────────────

const BUDGET_BANDS: Record<string, BudgetBand> = {
  low_cost: {
    mode: 'low_cost',
    maxCostPerRequest: 0.002,
    preferredModels: [
      'groq/llama-3.1-8b-instant',
      'groq/llama-3.3-70b-versatile',
      'deepseek/deepseek-chat',
    ],
    fallbackModels: ['groq/llama-3.1-8b-instant'],
  },
  balanced: {
    mode: 'balanced',
    maxCostPerRequest: 0.02,
    preferredModels: [
      'groq/llama-3.3-70b-versatile',
      'openai/gpt-4o-mini',
      'deepseek/deepseek-chat',
      'anthropic/claude-3-5-haiku-latest',
    ],
    fallbackModels: ['groq/llama-3.1-8b-instant', 'deepseek/deepseek-chat'],
  },
  best_quality: {
    mode: 'best_quality',
    maxCostPerRequest: 0.15,
    preferredModels: [
      'openai/gpt-4o',
      'anthropic/claude-3-5-sonnet-latest',
      'openai/o1-mini',
      'gemini/gemini-2.0-flash',
    ],
    fallbackModels: ['openai/gpt-4o-mini', 'groq/llama-3.3-70b-versatile'],
  },
}

/**
 * Get the budget band configuration for a mode.
 */
export function getBudgetBand(mode: string): BudgetBand {
  return BUDGET_BANDS[mode] ?? BUDGET_BANDS.balanced
}

/**
 * Select the best model for a task based on budget mode and complexity.
 */
export function selectModelForBudget(
  budgetMode: string,
  taskComplexity: 'simple' | 'moderate' | 'complex',
): string {
  const band = getBudgetBand(budgetMode)

  if (taskComplexity === 'simple') {
    // Always use cheapest for simple tasks
    return band.fallbackModels[0] ?? band.preferredModels[0]
  }

  if (taskComplexity === 'complex' && budgetMode !== 'low_cost') {
    // Use best available for complex tasks (unless explicitly low_cost)
    return band.preferredModels[0]
  }

  // Moderate: use mid-range
  return band.preferredModels[Math.min(1, band.preferredModels.length - 1)]
}

// ── LiteLLM Proxy Calls ─────────────────────────────────────────────────────

/**
 * Call LiteLLM proxy for model routing. Falls back gracefully if proxy unavailable.
 */
export async function callLiteLLM(request: LiteLLMRequest): Promise<LiteLLMResponse> {
  const start = Date.now()

  if (!isConfigured()) {
    return {
      success: false,
      output: null,
      model: request.model,
      provider: '',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      cost: 0,
      latencyMs: Date.now() - start,
      error: 'LiteLLM proxy not configured',
    }
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (LITELLM_API_KEY) {
      headers['Authorization'] = `Bearer ${LITELLM_API_KEY}`
    }

    const res = await fetch(`${LITELLM_API_URL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature,
        metadata: request.metadata,
      }),
      signal: AbortSignal.timeout(LITELLM_TIMEOUT),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } }
      return {
        success: false,
        output: null,
        model: request.model,
        provider: '',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: 0,
        latencyMs: Date.now() - start,
        error: `LiteLLM HTTP ${res.status}: ${errBody?.error?.message ?? 'request failed'}`,
      }
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
      model?: string
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
      _litellm_model_cost?: number
    }

    return {
      success: true,
      output: data?.choices?.[0]?.message?.content ?? null,
      model: data?.model ?? request.model,
      provider: extractProvider(data?.model ?? request.model),
      usage: {
        prompt_tokens: data?.usage?.prompt_tokens ?? 0,
        completion_tokens: data?.usage?.completion_tokens ?? 0,
        total_tokens: data?.usage?.total_tokens ?? 0,
      },
      cost: data?._litellm_model_cost ?? 0,
      latencyMs: Date.now() - start,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      output: null,
      model: request.model,
      provider: '',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      cost: 0,
      latencyMs: Date.now() - start,
      error: `LiteLLM error: ${err instanceof Error ? err.message : 'unknown'}`,
    }
  }
}

/**
 * Extract provider name from a model string like "openai/gpt-4o".
 */
function extractProvider(model: string): string {
  return model.includes('/') ? model.split('/')[0] : 'unknown'
}
