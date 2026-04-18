/**
 * GET /api/admin/sdk/download
 *
 * Returns the compiled AmarktAI Network TypeScript SDK as a downloadable
 * JavaScript file (UMD + ESM compatible). Developers can either copy the
 * source directly from this endpoint or import it into their projects.
 *
 * Query params:
 *   format  — 'ts' (TypeScript source, default) | 'js' (compiled JS)
 *   appSlug — optional app slug to pre-fill credentials comment
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const format = request.nextUrl.searchParams.get('format') ?? 'ts'
  const appSlug = request.nextUrl.searchParams.get('appSlug') ?? 'YOUR_APP_SLUG'
  const baseUrl = request.nextUrl.origin

  if (format === 'ts') {
    // Return the TypeScript source with usage comment prepended
    const sdkPath = join(process.cwd(), 'src', 'lib', 'sdk', 'amarktai-client.ts')
    let source: string
    try {
      source = await readFile(sdkPath, 'utf-8')
    } catch {
      return NextResponse.json({ error: 'SDK source file not found.' }, { status: 500 })
    }

    // Prepend a usage header so developers know how to configure it
    const usageHeader = `/**
 * AmarktAI Network SDK — Downloaded from ${baseUrl}/api/admin/sdk/download
 *
 * Quick start:
 *   import { AmarktAIClient } from './amarktai-client'
 *
 *   const ai = new AmarktAIClient({
 *     baseUrl: '${baseUrl}',
 *     appId: '${appSlug}',
 *     appSecret: 'YOUR_APP_SECRET', // from Admin → Apps → ${appSlug}
 *   })
 *
 *   const res = await ai.execute({ taskType: 'chat', message: 'Hello!' })
 *   console.log(res.output)
 *
 *   // Streaming
 *   for await (const chunk of ai.stream({ message: 'Tell me a story' })) {
 *     process.stdout.write(chunk)
 *   }
 *
 *   // App-to-app relay
 *   const relayed = await ai.relay({
 *     toAppSlug: 'target-app-slug',
 *     taskType: 'chat',
 *     message: 'What is your current status?',
 *   })
 */\n\n`

    const fileContent = usageHeader + source

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="amarktai-client.ts"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // JS format: return a pre-built UMD + ESM compatible bundle wrapper
  // The compiled bundle wraps the TypeScript source with CJS/ESM exports.
  const jsBundle = buildJsBundle(baseUrl, appSlug)

  return new NextResponse(jsBundle, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Content-Disposition': `attachment; filename="amarktai-client.js"`,
      'Cache-Control': 'no-store',
    },
  })
}

function buildJsBundle(baseUrl: string, appSlug: string): string {
  return `/**
 * AmarktAI Network SDK — JavaScript Bundle
 * Downloaded from ${baseUrl}/api/admin/sdk/download?format=js
 *
 * Usage (ESM):
 *   import { AmarktAIClient } from './amarktai-client.js'
 *   const ai = new AmarktAIClient({ baseUrl: '${baseUrl}', appId: '${appSlug}', appSecret: 'YOUR_APP_SECRET' })
 *
 * Usage (CJS):
 *   const { AmarktAIClient } = require('./amarktai-client.js')
 */

'use strict';

class AmarktAIClient {
  constructor(config) {
    if (!config?.baseUrl) throw new Error('AmarktAIClient: baseUrl is required')
    if (!config?.appId) throw new Error('AmarktAIClient: appId is required')
    if (!config?.appSecret) throw new Error('AmarktAIClient: appSecret is required')
    this.baseUrl = config.baseUrl.replace(/\\/$/, '')
    this.appId = config.appId
    this.appSecret = config.appSecret
    this.timeout = config.timeout ?? 30000
    this.maxRetries = config.maxRetries ?? 2
  }

  async execute(req) {
    const body = {
      appId: this.appId,
      appSecret: this.appSecret,
      taskType: req.taskType ?? 'chat',
      message: req.message,
      ...(req.provider ? { metadata: { provider_override: req.provider } } : {}),
      ...(req.model ? { metadata: { ...(req.metadata ?? {}), model_override: req.model } } : {}),
      ...(req.traceId ? { traceId: req.traceId } : {}),
    }
    const res = await this._fetch('/api/brain/request', body)
    if (!res.ok) throw new Error(\`AmarktAI request failed: \${res.status}\`)
    return res.json()
  }

  async *stream(req) {
    const body = {
      appId: this.appId,
      appSecret: this.appSecret,
      taskType: req.taskType ?? 'chat',
      message: req.message,
      ...(req.systemPrompt ? { systemPrompt: req.systemPrompt } : {}),
      ...(req.provider ? { provider: req.provider } : {}),
      ...(req.model ? { model: req.model } : {}),
    }
    const res = await fetch(\`\${this.baseUrl}/api/brain/stream\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    })
    if (!res.ok || !res.body) throw new Error(\`AmarktAI stream failed: \${res.status}\`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === 'chunk' && event.content) yield event.content
          if (event.type === 'done') return
        } catch { /* skip malformed */ }
      }
    }
  }

  async relay(req) {
    const body = {
      fromAppId: this.appId,
      fromAppSecret: this.appSecret,
      toAppSlug: req.toAppSlug,
      taskType: req.taskType ?? 'chat',
      message: req.message,
      ...(req.traceId ? { traceId: req.traceId } : {}),
    }
    const res = await this._fetch('/api/brain/relay', body)
    if (!res.ok) throw new Error(\`AmarktAI relay failed: \${res.status}\`)
    return res.json()
  }

  async heartbeat() {
    const res = await fetch(\`\${this.baseUrl}/api/integrations/heartbeat\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: this.appId, appSecret: this.appSecret }),
      signal: AbortSignal.timeout(10000),
    })
    return { ok: res.ok, status: res.status, timestamp: new Date().toISOString() }
  }

  async _fetch(path, body) {
    return fetch(\`\${this.baseUrl}\${path}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    })
  }
}

// ESM export
export { AmarktAIClient }
export default AmarktAIClient

// CJS export (for Node.js require())
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AmarktAIClient }
  module.exports.default = AmarktAIClient
}
`
}
