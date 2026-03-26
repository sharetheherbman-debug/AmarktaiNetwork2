# AmarktAI Network — Production Go-Live Audit Report

**Date:** 2026-03-26
**Branch:** `copilot/transform-into-production-ready-ai-system`
**Auditor:** Automated verification

---

## FINAL VERDICT: PARTIALLY READY

The system has a **solid architectural foundation** with real provider integrations, real
orchestration logic, real memory, and real event logging. However, several new subsystems
(routing engine, agent runtime, multimodal router, retrieval engine) are **implemented
but not wired into the actual brain request flow**. They exist as standalone modules
used only by admin status endpoints and tests.

---

## PHASE 1 — SUBSYSTEM VERIFICATION

### 1. Model Registry ✅ IMPLEMENTED — ⚠️ PARTIALLY CONNECTED

**What works:**
- 14 models across 8 providers (OpenAI, Grok, NVIDIA, HuggingFace, DeepSeek, Groq, OpenRouter, Together)
- 27 metadata fields per model (capabilities, cost/latency tiers, roles, specialist domains)
- Helper functions: getModelsByProvider, getModelsByCapability, getModelsByRole, etc.
- `getDefaultModelForProvider()` is now the single source of truth

**What was fixed in this audit:**
- Removed duplicated `defaultModelFor()` from both `orchestrator.ts` and `brain.ts`
- Both now delegate to model-registry's `getDefaultModelForProvider()`
- Fixed `health_status` from always-`'healthy'` to `'configured'` (truthful default)

**Remaining gap:**
- Model registry capability metadata (supports_chat, supports_reasoning, etc.) is NOT
  used by the orchestrator's actual routing decisions. The orchestrator uses hardcoded
  `buildPreferenceOrder()` lists instead of querying model capabilities.
- The `enabled` and `health_status` fields in the registry are static constants, not
  connected to the database AiProvider table's health status.

### 2. Provider Integration ✅ WORKING

**Real provider adapters exist in `brain.ts` for:**
- OpenAI (OpenAI-compatible endpoint) ✅
- Grok / xAI (OpenAI-compatible endpoint at api.x.ai) ✅
- NVIDIA NIM (OpenAI-compatible at integrate.api.nvidia.com) ✅
- Hugging Face Inference (custom endpoint) ✅
- DeepSeek (OpenAI-compatible) ✅
- Groq (OpenAI-compatible) ✅
- OpenRouter (OpenAI-compatible with custom headers) ✅
- Together AI (OpenAI-compatible) ✅
- Gemini (Google-specific REST API) ✅

**Missing:**
- No Qwen-specific provider. Qwen is NOT supported as a direct provider.
  (Could be accessed via OpenRouter/Together as an aggregated model)

**Working features per provider:**
- API key storage in DB (AiProvider table) ✅
- Health check endpoint (`/api/admin/providers/[id]/health-check`) ✅
- Real inference with 30s timeout ✅
- Error handling with normalised ProviderCallResult ✅
- Timeout/abort handling ✅

### 3. Routing Engine ⚠️ IMPLEMENTED — ❌ NOT CONNECTED TO BRAIN FLOW

**What exists:**
- `routing-engine.ts` — 8 routing modes (direct, specialist, review, consensus,
  retrieval_chain, agent_chain, multimodal_chain, premium_escalation)
- Policy-driven: reads from model registry + app profiles
- Cost-aware and latency-aware routing
- App profile-based provider/model filtering

**Critical gap:**
- The routing engine is **NEVER called** from the brain request flow.
- The orchestrator (`orchestrator.ts`) has its own independent routing logic:
  `buildPreferenceOrder()` and `decideExecution()`.
- The routing engine is only accessible via `/api/admin/routing` test endpoint.
- **Impact:** All routing modes beyond direct/specialist/review/consensus (i.e.,
  retrieval_chain, agent_chain, multimodal_chain, premium_escalation) do not
  exist in the real request flow.

### 4. Agent Runtime ⚠️ IMPLEMENTED — ❌ NOT CONNECTED TO BRAIN FLOW

**What exists:**
- 10 agent definitions (planner, router, validator, memory, retrieval, creative,
  campaign, trading_analyst, app_ops, learning)
- `executeAgent()` — builds system prompt, calls provider, returns result
- `handoffTask()` — agent-to-agent handoff with lineage tracking
- `isAgentPermitted()` — permission checks via app profiles
- In-memory task ledger for tracking active tasks

**Critical gap:**
- No brain request ever triggers an agent. `executeAgent()` is never called
  from the actual request flow.
- The `/api/admin/agents` endpoint only returns definitions and status counts.
- Agent chains (planner → router → validator) are architecturally supported
  but never executed in production.

### 5. Learning Engine ✅ CONNECTED — ✅ WORKING

**What works:**
- `logRouteOutcome()` is called from `/api/brain/request` after every request ✅
- Outcomes saved to MemoryEntry table with memoryType='learned' ✅
- `getProviderPerformance()` queries BrainEvent table for real metrics ✅
- `generateInsights()` produces data-driven insights from real data ✅
- `getLearningStatus()` returns real DB counts ✅
- Enhanced `/api/admin/learning` endpoint with views: status, insights, performance, ecosystem ✅

**Note:** The learning engine is the **best-connected** new subsystem. It's properly
wired into the brain request flow.

### 6. Retrieval Engine ⚠️ IMPLEMENTED — ❌ NOT CONNECTED TO BRAIN FLOW

**What exists:**
- `retrieve()` — app-scoped + global memory retrieval with weighted scoring
- Freshness scoring (exponential decay over 30 days)
- Keyword relevance scoring
- `pruneExpiredEntries()` — cleanup strategy
- `getRetrievalStatus()` — real DB counts

**Critical gap:**
- The brain request flow uses `memory.ts` (`retrieveMemory`) for context, NOT
  `retrieval-engine.ts` (`retrieve`).
- The retrieval engine's scoring, freshness decay, and keyword relevance are
  never used in real requests.
- Embeddings: NOT implemented. `embeddingsEnabled` is always false.
- Reranking: NOT implemented. `rerankEnabled` is always false.

### 7. Multimodal Router ⚠️ IMPLEMENTED — ❌ NOT CONNECTED TO BRAIN FLOW

**What exists:**
- 10 content types: text, image_prompt, ad_concept, social_post, caption,
  campaign_plan, content_calendar, reel_concept, video_concept, brand_voice
- `generateContent()` — builds specialized prompts per content type
- `buildCreativePrompt()` — content-type-specific prompt construction
- Brand voice and campaign memory integration

**Critical gap:**
- The brain request flow never routes to the multimodal router.
- Creative/marketing requests go through the same orchestrator path as all others.
- No actual image generation, video generation, or multimodal processing occurs.
- The system generates TEXT about images/videos, not actual multimedia.

### 8. Readiness Audit ✅ IMPLEMENTED — ✅ TRUTHFUL

**What works:**
- 15 audit checks covering providers, registries, agents, memory, etc.
- Queries real DB state (AiProvider, Product, AdminUser, MemoryEntry tables)
- Correctly reports unconfigured providers as failures
- `/api/admin/readiness` endpoint returns real audit report

---

## PHASE 2 — FRONTEND ↔ BACKEND TRUTH CHECK

### Dashboard Pages That Exist:
1. AI Providers ✅ — real provider config, save/test
2. AI Usage ✅ — real BrainEvent data
3. App Registry ✅ — real Product data
4. Events ✅ — real event logs
5. Learning ✅ — real MemoryEntry data
6. Overview ✅ — real dashboard metrics
7. Gateway Test (brain-chat) ✅ — real test endpoint
8. Integrations ✅ — real integration data

### Dashboard Pages That DO NOT Exist:
1. ❌ Models — no UI page (API endpoint exists at `/api/admin/models`)
2. ❌ Agents — no UI page (API endpoint exists at `/api/admin/agents`)
3. ❌ Routing — no UI page (API endpoint exists at `/api/admin/routing`)
4. ❌ Readiness — no UI page (API endpoint exists at `/api/admin/readiness`)
5. ❌ Retrieval — no UI page (API endpoint exists at `/api/admin/retrieval`)
6. ❌ Multimodal — no UI page (API endpoint exists at `/api/admin/multimodal`)
7. ❌ App Profiles — no UI page (API endpoint exists at `/api/admin/app-profiles`)

---

## PHASE 3 — END-TO-END EXECUTION

| Scenario | Actual Behavior | Status |
|----------|----------------|--------|
| Simple request | Routes via orchestrator → direct mode → cheapest available provider | ✅ Works |
| Complex reasoning | Routes via orchestrator → review/consensus mode → 2 providers | ✅ Works |
| Coding task | Routes via orchestrator → specialist mode → coding specialist prompt | ⚠️ Partial (no coding-specific model selection) |
| Marketing task | Routes via orchestrator → specialist mode → marketing specialist prompt | ⚠️ Partial (no multimodal router) |
| Trading task | Routes via orchestrator → review mode → finance specialist prompt | ✅ Works with validation |
| Retrieval task | Uses memory.ts basic retrieval only | ⚠️ Partial (no retrieval engine scoring) |
| Agent chain | NOT executed — agents are never called | ❌ Not working |
| Failure/fallback | Orchestrator tries secondary provider on failure | ✅ Works |

---

## PHASE 4 — GAP REPORT

### 1. Features Claimed But Not Working in Request Flow:
- Agent chains (agent_chain routing mode)
- Multimodal pipeline (multimodal_chain routing mode)
- Retrieval-augmented generation (retrieval_chain routing mode)
- Premium escalation routing (premium_escalation routing mode)
- Routing engine policy decisions

### 2. Features Partially Implemented:
- Model registry capability metadata (defined but not used for routing)
- Retrieval engine (implemented but not connected)
- Multimodal router (implemented but not connected)

### 3. Fake or Misleading Elements:
- ~~Model registry `health_status: 'healthy'` for all models~~ **FIXED** → now `'configured'`
- ~~Duplicated `defaultModelFor()` in brain.ts and orchestrator.ts~~ **FIXED** → now delegates to model-registry

### 4. Missing Provider Integrations:
- Qwen — no direct provider adapter (accessible only via aggregators)

### 5. Non-functional in Request Flow:
- Agent runtime: defined only, never executed
- Routing engine: defined only, never called
- Multimodal router: defined only, never called
- Retrieval engine: defined only, not used for request context

### 6. No Dashboard Pages:
- Models, Agents, Routing, Readiness, Retrieval, Multimodal, App Profiles

---

## PHASE 5 — BLOCKER LIST

### CRITICAL BLOCKERS (must fix before go-live):
1. None — the core brain request flow (authenticate → classify → route → execute → log) works correctly
2. The system is honest about its capabilities — no fake AI activity or fake outputs

### HIGH PRIORITY FIXES:
1. Wire routing engine into orchestrator (use model registry capabilities for routing decisions)
2. Wire retrieval engine into brain flow (replace basic memory.ts retrieval)
3. Add dashboard pages for readiness audit (most valuable for ops visibility)
4. Connect model registry health_status to actual provider health checks

### POST-GO-LIVE IMPROVEMENTS:
1. Wire agent runtime into brain flow for multi-step tasks
2. Wire multimodal router for creative/marketing workflows
3. Add Qwen as direct provider
4. Implement real embeddings (currently keyword-only)
5. Implement real reranking
6. Add dashboard pages for all new subsystems
7. Move agent task ledger from in-memory to database

---

## PHASE 6 — FINAL VERDICT

### **PARTIALLY READY**

**Why:** The core AI operating system works correctly for real requests:
- App authentication ✅
- Task classification ✅
- Provider routing with fallback ✅
- Multi-provider execution (direct/specialist/review/consensus) ✅
- Memory context retrieval ✅
- Event logging ✅
- Learning outcome tracking ✅
- 9 real provider integrations ✅

**What's missing from production readiness:**
- The new subsystems (routing engine, agent runtime, multimodal router, retrieval engine)
  are architecturally sound but exist as **parallel infrastructure** not yet connected
  to the main brain request flow.
- No dashboard UI for 7 new API endpoints.
- The system has two routing systems: the working one (in orchestrator.ts) and the
  unused one (in routing-engine.ts).

**Recommendation:** The system CAN go live with the core flow. The new subsystems
should be wired in incrementally post-launch, starting with the routing engine
and retrieval engine.

---

## CHANGES MADE IN THIS AUDIT

### Bug Fixes:
1. **brain.ts** — Removed duplicated `defaultModelFor()`, now delegates to model-registry
2. **orchestrator.ts** — Removed duplicated `defaultModelFor()`, now delegates to model-registry
3. **model-registry.ts** — Changed all `health_status` from `'healthy'` to `'configured'`
   (honest default since health is only known after real checks)

### Tests Added:
4. **integration-verification.test.ts** — 12 tests verifying subsystem connectivity,
   documenting known gaps, and ensuring model registry is single source of truth

### Total: 108 tests passing, build clean, no regressions.
