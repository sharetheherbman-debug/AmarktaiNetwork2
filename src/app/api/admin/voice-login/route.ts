/**
 * POST /api/admin/voice-login
 *
 * Server-side passphrase-based voice login.
 *
 * Accepts a spoken passphrase (transcribed client-side via Web Speech API or
 * sent as plain text). Normalises and compares it against the configured
 * login passphrase using timing-safe comparison. On success, issues a real
 * iron-session cookie identical to the standard login path.
 *
 * IMPORTANT: This is passphrase-based voice login — NOT biometric voiceprint
 * authentication. The comparison is text-to-text. This is clearly labelled
 * in the UI and must never be misrepresented as biometric.
 *
 * Falls back to standard login if voice login is not enabled.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

interface VoiceAccessSettings {
  enabled: boolean
  allowVoiceLogin: boolean
  loginPassphrase: string
  voiceId?: string
  accent?: string
}

function parseSettings(notes: string | null | undefined): VoiceAccessSettings {
  if (!notes) return { enabled: false, allowVoiceLogin: false, loginPassphrase: '' }
  try {
    const p = JSON.parse(notes) as Partial<VoiceAccessSettings>
    return {
      enabled: p.enabled ?? false,
      allowVoiceLogin: p.allowVoiceLogin ?? false,
      loginPassphrase: typeof p.loginPassphrase === 'string' ? p.loginPassphrase : '',
      voiceId: p.voiceId,
      accent: p.accent,
    }
  } catch {
    return { enabled: false, allowVoiceLogin: false, loginPassphrase: '' }
  }
}

/** Timing-safe string comparison that also handles length differences */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.byteLength !== bufB.byteLength) {
    // Still run a dummy comparison to keep timing consistent
    crypto.timingSafeEqual(bufA, bufA)
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

/** Normalise a passphrase for comparison: trim, lowercase, collapse whitespace */
function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function POST(request: NextRequest) {
  let passphrase = ''
  try {
    const body = await request.json() as { passphrase?: unknown }
    if (typeof body.passphrase !== 'string') {
      return NextResponse.json({ error: 'passphrase must be a string' }, { status: 400 })
    }
    passphrase = body.passphrase
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!passphrase.trim()) {
    return NextResponse.json({ error: 'Passphrase is required' }, { status: 400 })
  }

  // Load voice access settings
  let settings: VoiceAccessSettings = { enabled: false, allowVoiceLogin: false, loginPassphrase: '' }
  try {
    // Settings key: find by prefix since the key includes the admin email.
    // We look for any voice-access-settings entry with allowVoiceLogin=true.
    const rows = await prisma.integrationConfig.findMany({
      where: { key: { startsWith: 'voice-access-settings:' } },
    })
    for (const row of rows) {
      const s = parseSettings(row.notes)
      if (s.allowVoiceLogin && s.loginPassphrase) {
        settings = s
        break
      }
    }
  } catch {
    return NextResponse.json({ error: 'Voice login service temporarily unavailable' }, { status: 503 })
  }

  if (!settings.allowVoiceLogin) {
    return NextResponse.json(
      { error: 'Voice login is not enabled. Use standard login at /admin/login.' },
      { status: 403 },
    )
  }

  if (!settings.loginPassphrase) {
    return NextResponse.json(
      { error: 'No voice passphrase configured. Set one in System → Voice Access, then try again.' },
      { status: 403 },
    )
  }

  const given = normalise(passphrase)
  const expected = normalise(settings.loginPassphrase)

  if (!timingSafeStringEqual(given, expected)) {
    return NextResponse.json(
      { error: 'Passphrase did not match. Try again or use standard login.' },
      { status: 401 },
    )
  }

  // Passphrase matched — look up any admin user to anchor the session.
  // If no DB admin exists, fall back to env-var admin (adminId=0).
  let adminId = 0
  let adminEmail = process.env.ADMIN_EMAIL ?? 'voice-login'
  try {
    const admin = await prisma.adminUser.findFirst({ orderBy: { id: 'asc' } })
    if (admin) {
      adminId = admin.id
      adminEmail = admin.email
    }
  } catch {
    // DB unavailable — continue with env-var admin identity
  }

  // Issue a real session cookie
  const session = await getSession()
  session.adminId = adminId
  session.email = adminEmail
  session.isLoggedIn = true
  await session.save()

  return NextResponse.json({
    success: true,
    email: adminEmail,
    method: 'voice_passphrase',
    note: 'Passphrase-based voice login — not biometric voiceprint authentication.',
  })
}
