/**
 * @module firecrawl
 * @description Firecrawl integration for AmarktAI Network.
 *
 * Crawls connected app websites to extract:
 *   - site structure, pages, docs, help content
 *   - product language, features, workflows
 *   - AI-use signals
 *   - niche/category detection
 *   - recommended AI capabilities
 *
 * Requires FIRECRAWL_API_KEY env var. Degrades gracefully if unavailable.
 * Server-side only.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface CrawlResult {
  success: boolean
  url: string
  pages: CrawledPage[]
  summary: string
  detectedNiche: string
  detectedFeatures: string[]
  aiCapabilitiesNeeded: string[]
  recommendedStack: RecommendedStack
  error: string | null
  crawledAt: string
}

export interface CrawledPage {
  url: string
  title: string
  content: string
  links: string[]
  metadata: Record<string, string>
}

export interface RecommendedStack {
  providers: string[]
  capabilities: string[]
  budgetMode: string
  safetyLevel: string
}

export interface CrawlStatus {
  available: boolean
  apiKeyConfigured: boolean
  lastCrawl: string | null
  error: string | null
}

// ── Configuration ───────────────────────────────────────────────────────────

const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1'
const FIRECRAWL_TIMEOUT = 60_000

function getFirecrawlApiKey(): string | null {
  return process.env.FIRECRAWL_API_KEY || null
}

// ── Status Check ────────────────────────────────────────────────────────────

/**
 * Check if Firecrawl is available and configured.
 */
export function getFirecrawlStatus(): CrawlStatus {
  const apiKey = getFirecrawlApiKey()
  return {
    available: !!apiKey,
    apiKeyConfigured: !!apiKey,
    lastCrawl: null,
    error: apiKey ? null : 'FIRECRAWL_API_KEY not configured',
  }
}

// ── Crawl Execution ─────────────────────────────────────────────────────────

/**
 * Crawl an app's website and extract structured knowledge.
 * Returns a CrawlResult with site analysis and recommendations.
 * Never throws — returns error in result.
 */
export async function crawlAppWebsite(url: string): Promise<CrawlResult> {
  const apiKey = getFirecrawlApiKey()
  if (!apiKey) {
    return {
      success: false,
      url,
      pages: [],
      summary: '',
      detectedNiche: '',
      detectedFeatures: [],
      aiCapabilitiesNeeded: [],
      recommendedStack: { providers: [], capabilities: [], budgetMode: 'balanced', safetyLevel: 'standard' },
      error: 'Firecrawl API key not configured. Set FIRECRAWL_API_KEY in environment.',
      crawledAt: new Date().toISOString(),
    }
  }

  try {
    // Step 1: Initiate crawl
    const crawlRes = await fetch(`${FIRECRAWL_API_URL}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        limit: 20,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
      signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT),
    })

    if (!crawlRes.ok) {
      const errBody = await crawlRes.json().catch(() => ({})) as { error?: string }
      return {
        success: false,
        url,
        pages: [],
        summary: '',
        detectedNiche: '',
        detectedFeatures: [],
        aiCapabilitiesNeeded: [],
        recommendedStack: { providers: [], capabilities: [], budgetMode: 'balanced', safetyLevel: 'standard' },
        error: `Firecrawl HTTP ${crawlRes.status}: ${errBody?.error ?? 'request failed'}`,
        crawledAt: new Date().toISOString(),
      }
    }

    const crawlData = await crawlRes.json() as {
      success?: boolean
      id?: string
      data?: Array<{ url?: string; markdown?: string; metadata?: Record<string, string> }>
    }

    // If async job, we'll need to poll — for now handle sync results
    const pages: CrawledPage[] = (crawlData.data ?? []).map(d => ({
      url: d.url ?? url,
      title: d.metadata?.title ?? '',
      content: (d.markdown ?? '').slice(0, 5000), // Limit content size
      links: [],
      metadata: d.metadata ?? {},
    }))

    // Step 2: Analyze crawled content
    const analysis = analyzeContent(pages, url)

    return {
      success: true,
      url,
      pages,
      summary: analysis.summary,
      detectedNiche: analysis.niche,
      detectedFeatures: analysis.features,
      aiCapabilitiesNeeded: analysis.capabilities,
      recommendedStack: analysis.stack,
      error: null,
      crawledAt: new Date().toISOString(),
    }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    return {
      success: false,
      url,
      pages: [],
      summary: '',
      detectedNiche: '',
      detectedFeatures: [],
      aiCapabilitiesNeeded: [],
      recommendedStack: { providers: [], capabilities: [], budgetMode: 'balanced', safetyLevel: 'standard' },
      error: isTimeout ? 'Firecrawl request timed out' : `Firecrawl error: ${err instanceof Error ? err.message : 'unknown'}`,
      crawledAt: new Date().toISOString(),
    }
  }
}

// ── Content Analysis ────────────────────────────────────────────────────────

interface ContentAnalysis {
  summary: string
  niche: string
  features: string[]
  capabilities: string[]
  stack: RecommendedStack
}

/**
 * Analyze crawled content to detect niche, features, and AI needs.
 * Uses keyword-based analysis — no external AI calls required.
 */
function analyzeContent(pages: CrawledPage[], url: string): ContentAnalysis {
  const allContent = pages.map(p => `${p.title} ${p.content}`).join(' ').toLowerCase()
  const features: string[] = []
  const capabilities: string[] = []

  // Niche detection
  const nichePatterns: Record<string, string[]> = {
    ecommerce: ['shop', 'cart', 'product', 'buy', 'checkout', 'price', 'order'],
    finance: ['finance', 'invest', 'crypto', 'trading', 'portfolio', 'stock', 'wallet'],
    health: ['health', 'medical', 'wellness', 'fitness', 'therapy', 'patient', 'doctor'],
    education: ['learn', 'course', 'tutorial', 'student', 'education', 'training', 'lesson'],
    religious: ['church', 'mosque', 'bible', 'quran', 'prayer', 'sermon', 'faith', 'scripture'],
    travel: ['travel', 'booking', 'hotel', 'flight', 'destination', 'trip', 'tour'],
    social: ['social', 'community', 'chat', 'message', 'friend', 'profile', 'post'],
    support: ['help', 'support', 'ticket', 'faq', 'contact', 'issue', 'troubleshoot'],
    creative: ['design', 'art', 'creative', 'studio', 'gallery', 'portfolio', 'visual'],
    developer: ['api', 'developer', 'documentation', 'code', 'sdk', 'github', 'deploy'],
    companion: ['companion', 'dating', 'match', 'relationship', 'personality', 'meet'],
    pets: ['pet', 'dog', 'cat', 'horse', 'animal', 'breed', 'veterinary', 'equestrian'],
  }

  let bestNiche = 'general'
  let bestScore = 0
  for (const [niche, keywords] of Object.entries(nichePatterns)) {
    const score = keywords.filter(k => allContent.includes(k)).length
    if (score > bestScore) {
      bestScore = score
      bestNiche = niche
    }
  }

  // Feature detection
  const featurePatterns: Record<string, string[]> = {
    'chat/messaging': ['chat', 'message', 'conversation', 'inbox'],
    'search': ['search', 'find', 'filter', 'browse'],
    'user accounts': ['login', 'register', 'account', 'profile', 'sign up'],
    'payments': ['payment', 'checkout', 'billing', 'subscription', 'pricing'],
    'notifications': ['notification', 'alert', 'email', 'push'],
    'media upload': ['upload', 'image', 'video', 'photo', 'gallery'],
    'analytics': ['analytics', 'dashboard', 'report', 'metrics'],
    'api/integrations': ['api', 'integration', 'webhook', 'sdk'],
  }

  for (const [feature, keywords] of Object.entries(featurePatterns)) {
    if (keywords.some(k => allContent.includes(k))) {
      features.push(feature)
    }
  }

  // AI capability recommendations
  capabilities.push('chat') // Always recommend chat
  if (features.includes('search')) capabilities.push('retrieval', 'embeddings')
  if (features.includes('media upload')) capabilities.push('image_generation', 'multimodal')
  if (bestNiche === 'developer') capabilities.push('code', 'structured_output')
  if (bestNiche === 'support') capabilities.push('agents', 'tool_use')
  if (bestNiche === 'creative') capabilities.push('image_generation', 'creative_writing')
  if (bestNiche === 'religious') capabilities.push('retrieval', 'reasoning')
  if (bestNiche === 'education') capabilities.push('reasoning', 'structured_output')

  // Recommended stack
  const safetyLevel = ['religious', 'health', 'finance', 'education'].includes(bestNiche) ? 'strict' : 'standard'
  const budgetMode = ['finance', 'health'].includes(bestNiche) ? 'best_quality' : 'balanced'
  const providers = ['groq', 'openai'] // Default cheap + quality
  if (capabilities.includes('image_generation')) providers.push('replicate')
  if (capabilities.includes('retrieval')) providers.push('cohere')

  const pageCount = pages.length
  const summary = `Crawled ${pageCount} pages from ${url}. Detected niche: ${bestNiche}. Found ${features.length} features. Recommended ${capabilities.length} AI capabilities.`

  return {
    summary,
    niche: bestNiche,
    features,
    capabilities: [...new Set(capabilities)],
    stack: { providers, capabilities: [...new Set(capabilities)], budgetMode, safetyLevel },
  }
}
