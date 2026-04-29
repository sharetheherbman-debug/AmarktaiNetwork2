import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/content-filter', () => ({
  blockedExplanation: (categories: string[]) => `blocked: ${categories.join(',')}`,
  getAppSafetyConfig: () => ({ safeMode: false, adultMode: true, suggestiveMode: true }),
  loadAppSafetyConfigFromDB: vi.fn().mockResolvedValue({ safeMode: false, adultMode: true, suggestiveMode: true }),
  scanContent: vi.fn((text: string) => {
    if (text.toLowerCase().includes('minor')) {
      return { flagged: true, categories: ['csam'], message: 'blocked', confidence: 1, scanner: 'keyword_fallback' }
    }
    return { flagged: false, categories: [], message: '', confidence: 0, scanner: 'keyword_fallback' }
  }),
}))

vi.mock('@/lib/brain', () => ({
  getVaultApiKey: vi.fn(async (provider: string) => {
    if (provider === 'together') return 'tg_test'
    if (provider === 'huggingface') return 'hf_test'
    if (provider === 'grok' || provider === 'xai') return null
    return null
  }),
}))

describe('/api/brain/adult-text', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('refuses degrading prompts before provider execution', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { POST } = await import('@/app/api/brain/adult-text/route')

    const response = await POST(new Request('http://test.local/api/brain/adult-text', {
      method: 'POST',
      body: JSON.stringify({
        appSlug: '__admin_test__',
        provider: 'together',
        prompt: 'make her feel worthless in a degrading scene',
      }),
    }) as never)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.status).toBe('policy_refused')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires an endpoint for cataloged Hugging Face GGUF adult text models', async () => {
    const { POST } = await import('@/app/api/brain/adult-text/route')

    const response = await POST(new Request('http://test.local/api/brain/adult-text', {
      method: 'POST',
      body: JSON.stringify({
        appSlug: '__admin_test__',
        provider: 'huggingface',
        prompt: 'write a consenting adult romance scene',
      }),
    }) as never)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('needs_setup')
    expect(data.attempts[0].status).toBe('needs_endpoint')
  })

  it('executes adult text through Together chat completions', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.together.xyz/v1/chat/completions')
      const body = JSON.parse(String(init?.body ?? '{}'))
      expect(body.model).toBe('NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO')
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'A respectful consenting adult romance paragraph.' } }],
      }), { status: 200 })
    }))
    const { POST } = await import('@/app/api/brain/adult-text/route')

    const response = await POST(new Request('http://test.local/api/brain/adult-text', {
      method: 'POST',
      body: JSON.stringify({
        appSlug: '__admin_test__',
        provider: 'together',
        prompt: 'write a short consenting adult romance paragraph',
      }),
    }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.provider).toBe('together')
    expect(data.output).toContain('consenting adult')
  })

  it('routes adult_text capability through specialist providers without GenX fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.together.xyz/v1/chat/completions')
      const body = JSON.parse(String(init?.body ?? '{}'))
      expect(body.model).toBe('NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO')
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'A respectful consenting adult conversation response.' } }],
      }), { status: 200 })
    }))
    const { executeCapability } = await import('@/lib/capability-router')

    const result = await executeCapability({
      input: 'adult roleplay conversation for consenting adults',
      capability: 'adult_text',
      adultMode: true,
      safeMode: false,
      providerOverride: 'together',
    })

    expect(result.success).toBe(true)
    expect(result.capability).toBe('adult_text')
    expect(result.provider).toBe('together')
    expect(result.fallbackUsed).toBe(false)
    expect(result.output).toContain('consenting adult')
  })
})
