/**
 * POST /api/admin/settings/test-aiva
 *
 * Test Aiva STT and TTS provider connectivity.
 * - For 'auto' or 'genx' providers: checks whether the AI Engine is reachable
 * - For external providers: resolves the API key from the shared vault first,
 *   then probes the provider's health/status endpoint with that key.
 *   If no key is found in the vault AND no inline key is provided, returns a
 *   clear "key missing" error (not a fake pass).
 * - Returns sttOk, ttsOk, and per-provider messages
 *
 * Returns truthful status — never faked.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getVaultApiKey } from '@/lib/brain'
import { getGenXStatusAsync } from '@/lib/genx-client'

/** Health-probe endpoints for known providers */
const STT_PROBE: Record<string, string> = {
  openai:     'https://api.openai.com/v1/models',
  deepgram:   'https://api.deepgram.com/v1/listen',
  groq:       'https://api.groq.com/openai/v1/models',
  assemblyai: 'https://api.assemblyai.com/v2/transcript',
}

const TTS_PROBE: Record<string, string> = {
  openai:     'https://api.openai.com/v1/models',
  deepgram:   'https://api.deepgram.com/v1/speak',
  elevenlabs: 'https://api.elevenlabs.io/v1/models',
  grok:       'https://api.x.ai/v1/models',
}

/** Map from provider selection value → aiProvider vault key */
const PROVIDER_VAULT_KEY: Record<string, string> = {
  openai:     'openai',
  deepgram:   'deepgram',
  groq:       'groq',
  assemblyai: 'assemblyai',
  elevenlabs: 'elevenlabs',
  grok:       'grok',
}

interface ProbeResult {
  ok: boolean
  message: string
  httpStatus?: number
  keyMissing?: boolean
}

async function probeExternal(url: string, apiKey: string | undefined, providerName: string): Promise<ProbeResult> {
  if (!apiKey) {
    return {
      ok: false,
      keyMissing: true,
      message: `${providerName} API key not found. Add it via Admin → Settings → Providers or enter it in the Providers section.`,
    }
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` }
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) })
    // 401/403 means the endpoint exists but auth failed — provider is reachable
    const reachable = res.ok || res.status === 401 || res.status === 403 || res.status === 405
    const authOk = res.ok || res.status === 405
    if (!authOk && (res.status === 401 || res.status === 403)) {
      return {
        ok: false,
        message: `${providerName} key invalid — authentication failed (HTTP ${res.status}). Check the key in Admin → Settings → Providers.`,
        httpStatus: res.status,
      }
    }
    return {
      ok: reachable,
      message: reachable ? `${providerName} reachable (HTTP ${res.status})` : `${providerName} HTTP ${res.status}`,
      httpStatus: res.status,
    }
  } catch (err) {
    return { ok: false, message: `${providerName} unreachable: ${err instanceof Error ? err.message : 'network error'}` }
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let sttProvider = 'auto'
  let ttsProvider = 'auto'

  try {
    const body = await req.json()
    if (typeof body.sttProvider === 'string') sttProvider = body.sttProvider.trim()
    if (typeof body.ttsProvider === 'string') ttsProvider = body.ttsProvider.trim()
  } catch { /* ignore */ }

  const results: Record<string, ProbeResult> = {}

  // ── STT probe ──────────────────────────────────────────────────────────────
  if (sttProvider === 'browser') {
    results.stt = {
      ok: true,
      message: "Browser Web Speech API — availability depends on the user's browser. No server key required.",
    }
  } else if (sttProvider === 'auto' || sttProvider === 'genx') {
    const genxStatus = await getGenXStatusAsync().catch(() => null)
    if (genxStatus?.available) {
      results.stt = { ok: true, message: 'AI Engine STT — GenX is reachable and will handle transcription.' }
    } else {
      results.stt = {
        ok: false,
        message: `AI Engine STT: GenX not available (${genxStatus?.error ?? 'not configured'}). Configure a backup STT provider or fix GenX.`,
      }
    }
  } else if (STT_PROBE[sttProvider]) {
    const vaultKey = PROVIDER_VAULT_KEY[sttProvider]
    const apiKey = vaultKey ? await getVaultApiKey(vaultKey).catch(() => null) : null
    results.stt = await probeExternal(STT_PROBE[sttProvider], apiKey ?? undefined, sttProvider)
  } else {
    results.stt = { ok: false, message: `Unknown STT provider: ${sttProvider}` }
  }

  // ── TTS probe ──────────────────────────────────────────────────────────────
  if (ttsProvider === 'auto' || ttsProvider === 'genx') {
    const genxStatus = await getGenXStatusAsync().catch(() => null)
    if (genxStatus?.available) {
      results.tts = { ok: true, message: 'AI Engine TTS — GenX is reachable and will handle speech synthesis.' }
    } else {
      results.tts = {
        ok: false,
        message: `AI Engine TTS: GenX not available (${genxStatus?.error ?? 'not configured'}). Configure a backup TTS provider or fix GenX.`,
      }
    }
  } else if (TTS_PROBE[ttsProvider]) {
    const vaultKey = PROVIDER_VAULT_KEY[ttsProvider]
    const apiKey = vaultKey ? await getVaultApiKey(vaultKey).catch(() => null) : null
    results.tts = await probeExternal(TTS_PROBE[ttsProvider], apiKey ?? undefined, ttsProvider)
  } else {
    results.tts = { ok: false, message: `Unknown TTS provider: ${ttsProvider}` }
  }

  const sttOk = results.stt?.ok ?? false
  const ttsOk = results.tts?.ok ?? false

  return NextResponse.json({
    success: sttOk && ttsOk,
    sttOk,
    ttsOk,
    sttMessage: results.stt?.message ?? '',
    ttsMessage: results.tts?.message ?? '',
    sttKeyMissing: results.stt?.keyMissing ?? false,
    ttsKeyMissing: results.tts?.keyMissing ?? false,
    message: sttOk && ttsOk
      ? 'STT and TTS providers are reachable'
      : `${!sttOk ? `STT: ${results.stt?.message ?? 'failed'}` : ''}${!sttOk && !ttsOk ? ' | ' : ''}${!ttsOk ? `TTS: ${results.tts?.message ?? 'failed'}` : ''}`.trim(),
  })
}
