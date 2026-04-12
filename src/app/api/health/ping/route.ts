import { NextResponse } from 'next/server'

/**
 * GET /api/health/ping — lightweight readiness probe
 *
 * Returns a minimal JSON object with no DB dependency.
 * Intended for load-balancer / uptime-monitor readiness checks.
 * Always returns 200 while the process is running.
 *
 * Response shape:
 *   { status: "ok", timestamp: "<ISO8601>" }
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  )
}
