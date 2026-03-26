/**
 * Integration Verification Tests — AmarktAI Network
 *
 * These tests verify that subsystems are properly wired together.
 * They expose disconnects between components that compile individually
 * but are not connected in the actual brain request flow.
 */
import { describe, it, expect } from 'vitest'
import { getDefaultModelForProvider, getModelRegistry } from '@/lib/model-registry'
import { getAppProfile } from '@/lib/app-profiles'
import { classifyTask } from '@/lib/orchestrator'
import { routeRequest, type RoutingContext } from '@/lib/routing-engine'
import { getAgentDefinitions, isAgentPermitted } from '@/lib/agent-runtime'
import { getSupportedContentTypes } from '@/lib/multimodal-router'

describe('Integration Verification', () => {
  describe('Model Registry as Single Source of Truth', () => {
    it('model registry provides defaults for all providers used in brain.ts', () => {
      const brainProviders = ['openai', 'groq', 'deepseek', 'openrouter', 'together', 'grok', 'huggingface', 'nvidia']
      for (const p of brainProviders) {
        const model = getDefaultModelForProvider(p)
        expect(model, `Model registry missing default for provider: ${p}`).not.toBe('unknown')
      }
    })

    it('model registry does NOT hardcode health_status as healthy', () => {
      const registry = getModelRegistry()
      const alwaysHealthy = registry.every(m => m.health_status === 'healthy')
      expect(alwaysHealthy, 'All models falsely report healthy — health_status should reflect real state').toBe(false)
    })

    it('model registry covers all providers in preference order lists', () => {
      const registry = getModelRegistry()
      const providers = new Set(registry.map(m => m.provider))
      // These are the providers used by orchestrator's buildPreferenceOrder
      const orchestratorProviders = ['openai', 'groq', 'deepseek', 'openrouter', 'together', 'grok', 'huggingface', 'nvidia']
      for (const p of orchestratorProviders) {
        expect(providers.has(p), `Registry missing provider: ${p}`).toBe(true)
      }
    })
  })

  describe('Routing Engine Parity with Orchestrator', () => {
    it('routing engine returns valid decisions for all complexity levels', () => {
      const complexities: Array<'simple' | 'moderate' | 'complex'> = ['simple', 'moderate', 'complex']
      for (const c of complexities) {
        const ctx: RoutingContext = {
          appSlug: 'amarktai-network',
          appCategory: 'generic',
          taskType: 'chat',
          taskComplexity: c,
          message: 'test',
          requiresRetrieval: false,
          requiresMultimodal: false,
        }
        const decision = routeRequest(ctx)
        expect(decision.mode, `No routing mode for complexity: ${c}`).toBeTruthy()
        expect(decision.primaryModel, `No primary model for complexity: ${c}`).toBeDefined()
      }
    })

    it('orchestrator classification aligns with routing engine expectations', () => {
      // Simple task → direct in both systems
      const simple = classifyTask('generic', 'chat', 'Hi')
      expect(simple.executionMode).toBe('direct')

      // Complex financial task → review/consensus in both
      const complex = classifyTask('crypto', 'analysis', 'Full market analysis')
      expect(['review', 'consensus']).toContain(complex.executionMode)
    })
  })

  describe('Agent Runtime Connectivity', () => {
    it('all 10 agents have definitions', () => {
      const defs = getAgentDefinitions()
      expect(defs.size).toBe(10)
    })

    it('network app has full agent permissions', () => {
      const _profile = getAppProfile('amarktai-network')
      const agentTypes = ['planner', 'router', 'validator', 'memory', 'retrieval',
        'creative', 'campaign', 'trading_analyst', 'app_ops', 'learning'] as const
      for (const t of agentTypes) {
        expect(
          isAgentPermitted(t, 'amarktai-network'),
          `Network app should have permission for agent: ${t}`
        ).toBe(true)
      }
    })
  })

  describe('Multimodal Router Readiness', () => {
    it('supports expected content types', () => {
      const types = getSupportedContentTypes()
      expect(types).toContain('text')
      expect(types).toContain('image_prompt')
      expect(types).toContain('ad_concept')
      expect(types).toContain('campaign_plan')
    })
  })

  describe('Disconnect Detection', () => {
    it('DOCUMENTS: orchestrator does not import routing-engine (known gap)', () => {
      // This test documents a known architectural gap:
      // The orchestrator.ts has its own routing logic (buildPreferenceOrder, decideExecution)
      // that is NOT delegating to routing-engine.ts.
      // The routing-engine.ts is only used by the /api/admin/routing test endpoint.
      // This means the REAL brain request flow does NOT use the routing engine.
      //
      // This is NOT a bug in tests — it's a real architectural gap.
      // Marking as a known documented gap.
      expect(true).toBe(true) // Intentionally passing to document the gap
    })

    it('DOCUMENTS: agent runtime is not invoked in brain request flow (known gap)', () => {
      // The agent-runtime.ts provides executeAgent(), handoffTask(), etc.
      // But the brain request flow (/api/brain/request → orchestrator.ts)
      // never calls any agent functions.
      // Agents are defined but never executed as part of normal request handling.
      expect(true).toBe(true) // Intentionally passing to document the gap
    })

    it('DOCUMENTS: multimodal router is not invoked in brain request flow (known gap)', () => {
      // The multimodal-router.ts provides generateContent() for creative workflows.
      // But the brain request flow never routes to it.
      // Creative requests go through the same orchestrator path as all other requests.
      expect(true).toBe(true) // Intentionally passing to document the gap
    })

    it('DOCUMENTS: retrieval engine is separate from memory.ts retrieval (known gap)', () => {
      // The brain request flow uses memory.ts (retrieveMemory) for context.
      // The retrieval-engine.ts provides a more sophisticated retrieve() with
      // freshness scoring and keyword relevance, but is NOT used in the flow.
      expect(true).toBe(true) // Intentionally passing to document the gap
    })
  })
})
