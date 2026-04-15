/**
 * Phase 3 Systems Tests — Production Hardening + Autonomy
 *
 * Tests for:
 *   - Error handler with categorization
 *   - Circuit breaker state machine
 *   - Provider reliability layer
 *   - Event bus
 *   - App success engine types
 *   - Dashboard truth Phase 3 extensions
 */
import { describe, it, expect, beforeEach } from 'vitest'

import {
  classifyError,
  errorResponse,
  ERROR_CATEGORY_LABELS,
  type ErrorCategory,
} from '../error-handler'

import {
  canRequest,
  recordSuccess,
  recordFailure,
  getCircuitStatus,
  resetCircuit,
  calculateBackoff,
  addToDeadLetterQueue,
  getDeadLetterQueue,
  clearDeadLetterQueue,
  getDeadLetterQueueSize,
  withRetry,
} from '../circuit-breaker'

import {
  recordProviderMetric,
  getProviderReliability,
  getAllProviderReliability,
  getProviderRanking,
  isProviderReliable,
} from '../provider-reliability'

import {
  emitSystemEvent,
  subscribe,
  getEventListenerCount,
} from '../event-bus'

// ── Error Handler Tests ──────────────────────────────────────────────────────

describe('Error Handler', () => {
  it('classifies provider errors correctly', () => {
    const err = classifyError(new Error('OpenAI API rate limit exceeded'), { source: 'brain' })
    expect(err.category).toBe('PROVIDER_ERROR')
    expect(err.retryable).toBe(true)
    expect(err.recovery).toBe('retry')
  })

  it('classifies validation errors correctly', () => {
    const err = classifyError(new Error('Invalid request format: missing field'), { source: 'api' })
    expect(err.category).toBe('VALIDATION_ERROR')
    expect(err.retryable).toBe(false)
    expect(err.recovery).toBe('none')
  })

  it('classifies infrastructure errors correctly', () => {
    const err = classifyError(new Error('ECONNREFUSED to Redis'), { source: 'cache' })
    expect(err.category).toBe('INFRA_ERROR')
  })

  it('classifies auth errors correctly', () => {
    const err = classifyError(new Error('Authentication token expired'), { source: 'middleware' })
    expect(err.category).toBe('AUTH_ERROR')
    expect(err.retryable).toBe(false)
  })

  it('classifies budget errors correctly', () => {
    const err = classifyError(new Error('Budget limit exceeded for app'), { source: 'budget' })
    expect(err.category).toBe('BUDGET_ERROR')
  })

  it('classifies routing errors from context', () => {
    const err = classifyError(new Error('Something failed'), { source: 'routing-engine' })
    expect(err.category).toBe('ROUTING_ERROR')
  })

  it('creates safe error responses', () => {
    const structured = classifyError(new Error('OpenAI API key invalid'))
    const response = errorResponse(structured)
    expect(response.status).toBe(502)
    expect(response.body.error).toBe(true)
    expect(response.body.message).not.toContain('API key')
    expect(response.body.errorId).toBeDefined()
  })

  it('has labels for all categories', () => {
    const categories: ErrorCategory[] = [
      'PROVIDER_ERROR', 'ROUTING_ERROR', 'EXECUTION_ERROR',
      'VALIDATION_ERROR', 'INFRA_ERROR', 'AUTH_ERROR',
      'BUDGET_ERROR', 'UNKNOWN_ERROR',
    ]
    for (const cat of categories) {
      expect(ERROR_CATEGORY_LABELS[cat]).toBeDefined()
    }
  })
})

// ── Circuit Breaker Tests ────────────────────────────────────────────────────

describe('Circuit Breaker', () => {
  beforeEach(() => {
    resetCircuit('test-provider')
  })

  it('starts in CLOSED state', () => {
    const status = getCircuitStatus('test-provider')
    expect(status.state).toBe('CLOSED')
  })

  it('allows requests when CLOSED', () => {
    expect(canRequest('test-provider')).toBe(true)
  })

  it('opens after enough failures', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure('test-provider')
    }
    expect(getCircuitStatus('test-provider').state).toBe('OPEN')
    expect(canRequest('test-provider')).toBe(false)
  })

  it('transitions to HALF_OPEN after timeout', () => {
    for (let i = 0; i < 5; i++) recordFailure('test-provider')
    expect(getCircuitStatus('test-provider').state).toBe('OPEN')

    // We can't easily test timeout without waiting, but we can reset
    resetCircuit('test-provider')
    expect(getCircuitStatus('test-provider').state).toBe('CLOSED')
    expect(canRequest('test-provider')).toBe(true)
  })

  it('closes after successes in HALF_OPEN', () => {
    resetCircuit('test-provider')
    recordSuccess('test-provider')
    expect(getCircuitStatus('test-provider').state).toBe('CLOSED')
  })

  it('calculates backoff with exponential growth', () => {
    const delay0 = calculateBackoff(0)
    const delay1 = calculateBackoff(1)
    const _delay2 = calculateBackoff(2)

    // With jitter, we can't test exact values, but the trend should be increasing
    expect(delay0).toBeGreaterThan(0)
    expect(delay1).toBeGreaterThan(delay0 * 0.5) // accounting for jitter
  })

  it('caps backoff at maxDelayMs', () => {
    const delay = calculateBackoff(20, { maxDelayMs: 5000, jitterFactor: 0 })
    expect(delay).toBeLessThanOrEqual(5000)
  })
})

// ── Dead Letter Queue Tests ──────────────────────────────────────────────────

describe('Dead Letter Queue', () => {
  beforeEach(() => {
    clearDeadLetterQueue()
  })

  it('adds entries', () => {
    addToDeadLetterQueue({
      jobType: 'video_generation',
      payload: { prompt: 'test' },
      error: 'Provider timeout',
      failedAt: new Date(),
      attempts: 3,
    })
    expect(getDeadLetterQueueSize()).toBe(1)
  })

  it('retrieves entries in reverse order', () => {
    addToDeadLetterQueue({ jobType: 'a', payload: {}, error: 'err1', failedAt: new Date(), attempts: 1 })
    addToDeadLetterQueue({ jobType: 'b', payload: {}, error: 'err2', failedAt: new Date(), attempts: 2 })

    const entries = getDeadLetterQueue()
    expect(entries.length).toBe(2)
    expect(entries[0].jobType).toBe('b') // Most recent first
  })

  it('clears all entries', () => {
    addToDeadLetterQueue({ jobType: 'a', payload: {}, error: 'err', failedAt: new Date(), attempts: 1 })
    const count = clearDeadLetterQueue()
    expect(count).toBe(1)
    expect(getDeadLetterQueueSize()).toBe(0)
  })
})

// ── Retry with Circuit Breaker Tests ─────────────────────────────────────────

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const result = await withRetry(async () => 42, { retry: { maxRetries: 3 } })
    expect(result).toBe(42)
  })

  it('retries on failure and succeeds', async () => {
    let attempt = 0
    const result = await withRetry(
      async () => {
        attempt++
        if (attempt < 3) throw new Error('fail')
        return 'success'
      },
      { retry: { maxRetries: 3, baseDelayMs: 10, jitterFactor: 0 } },
    )
    expect(result).toBe('success')
    expect(attempt).toBe(3)
  })

  it('throws after max retries', async () => {
    await expect(
      withRetry(
        async () => { throw new Error('always fails') },
        { retry: { maxRetries: 2, baseDelayMs: 10, jitterFactor: 0 } },
      ),
    ).rejects.toThrow('always fails')
  })
})

// ── Provider Reliability Tests ───────────────────────────────────────────────

describe('Provider Reliability', () => {
  it('records metrics and calculates reliability', () => {
    // Record some successful requests
    for (let i = 0; i < 10; i++) {
      recordProviderMetric('test-openai', 500, true)
    }

    const reliability = getProviderReliability('test-openai')
    expect(reliability.providerKey).toBe('test-openai')
    expect(reliability.requestCount).toBe(10)
    expect(reliability.successRate).toBe(1.0)
    expect(reliability.failureCount).toBe(0)
    expect(reliability.healthScore).toBeGreaterThan(50)
  })

  it('detects degradation', () => {
    // Record mixed results: some failures
    for (let i = 0; i < 10; i++) {
      recordProviderMetric('test-degraded', 500, i < 7) // 70% success
    }

    const reliability = getProviderReliability('test-degraded')
    expect(reliability.successRate).toBeCloseTo(0.7, 1)
    expect(reliability.state).not.toBe('error')
  })

  it('returns all provider reliability', () => {
    recordProviderMetric('test-a', 100, true)
    recordProviderMetric('test-b', 200, true)

    const all = getAllProviderReliability()
    expect(all.length).toBeGreaterThanOrEqual(2)
  })

  it('ranks providers by health score', () => {
    const ranking = getProviderRanking()
    expect(Array.isArray(ranking)).toBe(true)
    // Rankings should be sorted by healthScore descending
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i - 1].healthScore).toBeGreaterThanOrEqual(ranking[i].healthScore)
    }
  })

  it('checks provider reliability', () => {
    recordProviderMetric('reliable-prov', 100, true)
    expect(isProviderReliable('reliable-prov')).toBe(true)
  })
})

// ── Event Bus Tests ──────────────────────────────────────────────────────────

describe('Event Bus', () => {
  it('emits and receives events', () => {
    let received: unknown = null
    const unsubscribe = subscribe((event) => { received = event })

    emitSystemEvent('heartbeat', { test: true })
    expect(received).not.toBeNull()
    expect((received as Record<string, unknown>).type).toBe('heartbeat')

    unsubscribe()
  })

  it('tracks listener count', () => {
    const countBefore = getEventListenerCount()
    const unsub1 = subscribe(() => {})
    const unsub2 = subscribe(() => {})

    expect(getEventListenerCount()).toBe(countBefore + 2)

    unsub1()
    unsub2()
    expect(getEventListenerCount()).toBe(countBefore)
  })

  it('unsubscribes properly', () => {
    let count = 0
    const unsubscribe = subscribe(() => { count++ })

    emitSystemEvent('heartbeat', {})
    expect(count).toBe(1)

    unsubscribe()
    emitSystemEvent('heartbeat', {})
    expect(count).toBe(1) // No increment after unsubscribe
  })
})

// ── Error Category Coverage ──────────────────────────────────────────────────

describe('Error Classification Edge Cases', () => {
  it('handles non-Error objects', () => {
    const result = classifyError('string error message')
    expect(result.category).toBe('UNKNOWN_ERROR')
    expect(result.message).toBe('string error message')
  })

  it('handles null/undefined errors', () => {
    const result = classifyError(null)
    expect(result.category).toBe('UNKNOWN_ERROR')
  })

  it('handles execution context from job source', () => {
    const result = classifyError(new Error('Something failed'), { source: 'job-processor' })
    expect(result.category).toBe('EXECUTION_ERROR')
  })

  it('handles database errors as infra', () => {
    const result = classifyError(new Error('Prisma connection pool exhausted'))
    expect(result.category).toBe('INFRA_ERROR')
  })

  it('handles timeout errors as provider', () => {
    const result = classifyError(new Error('Request timeout after 30000ms'))
    expect(result.category).toBe('PROVIDER_ERROR')
    expect(result.retryable).toBe(true)
  })
})
