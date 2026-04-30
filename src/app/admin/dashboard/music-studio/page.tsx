'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Music, Download, RefreshCw, AlertCircle, FileAudio,
  Sparkles, Clock, CheckCircle, XCircle, Tag,
} from 'lucide-react'

interface MusicArtifact {
  id: string
  title: string
  genre: string
  vocalStyle: string
  mood: string
  durationSeconds: number
  lyrics: string | null
  coverArtUrl: string | null
  audioUrl: string | null
  artifactType: 'generated_audio' | 'blueprint_only'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  provider: string
  model: string
  appSlug: string
  createdAt: string
}

interface MusicJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  theme: string
  genres: string[]
  vocalStyle: string
  mood: string
  errorMessage?: string
  artifactId?: string
  audioUrl?: string
  lyrics?: string
  coverArtUrl?: string
  createdAt: string
  updatedAt: string
}

interface StudioStatus {
  available: boolean
  audioProviderConfigured: boolean
  lyricsProviderConfigured: boolean
  coverArtProviderConfigured: boolean
  configuredProviders: string[]
  note: string
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

// Genre preset IDs must match backend MusicGenre enum values exactly
const GENRE_PRESETS: Array<{ id: string; label: string }> = [
  { id: 'pop', label: 'Pop' },
  { id: 'rnb', label: 'R&B' },
  { id: 'hip_hop', label: 'Hip-Hop' },
  { id: 'gospel', label: 'Gospel' },
  { id: 'rock', label: 'Rock' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'classical', label: 'Classical' },
  { id: 'country', label: 'Country' },
  { id: 'edm', label: 'Electronic' },
  { id: 'afrobeats', label: 'Afrobeats' },
  { id: 'reggae', label: 'Reggae' },
  { id: 'lofi', label: 'Soul / Lo-Fi' },
  { id: 'amapiano', label: 'Latin / Amapiano' },
  { id: 'cinematic', label: 'Folk / Cinematic' },
]

const MOOD_PRESETS = [
  'Uplifting', 'Melancholic', 'Energetic', 'Peaceful', 'Romantic',
  'Intense', 'Playful', 'Mysterious', 'Chill', 'Inspirational',
]

const VOCAL_STYLES: Array<{ id: string; label: string }> = [
  { id: 'female_lead', label: 'Female' },
  { id: 'male_lead', label: 'Male' },
  { id: 'harmonized', label: 'Mixed / Harmonized' },
  { id: 'instrumental_only', label: 'Instrumental' },
  { id: 'choir', label: 'Choir' },
  { id: 'rap', label: 'Rap' },
  { id: 'spoken_word', label: 'Spoken Word' },
  { id: 'a_cappella', label: 'A Cappella' },
  { id: 'falsetto', label: 'Falsetto' },
]

const TEMPO_OPTIONS = [
  { id: 'slow', label: 'Slow (60–80 BPM)', bpm: 70 },
  { id: 'medium', label: 'Medium (80–120 BPM)', bpm: 100 },
  { id: 'fast', label: 'Fast (120–160 BPM)', bpm: 140 },
  { id: 'very_fast', label: 'Very Fast (160+ BPM)', bpm: 175 },
]

const COVER_ART_OPTIONS = [
  { id: 'auto', label: 'Auto-generate' },
  { id: 'custom', label: 'Custom description' },
  { id: 'none', label: 'None' },
]

export default function MusicStudioPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create')
  const [artifacts, setArtifacts] = useState<MusicArtifact[]>([])
  const [status, setStatus] = useState<StudioStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<MusicJob | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Create form state
  const [theme, setTheme] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['pop'])
  const [selectedMoods, setSelectedMoods] = useState<string[]>(['Uplifting'])
  const [vocalStyle, setVocalStyle] = useState('female_lead')
  const [language, setLanguage] = useState('English')
  const [tempo, setTempo] = useState('medium')
  const [coverArtChoice, setCoverArtChoice] = useState('auto')
  const [coverArtDesc, setCoverArtDesc] = useState('')
  const [appSlug] = useState('platform')

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/music-studio/jobs/${jobId}`)
      if (!res.ok) return
      const data = await res.json()
      const job: MusicJob = data.job
      setActiveJob(job)
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        stopPolling()
        setCreating(false)
        if (job.status === 'failed') {
          const isProviderError = job.errorMessage?.toLowerCase().includes('provider') ||
            job.errorMessage?.toLowerCase().includes('not configured') ||
            job.errorMessage?.toLowerCase().includes('no audio')
          setError(isProviderError
            ? 'No audio provider configured. Please configure a music provider in Settings → AI Engine.'
            : (job.errorMessage ?? 'Generation failed'))
        } else {
          // Refresh history
          fetch('/api/admin/music-studio?limit=20')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setArtifacts(d.artifacts ?? []) })
            .catch(() => {})
        }
      }
    } catch {
      // ignore poll errors
    }
  }, [stopPolling])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [artRes, statusRes] = await Promise.all([
        fetch('/api/admin/music-studio?limit=20'),
        fetch('/api/admin/music-studio?status=true'),
      ])
      if (artRes.ok) {
        const data = await artRes.json()
        setArtifacts(data.artifacts ?? [])
      }
      if (statusRes.ok) {
        const data = await statusRes.json()
        setStatus(data.status ?? null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => () => stopPolling(), [stopPolling])

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : prev.length < 5 ? [...prev, id] : prev
    )
  }

  const toggleMood = (m: string) => {
    setSelectedMoods(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : prev.length < 5 ? [...prev, m] : prev
    )
  }

  const handleCreate = async () => {
    if (!theme.trim() || selectedGenres.length === 0) return
    setCreating(true)
    setError(null)
    setActiveJob(null)
    stopPolling()

    try {
      const res = await fetch('/api/admin/music-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_async',
          request: {
            theme: theme.trim(),
            genres: selectedGenres,
            genre: selectedGenres[0],
            productionNotes: [
              selectedMoods.length ? `Mood: ${selectedMoods.join(', ')}` : '',
              language !== 'English' ? `Language: ${language}` : '',
              `Tempo: ${TEMPO_OPTIONS.find(t => t.id === tempo)?.label ?? tempo}`,
              lyrics.trim() ? `Custom lyrics provided` : '',
            ].filter(Boolean).join('. ') || undefined,
            lyrics: lyrics.trim() || undefined,
            vocalStyle,
            language,
            coverArtDescription: coverArtChoice === 'custom' ? coverArtDesc.trim() || undefined : undefined,
            includeCoverArt: coverArtChoice !== 'none',
            includeLyrics: true,
            appSlug,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      const jobId = data.job?.id ?? data.jobId
      if (jobId) {
        // Start polling
        pollRef.current = setInterval(() => pollJob(jobId), 3000)
        pollJob(jobId)
      } else {
        setCreating(false)
        await load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Creation failed')
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
        <span className="ml-3 text-sm text-slate-400">Loading Music Studio…</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <Music className="w-6 h-6 text-violet-400" />
              Music Studio
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create music, lyrics, instrumentals, and cover art with AI
            </p>
          </div>
          <button onClick={load} className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </motion.div>

      {/* Status Banner */}
      {status && (
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <div className={`rounded-xl border p-4 ${
            status.available
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-amber-500/20 bg-amber-500/5'
          }`}>
            <div className="flex items-center gap-3">
              {status.available ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${status.available ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {status.available ? 'Music Studio Active' : 'Music Studio — Limited Mode'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{status.note}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <StatusPill label="Audio Generation" ok={status.audioProviderConfigured} />
              <StatusPill label="Lyrics" ok={status.lyricsProviderConfigured} />
              <StatusPill label="Cover Art" ok={status.coverArtProviderConfigured} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['create', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              activeTab === tab
                ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'create' ? '✦ Create' : `History (${artifacts.length})`}
          </button>
        ))}
      </div>

      {/* Create Tab */}
      {activeTab === 'create' && (
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              Create New Track
            </h2>

            {/* Theme */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Song theme / idea <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={theme}
                onChange={e => setTheme(e.target.value)}
                placeholder="e.g. 'An uplifting gospel song about hope and resilience'"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
              />
            </div>

            {/* Lyrics */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Custom lyrics <span className="text-slate-600">(optional)</span></label>
              <textarea
                value={lyrics}
                onChange={e => setLyrics(e.target.value)}
                placeholder="Paste or write your own lyrics, or leave blank to auto-generate"
                rows={4}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Genre <span className="text-slate-600">(select up to 5)</span></label>
              <div className="flex flex-wrap gap-2">
                {GENRE_PRESETS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      selectedGenres.includes(g.id)
                        ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Mood <span className="text-slate-600">(select up to 5)</span></label>
              <div className="flex flex-wrap gap-2">
                {MOOD_PRESETS.map(m => (
                  <button
                    key={m}
                    onClick={() => toggleMood(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      selectedMoods.includes(m)
                        ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vocal style */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Vocal style</label>
                <select
                  value={vocalStyle}
                  onChange={e => setVocalStyle(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
                >
                  {VOCAL_STYLES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Language</label>
                <input
                  type="text"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {/* Tempo */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tempo</label>
                <select
                  value={tempo}
                  onChange={e => setTempo(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
                >
                  {TEMPO_OPTIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              {/* Cover Art */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Cover art</label>
                <select
                  value={coverArtChoice}
                  onChange={e => setCoverArtChoice(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
                >
                  {COVER_ART_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Cover art description */}
            {coverArtChoice === 'custom' && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Cover art description</label>
                <input
                  type="text"
                  value={coverArtDesc}
                  onChange={e => setCoverArtDesc(e.target.value)}
                  placeholder="Describe the cover art you want"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Job status */}
            {activeJob && (() => {
              const isCompleted = activeJob.status === 'completed'
              const isFailed = activeJob.status === 'failed'
              const borderClass = isCompleted
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : isFailed
                  ? 'border-red-500/20 bg-red-500/5'
                  : 'border-blue-500/20 bg-blue-500/5'
              return (
              <div className={`p-4 rounded-xl border ${borderClass}`}>
                <div className="flex items-center gap-2 mb-2">
                  {activeJob.status === 'completed' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                   activeJob.status === 'failed' ? <XCircle className="w-4 h-4 text-red-400" /> :
                   <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
                  <span className="text-sm font-medium text-white capitalize">{activeJob.status}</span>
                </div>
                {activeJob.status === 'processing' || activeJob.status === 'pending' ? (
                  <p className="text-xs text-slate-400">Generating your track… this may take a minute.</p>
                ) : null}
                {activeJob.status === 'completed' && activeJob.audioUrl && (
                  <div className="mt-3 space-y-3">
                    <audio controls className="w-full h-8" preload="none">
                      <source src={activeJob.audioUrl} type="audio/mpeg" />
                    </audio>
                    {activeJob.lyrics && (
                      <details>
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">View Lyrics</summary>
                        <pre className="mt-1 text-xs text-slate-500 whitespace-pre-wrap max-h-32 overflow-y-auto">{activeJob.lyrics}</pre>
                      </details>
                    )}
                    <a href={activeJob.audioUrl} download className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
                      <Download className="w-3 h-3" /> Download
                    </a>
                  </div>
                )}
                {activeJob.status === 'completed' && activeJob.coverArtUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={activeJob.coverArtUrl} alt="Cover art" className="mt-3 w-24 h-24 rounded-lg object-cover" />
                )}
              </div>
              )
            })()}

            {/* Generate button */}
            <div>
              <button
                onClick={handleCreate}
                disabled={creating || !theme.trim() || selectedGenres.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-opacity"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                {creating ? 'Generating…' : 'Generate Track'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-violet-400" />
            Music Library ({artifacts.length})
          </h2>

          {artifacts.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
              <Music className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No tracks yet. Create your first track in the Create tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {artifacts.map(a => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {a.coverArtUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={a.coverArtUrl}
                        alt="Cover"
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                        <Music className="w-6 h-6 text-violet-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">{a.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {a.genre}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {Math.floor(a.durationSeconds / 60)}:{String(a.durationSeconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <ArtifactTypeBadge type={a.artifactType} />
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  </div>

                  {a.audioUrl && (
                    <div className="mt-3">
                      <audio controls className="w-full h-8" preload="none">
                        <source src={a.audioUrl} type="audio/mpeg" />
                      </audio>
                    </div>
                  )}

                  {a.lyrics && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">View Lyrics</summary>
                      <pre className="mt-1 text-xs text-slate-500 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {a.lyrics}
                      </pre>
                    </details>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {a.audioUrl && (
                      <a href={a.audioUrl} download className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                        <Download className="w-3 h-3" /> Download
                      </a>
                    )}
                    <span className="text-xs text-slate-600">{a.provider}/{a.model}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
      ok ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
         : 'text-slate-400 border-white/10 bg-white/5'
    }`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  )
}

function ArtifactTypeBadge({ type }: { type: string }) {
  const isGenerated = type === 'generated_audio'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${
      isGenerated ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
    }`}>
      {isGenerated ? 'Generated' : 'Blueprint'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'text-emerald-400',
    generating: 'text-amber-400',
    pending: 'text-slate-400',
    failed: 'text-red-400',
  }
  return (
    <span className={`text-xs ${colors[status] ?? 'text-slate-400'}`}>
      {status}
    </span>
  )
}

