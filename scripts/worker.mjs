#!/usr/bin/env node
/**
 * AmarktAI Network — Background Worker Entry Point
 *
 * Run separately from the API server to handle heavy/long-running tasks.
 *
 * Usage:
 *   node scripts/worker.mjs
 *   pm2 start scripts/worker.mjs --name amarktai-worker
 *
 * Requires: REDIS_URL, DATABASE_URL
 */

// Register TypeScript paths for module resolution
import { register } from 'node:module'

console.log('[worker] AmarktAI Network Worker starting...')
console.log('[worker] REDIS_URL:', process.env.REDIS_URL ? 'configured' : 'NOT SET')
console.log('[worker] DATABASE_URL:', process.env.DATABASE_URL ? 'configured' : 'NOT SET')

if (!process.env.REDIS_URL) {
  console.error('[worker] REDIS_URL is required for the background worker. Exiting.')
  process.exit(1)
}

// Dynamic import to let Next.js module resolution work
async function main() {
  try {
    const { startWorker } = await import('../src/lib/worker.ts')
    const worker = startWorker()
    if (!worker) {
      console.error('[worker] Failed to start worker (Redis unavailable)')
      process.exit(1)
    }
    console.log('[worker] Worker is running. Press Ctrl+C to stop.')
  } catch (err) {
    console.error('[worker] Fatal error:', err)
    process.exit(1)
  }
}

main()
