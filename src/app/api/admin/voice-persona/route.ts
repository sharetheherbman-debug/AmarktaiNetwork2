/**
 * Admin API — Voice Persona
 *
 * GET  /api/admin/voice-persona?appSlug=xxx → Get voice settings for an app agent
 * POST /api/admin/voice-persona             → Update voice persona for an app agent
 */

import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

interface SessionData { admin?: boolean }

async function requireAdmin(): Promise<boolean> {
  const session = await getIronSession<SessionData>(await cookies(), {
    cookieName: 'amarktai-admin-session',
    password: process.env.SESSION_SECRET || 'dev-secret-replace-in-production-min-32-chars',
  })
  return !!session.admin
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const appSlug = searchParams.get('appSlug')

    if (appSlug) {
      const agent = await prisma.appAgent.findUnique({
        where: { appSlug },
        select: {
          appSlug: true, appName: true,
          voiceStyle: true, voiceTone: true, voicePersonality: true,
          voiceSpeed: true, voiceGender: true, voiceAccent: true,
        },
      })
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      return NextResponse.json({ persona: agent })
    }

    // List all app agents with voice persona info
    const agents = await prisma.appAgent.findMany({
      where: { active: true },
      select: {
        appSlug: true, appName: true,
        voiceStyle: true, voiceTone: true, voicePersonality: true,
        voiceSpeed: true, voiceGender: true, voiceAccent: true,
      },
      orderBy: { appName: 'asc' },
    })

    return NextResponse.json({ agents })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get voice persona' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json() as {
      appSlug: string
      voiceStyle?: string
      voiceTone?: string
      voicePersonality?: string
      voiceSpeed?: string
      voiceGender?: string
      voiceAccent?: string
    }

    if (!body.appSlug) {
      return NextResponse.json({ error: 'appSlug is required' }, { status: 400 })
    }

    const VALID_STYLES = ['neutral', 'warm', 'authoritative', 'gentle', 'energetic']
    const VALID_TONES = ['professional', 'casual', 'empathetic', 'cheerful']
    const VALID_PERSONALITIES = ['helpful', 'playful', 'serious', 'caring']
    const VALID_SPEEDS = ['slow', 'normal', 'fast']
    const VALID_GENDERS = ['male', 'female', 'neutral']

    const data: Record<string, string> = {}
    if (body.voiceStyle && VALID_STYLES.includes(body.voiceStyle)) data.voiceStyle = body.voiceStyle
    if (body.voiceTone && VALID_TONES.includes(body.voiceTone)) data.voiceTone = body.voiceTone
    if (body.voicePersonality && VALID_PERSONALITIES.includes(body.voicePersonality)) data.voicePersonality = body.voicePersonality
    if (body.voiceSpeed && VALID_SPEEDS.includes(body.voiceSpeed)) data.voiceSpeed = body.voiceSpeed
    if (body.voiceGender && VALID_GENDERS.includes(body.voiceGender)) data.voiceGender = body.voiceGender
    if (body.voiceAccent !== undefined) data.voiceAccent = body.voiceAccent

    const updated = await prisma.appAgent.update({
      where: { appSlug: body.appSlug },
      data,
      select: {
        appSlug: true, appName: true,
        voiceStyle: true, voiceTone: true, voicePersonality: true,
        voiceSpeed: true, voiceGender: true, voiceAccent: true,
      },
    })

    return NextResponse.json({ persona: updated })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update voice persona' },
      { status: 500 },
    )
  }
}
