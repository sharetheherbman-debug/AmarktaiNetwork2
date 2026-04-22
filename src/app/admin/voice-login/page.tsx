'use client'

import React, { useMemo, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mic, Loader2, ShieldCheck, MicOff, AlertTriangle } from 'lucide-react'
import VoiceAccessVisualizer, { VoiceVisualMode } from '@/components/voice/VoiceAccessVisualizer'

interface VoiceRecognizer {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onerror: ((ev: Event) => void) | null
  onend: ((ev: Event) => void) | null
}

function getSpeechRecognitionConstructor(): (new () => VoiceRecognizer) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: new () => VoiceRecognizer
    webkitSpeechRecognition?: new () => VoiceRecognizer
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export default function VoiceLoginPage() {
  const router = useRouter()
  const [passphrase, setPassphrase] = useState('')
  const [mode, setMode] = useState<VoiceVisualMode>('idle')
  const [checking, setChecking] = useState(false)
  const [recording, setRecording] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const recognitionRef = useRef<VoiceRecognizer | null>(null)

  const SpeechRecAPI = getSpeechRecognitionConstructor()
  const speechSupported = !!SpeechRecAPI

  const captureVoice = useCallback(() => {
    setMicError(null)
    setResult(null)

    if (!speechSupported || !SpeechRecAPI) {
      setMicError('Speech recognition is not supported in this browser. Type your passphrase manually below.')
      return
    }

    const recognition = new SpeechRecAPI()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    setMode('listening')
    setRecording(true)

    recognition.onresult = (event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      setPassphrase(transcript)
    }

    recognition.onerror = () => {
      setMicError('Microphone capture failed. Check browser permissions and try again, or type your passphrase manually.')
      setMode('idle')
      setRecording(false)
    }

    recognition.onend = () => {
      setMode('idle')
      setRecording(false)
    }

    recognition.start()
  }, [speechSupported, SpeechRecAPI])

  const stopCapture = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setMode('idle')
    setRecording(false)
  }, [])

  const normalizedPassphrase = useMemo(() => passphrase.trim().toLowerCase(), [passphrase])

  async function validateVoiceLogin() {
    if (!normalizedPassphrase) {
      setResult({ ok: false, message: 'No passphrase captured. Speak or type your passphrase first.' })
      return
    }
    setChecking(true)
    setResult(null)
    try {
      // Server-side validation — passphrase never compared client-side
      const res = await fetch('/api/admin/voice-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: normalizedPassphrase }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string; success?: boolean }

      if (res.ok && data.success) {
        setMode('speaking')
        setResult({ ok: true, message: 'Voice login successful. Redirecting to dashboard…' })
        setTimeout(() => {
          router.push('/admin/dashboard')
        }, 1200)
      } else {
        setResult({ ok: false, message: data.error ?? 'Voice login failed. Try again or use standard login.' })
        setMode('idle')
      }
    } catch {
      setResult({ ok: false, message: 'Voice login service unavailable. Use standard login fallback.' })
      setMode('idle')
    } finally {
      setChecking(false)
      setTimeout(() => setMode('idle'), 1500)
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-10 text-white">
      <div className="mx-auto max-w-xl space-y-6">

        {/* Header + disclaimer */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h1 className="text-xl font-bold">Voice Login</h1>
          <p className="text-sm text-slate-400">
            Speak your configured passphrase to authenticate. The passphrase is validated
            server-side against your saved configuration.
          </p>
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              This is <strong>passphrase-based voice login</strong> — it recognises your spoken words,
              not your voice biometrics. It is not biometric voiceprint authentication.
            </p>
          </div>
          {!speechSupported && (
            <p className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Your browser does not support the Web Speech API. Type your passphrase manually below.
            </p>
          )}
        </div>

        <VoiceAccessVisualizer mode={mode} />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {speechSupported && (
              recording ? (
                <button onClick={stopCapture}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                  <MicOff className="h-3.5 w-3.5" /> Stop recording
                </button>
              ) : (
                <button onClick={captureVoice}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200">
                  <Mic className="h-3.5 w-3.5" /> Speak passphrase
                </button>
              )
            )}
          </div>

          {micError && <p className="text-xs text-amber-300">{micError}</p>}

          <label className="text-xs text-slate-300 block">
            Passphrase {speechSupported ? '(spoken or typed)' : '(type manually)'}
            <input
              value={passphrase}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassphrase(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); validateVoiceLogin() } }}
              placeholder="Your passphrase…"
              type="password"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/40 transition-colors"
            />
          </label>

          <button onClick={validateVoiceLogin} disabled={checking || !normalizedPassphrase}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-200 disabled:opacity-50 hover:bg-emerald-400/15 transition-colors">
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {checking ? 'Validating…' : 'Validate & Login'}
          </button>

          {result && (
            <p className={`text-xs ${result.ok ? 'text-emerald-300' : 'text-red-300'}`}>
              {result.message}
            </p>
          )}
        </div>

        <Link href="/admin/login" className="inline-flex text-sm text-cyan-300 hover:text-cyan-200 transition-colors">
          Use standard login instead →
        </Link>
      </div>
    </div>
  )
}
