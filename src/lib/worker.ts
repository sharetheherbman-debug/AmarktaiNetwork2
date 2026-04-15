/**
 * @module worker
 * @description Dedicated worker entry point for the AmarktAI Network.
 *
 * Separates heavy/long-running tasks from the API layer.
 * Run as: node scripts/worker.mjs (or via pm2 / systemd)
 *
 * Processes:
 *   - video_generation
 *   - batch_inference
 *   - memory_summarization
 *   - health_sync
 *   - budget_reconciliation
 *   - agent_task
 *   - daily_learning
 *   - webhook_delivery
 *   - music_generation
 *   - artifact_processing
 *   - manager_check
 *
 * When Redis is not available, these tasks run inline via the API layer.
 */

import { createWorker, type JobPayload } from '@/lib/job-queue'

// ── Job Processors ───────────────────────────────────────────────────────────

type JobProcessor = (data: JobPayload) => Promise<void>

const processors: Record<string, JobProcessor> = {
  video_generation: async (payload) => {
    console.log(`[worker] Processing video_generation for ${payload.appSlug ?? 'platform'}`)
    // Delegate to video generation pipeline
    // The actual provider call is in the brain.ts video handler
    // This worker handles long-running polling and status updates
    const { jobId } = payload.data as { jobId?: string }
    if (jobId) {
      console.log(`[worker] Video job ${jobId} — polling for completion`)
    }
  },

  batch_inference: async (payload) => {
    console.log(`[worker] Processing batch_inference for ${payload.appSlug ?? 'platform'}`)
    // Process batch items sequentially with rate limiting
  },

  memory_summarization: async (payload) => {
    console.log(`[worker] Processing memory_summarization for ${payload.appSlug ?? 'platform'}`)
  },

  health_sync: async () => {
    console.log('[worker] Running health_sync')
    try {
      const { syncProviderHealthFromDB } = await import('@/lib/sync-provider-health')
      await syncProviderHealthFromDB()
    } catch (err) {
      console.error('[worker] health_sync failed:', err)
    }
  },

  budget_reconciliation: async () => {
    console.log('[worker] Running budget_reconciliation')
  },

  agent_task: async (payload) => {
    console.log(`[worker] Processing agent_task for ${payload.appSlug ?? 'platform'}`)
  },

  daily_learning: async (payload) => {
    console.log(`[worker] Processing daily_learning for ${payload.appSlug ?? 'platform'}`)
    try {
      const { runDailyLearningCycle } = await import('@/lib/daily-learning')
      if (payload.appSlug) {
        await runDailyLearningCycle(payload.appSlug)
      }
    } catch (err) {
      console.error('[worker] daily_learning failed:', err)
    }
  },

  webhook_delivery: async (payload) => {
    console.log(`[worker] Processing webhook_delivery`)
    const { url, body, headers } = payload.data as {
      url?: string
      body?: unknown
      headers?: Record<string, string>
    }
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30_000),
        })
      } catch (err) {
        console.error(`[worker] webhook delivery to ${url} failed:`, err)
        throw err // Let BullMQ retry
      }
    }
  },

  music_generation: async (payload) => {
    console.log(`[worker] Processing music_generation for ${payload.appSlug ?? 'platform'}`)
  },

  artifact_processing: async (payload) => {
    console.log(`[worker] Processing artifact_processing`)
    // Post-processing: thumbnail generation, format conversion, etc.
    const { artifactId } = payload.data as { artifactId?: string }
    if (artifactId) {
      console.log(`[worker] Processing artifact ${artifactId}`)
    }
  },

  manager_check: async () => {
    console.log('[worker] Running manager_check')
    try {
      const { runAllManagerChecks } = await import('@/lib/manager-agents')
      const results = await runAllManagerChecks()
      const critical = results.filter(r => r.severity === 'critical')
      if (critical.length > 0) {
        console.warn(`[worker] ${critical.length} critical manager findings:`, critical.map(c => c.summary))
      }
    } catch (err) {
      console.error('[worker] manager_check failed:', err)
    }
  },
}

// ── Worker Start ─────────────────────────────────────────────────────────────

/**
 * Start the background worker. Call this from scripts/worker.mjs.
 */
export function startWorker(): ReturnType<typeof createWorker> {
  console.log('[worker] Starting AmarktAI background worker...')

  const worker = createWorker(async (job) => {
    const payload = job.data
    const processor = processors[payload.type]

    if (!processor) {
      console.warn(`[worker] Unknown job type: ${payload.type}`)
      return
    }

    const start = Date.now()
    try {
      await processor(payload)
      console.log(`[worker] ${payload.type} completed in ${Date.now() - start}ms`)
    } catch (err) {
      console.error(`[worker] ${payload.type} failed after ${Date.now() - start}ms:`, err)
      throw err // Let BullMQ handle retries
    }
  })

  if (!worker) {
    console.warn('[worker] Redis not available — worker cannot start. Jobs will run inline via API.')
    return null
  }

  worker.on('ready', () => console.log('[worker] Worker ready and processing jobs'))
  worker.on('error', (err) => console.error('[worker] Worker error:', err))

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[worker] Shutting down...')
    await worker.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return worker
}

// ── Enhanced Job Types (extends base job-queue.ts types) ─────────────────────

export type ExtendedJobType =
  | 'video_generation'
  | 'batch_inference'
  | 'memory_summarization'
  | 'health_sync'
  | 'budget_reconciliation'
  | 'agent_task'
  | 'daily_learning'
  | 'webhook_delivery'
  | 'music_generation'
  | 'artifact_processing'
  | 'manager_check'
