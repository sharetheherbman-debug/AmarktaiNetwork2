/**
 * Admin API — App Agents
 *
 * GET  /api/admin/app-agents        → List all app agents
 * POST /api/admin/app-agents        → Create a new app agent
 */

import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { createAppAgent, listAppAgents, syncAdminNotesToRules } from '@/lib/app-agent'

interface SessionData { admin?: boolean }

async function requireAdmin(): Promise<boolean> {
  const session = await getIronSession<SessionData>(await cookies(), {
    cookieName: 'amarktai-admin-session',
    password: process.env.SESSION_SECRET || 'dev-secret-replace-in-production-min-32-chars',
  })
  return !!session.admin
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const agents = await listAppAgents()
    return NextResponse.json({ agents })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list agents' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json() as {
      appSlug: string
      appName: string
      appUrl?: string
      appType?: string
      purpose?: string
      adminNotes?: string
      [key: string]: unknown
    }

    if (!body.appSlug || !body.appName) {
      return NextResponse.json({ error: 'appSlug and appName are required' }, { status: 422 })
    }

    const agent = await createAppAgent({
      appSlug: body.appSlug,
      appName: body.appName,
      appUrl: body.appUrl,
      appType: body.appType,
      purpose: body.purpose,
    })

    // If admin notes provided, parse them into structured rules
    if (body.adminNotes) {
      await syncAdminNotesToRules(agent.appSlug, body.adminNotes)
    }

    return NextResponse.json({ agent }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create agent'
    const isDuplicate = message.includes('Unique constraint')
    return NextResponse.json(
      { error: isDuplicate ? 'An agent already exists for this app' : message },
      { status: isDuplicate ? 409 : 500 },
    )
  }
}
