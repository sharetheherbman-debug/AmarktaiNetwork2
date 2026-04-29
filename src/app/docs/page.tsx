/**
 * /docs — Public Brain Gateway API Reference
 *
 * Static page — no auth required. Safe to index.
 */
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'API Reference — Amarktai Network Brain Gateway',
  description: 'Integration guide for connecting your application to the Amarktai Network Brain Gateway.',
}

const CODE_STANDARD = `// Standard request
fetch('https://your-domain.com/api/brain/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appId:          'my-app',          // App slug from admin dashboard
    appSecret:      'sk-...',          // App secret from admin dashboard
    taskType:       'chat',            // Capability: chat | code | image | tts | stt | research | …
    message:        'Hello world',     // User message (max 32 000 chars)
    externalUserId: 'user-123',        // Optional — links memory to a user
    metadata:       { lang: 'en' },    // Optional key/value context
  }),
})`

const CODE_EXECUTE_TASK = `// executeTask() interface
fetch('https://your-domain.com/api/brain/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id:      'my-app',
    app_secret:  'sk-...',
    mode:        'chat',               // Equivalent to taskType
    task:        'Hello world',        // Equivalent to message
    user_context: {                    // Merged into metadata.user_context
      name:     'Alice',
      language: 'en',
    },
  }),
})`

const CODE_RESPONSE = `// Successful response
{
  "success":       true,
  "executed":      true,
  "traceId":       "abc-123",
  "taskType":      "chat",
  "output":        "Hello! How can I help you today?",
  "routedProvider": "openai",
  "routedModel":   "gpt-4o",
  "executionMode": "direct",
  "confidenceScore": 0.97,
  "validationUsed": false,
  "consensusUsed":  false,
  "fallbackUsed":   false,
  "safetyFlags":    [],
  "warnings":       [],
  "latencyMs":      342,
  "timestamp":      "2026-04-06T17:00:00.000Z"
}`

const CODE_STREAM = `// SSE streaming (text capabilities only)
const res = await fetch('https://your-domain.com/api/brain/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ appId, appSecret, taskType: 'chat', message }),
})
const reader = res.body.getReader()
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const chunk = decoder.decode(value)
  // Each line: "data: {\"choices\":[{\"delta\":{\"content\":\"token\"}}]}"
  // Final line: "data: [DONE]"
}`

const CODE_TTS = `// Text-to-Speech
fetch('https://your-domain.com/api/brain/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appId, appSecret,
    text:     'Hello world',
    voice:    'nova',           // Optional voice ID
    gender:   'female',        // 'male' | 'female'
    accent:   'american',      // Optional accent hint
    provider: 'openai',        // Optional provider override
  }),
})
// Response: { audioUrl: 'https://…/audio.mp3', provider: 'openai', … }`

const CODE_STT = `// Speech-to-Text (multipart/form-data)
const form = new FormData()
form.append('audio', audioFile)          // Audio file (mp3/wav/ogg/flac)
form.append('appId', 'my-app')
form.append('appSecret', 'sk-...')
fetch('https://your-domain.com/api/brain/stt', {
  method: 'POST',
  body: form,
})
// Response: { transcript: '…', provider: 'openai', … }`

const CODE_RESEARCH = `// Web research with sources
fetch('https://your-domain.com/api/brain/research', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appId, appSecret,
    query: 'Latest AI breakthroughs 2026',
    depth: 'deep',   // 'shallow' | 'deep'
  }),
})
// Response: { answer: '…', sources: ['https://…', …], reasoning: ['…'] }`

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 overflow-x-auto text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre">
      {code}
    </pre>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-24">
      <h2 className="text-xl font-bold text-white border-b border-zinc-800 pb-2">{title}</h2>
      {children}
    </section>
  )
}

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
    green: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
    amber: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
    violet: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${colors[color] ?? colors.blue}`}>
      {children}
    </span>
  )
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-white font-heading">Amarktai Network</span>
            <Badge color="blue">API Docs</Badge>
          </div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-white transition-colors">← Back to site</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 flex gap-12">
        {/* Sidebar */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="sticky top-28 space-y-1 text-sm">
            {[
              ['overview',    'Overview'],
              ['auth',        'Authentication'],
              ['execute',     'POST /execute'],
              ['stream',      'POST /stream'],
              ['tts',         'POST /tts'],
              ['stt',         'POST /stt'],
              ['research',    'POST /research'],
              ['image',       'POST /suggestive-image'],
              ['task-types',  'Task Types'],
              ['errors',      'Error Handling'],
              ['limits',      'Rate Limits'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block px-2 py-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 space-y-14 min-w-0">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-white">Brain Gateway — API Reference</h1>
            <p className="text-zinc-400 leading-relaxed">
              The Amarktai Network Brain Gateway is the single, unified entry point for all AI execution.
              Every connected app authenticates with its <strong className="text-zinc-200">App ID</strong> and{' '}
              <strong className="text-zinc-200">App Secret</strong>, then sends tasks to the gateway which
              handles provider selection, emotion detection, content filtering, memory, and response.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Badge color="green">REST JSON API</Badge>
              <Badge color="blue">SSE Streaming</Badge>
              <Badge color="violet">14 AI Providers</Badge>
              <Badge color="amber">DB-backed Key Vault</Badge>
            </div>
          </div>

          <Section id="overview" title="Overview">
            <p>Base URL: <code className="text-blue-400 bg-zinc-900 px-1.5 py-0.5 rounded text-sm">https://your-domain.com</code></p>
            <p className="text-sm text-zinc-400">All endpoints accept <code className="text-zinc-300">Content-Type: application/json</code> unless noted (STT uses multipart/form-data).</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-zinc-800">
                  <th className="py-2 pr-4 text-zinc-400 font-medium">Endpoint</th>
                  <th className="py-2 pr-4 text-zinc-400 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['POST /api/brain/execute', 'Main AI gateway — all capabilities (recommended)'],
                  ['POST /api/brain/request', 'Alias for /execute'],
                  ['POST /api/brain/stream',  'SSE streaming for text/code/reasoning'],
                  ['POST /api/brain/tts',     'Text-to-Speech'],
                  ['POST /api/brain/stt',     'Speech-to-Text (multipart)'],
                  ['POST /api/brain/research','Web research + synthesis'],
                  ['POST /api/brain/suggestive-image', 'Image generation'],
                ].map(([ep, desc]) => (
                  <tr key={ep}>
                    <td className="py-2 pr-4 font-mono text-xs text-blue-400">{ep}</td>
                    <td className="py-2 text-zinc-400 text-xs">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="auth" title="Authentication">
            <p className="text-sm text-zinc-400">
              Every request must include <code className="text-zinc-300">appId</code> (your app slug) and{' '}
              <code className="text-zinc-300">appSecret</code> (generated in the admin dashboard under{' '}
              <strong className="text-zinc-200">Apps → Your App → Settings</strong>).
              API keys for AI providers are stored in the database vault — you do <em>not</em> pass provider keys in requests.
            </p>
          </Section>

          <Section id="execute" title="POST /api/brain/execute">
            <p className="text-sm text-zinc-400">Accepts two request shapes — both produce the same response.</p>
            <CodeBlock code={CODE_STANDARD} />
            <p className="text-sm text-zinc-400 mt-2">Or use the <code className="text-zinc-300">executeTask()</code> interface with snake_case field names:</p>
            <CodeBlock code={CODE_EXECUTE_TASK} />
            <h3 className="text-sm font-semibold text-white mt-4">Response</h3>
            <CodeBlock code={CODE_RESPONSE} />
          </Section>

          <Section id="stream" title="POST /api/brain/stream">
            <p className="text-sm text-zinc-400">Returns Server-Sent Events (SSE). Supported for <Badge>chat</Badge> <Badge>code</Badge> <Badge>reasoning</Badge> task types.</p>
            <CodeBlock code={CODE_STREAM} />
          </Section>

          <Section id="tts" title="POST /api/brain/tts">
            <CodeBlock code={CODE_TTS} />
          </Section>

          <Section id="stt" title="POST /api/brain/stt">
            <CodeBlock code={CODE_STT} />
          </Section>

          <Section id="research" title="POST /api/brain/research">
            <CodeBlock code={CODE_RESEARCH} />
          </Section>

          <Section id="image" title="POST /api/brain/suggestive-image">
            <CodeBlock code={`// Image generation
fetch('https://your-domain.com/api/brain/suggestive-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appId, appSecret,
    prompt:   'A serene mountain lake at dawn',
    style:    'photorealistic',  // Optional
    size:     '1024x1024',       // Optional
    provider: 'openai',          // Optional
  }),
})
// Response: { imageUrl: 'https://…', provider: 'openai', … }`} />
          </Section>

          <Section id="task-types" title="Task Types">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              {[
                'chat','code','reasoning','image','image_editing','video',
                'video_planning','tts','stt','vision','embeddings','reranking',
                'research','research_search','deep_research','suggestive',
                'app_builder','summarise','translate','classify',
              ].map(t => (
                <div key={t} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-400">{t}</div>
              ))}
            </div>
          </Section>

          <Section id="errors" title="Error Handling">
            <p className="text-sm text-zinc-400">All error responses follow the same shape:</p>
            <CodeBlock code={`{
  "success": false,
  "executed": false,
  "traceId": "abc-123",
  "taskType": "chat",
  "output": null,
  "error": "Human-readable error message",
  "safetyFlags": [],           // Non-empty if content was blocked
  "warnings": [],
  "latencyMs": 12
}`} />
            <table className="w-full text-sm border-collapse mt-4">
              <thead>
                <tr className="text-left border-b border-zinc-800">
                  <th className="py-2 pr-4 text-zinc-400 font-medium">HTTP Status</th>
                  <th className="py-2 text-zinc-400 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-sm">
                {[
                  ['400', 'Invalid request body / validation error'],
                  ['401', 'Invalid appId or appSecret'],
                  ['402', 'Token budget exhausted for this app'],
                  ['403', 'Content blocked by safety filter'],
                  ['429', 'Rate limit exceeded'],
                  ['503', 'No AI provider configured / all providers down'],
                ].map(([status, desc]) => (
                  <tr key={status}>
                    <td className="py-2 pr-4 font-mono text-xs text-amber-400">{status}</td>
                    <td className="py-2 text-zinc-400 text-xs">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="limits" title="Rate Limits">
            <p className="text-sm text-zinc-400">
              Default rate limits (configurable per-app in admin dashboard):
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-1 mt-2">
              <li>100 requests / minute per app</li>
              <li>10 000 requests / day per app</li>
              <li>Token budgets configurable in Admin → Apps → Budget</li>
              <li>Responses include <code className="text-zinc-300">X-RateLimit-Remaining</code> header</li>
            </ul>
          </Section>

          <div className="border-t border-zinc-800 pt-8 text-xs text-zinc-600">
            Amarktai Network · Brain Gateway API Reference · v2 · <a href="mailto:support@amarktai.com" className="hover:text-zinc-400">support@amarktai.com</a>
          </div>
        </main>
      </div>
    </div>
  )
}
