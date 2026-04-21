'use client'

/**
 * App Connection Onboarding Wizard
 *
 * Deterministic step-by-step wizard that collects app details and generates
 * copy-paste usable integration output:
 *   - appId + appSecret
 *   - subdomain / NGINX config
 *   - env vars
 *   - SDK install + connect snippet
 *   - verification checklist
 *
 * LLM is NOT used to invent technical content — templates are deterministic.
 * Phase 5 of the Voice + Assistant + Onboarding Completion Pass.
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check, Copy, Loader2,
  Rocket, Globe, Cpu, Layers, Terminal, ClipboardList,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

const TECH_STACKS = [
  'Next.js', 'React', 'Vue', 'Nuxt', 'SvelteKit', 'Astro',
  'Node.js / Express', 'FastAPI', 'Django', 'Laravel',
  'Ruby on Rails', 'Spring Boot', 'Other',
] as const

const CAPABILITIES = [
  'chat', 'code', 'image_generation', 'voice', 'retrieval',
  'agents', 'reasoning', 'embeddings', 'structured_output', 'multilingual',
] as const

type TechStack = (typeof TECH_STACKS)[number]
type Capability = (typeof CAPABILITIES)[number]

interface WizardData {
  appName: string
  appUrl: string
  techStack: TechStack | ''
  subdomain: string
  capabilities: Capability[]
}

interface GeneratedOutput {
  appId: string
  appSecret: string
  brainEndpoint: string
  subdomainNginx: string
  envVars: string
  sdkSnippet: string
  checklist: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(v: string): string {
  return v.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * Generate a preview secret for display only.
 * This is NOT cryptographically secure — it uses Math.random() and is
 * intended as a placeholder only. The actual app secret is generated
 * server-side when the app is persisted and should be obtained from
 * Admin → Apps → [app] → Agents tab.
 */
function generatePreviewSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 48; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function buildOutput(data: WizardData): GeneratedOutput {
  const appId = slugify(data.appName) || 'my-app'
  const appSecret = generatePreviewSecret()
  const domain = data.subdomain
    ? `${data.subdomain}.yourdomain.com`
    : `${appId}.yourdomain.com`
  const brainEndpoint = 'https://network.amarktai.com/api/brain/request'

  const subdomainNginx = `# NGINX config for ${domain}
server {
    listen 80;
    server_name ${domain};

    # Redirect HTTP → HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain};

    ssl_certificate     /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`

  const envVars = [
    `# Amarktai Network — ${data.appName}`,
    `AMARKTAI_APP_ID="${appId}"`,
    `AMARKTAI_APP_SECRET="${appSecret}"`,
    `AMARKTAI_BRAIN_ENDPOINT="${brainEndpoint}"`,
    '',
    '# Optional: restrict to specific capabilities',
    `AMARKTAI_CAPABILITIES="${data.capabilities.join(',')}"`,
  ].join('\n')

  const sdkSnippet = buildSdkSnippet(data.techStack, appId, appSecret, brainEndpoint)

  const checklist = [
    `☐ Copy .env vars above into your ${data.appName} project`,
    `☐ Install the SDK (see snippet below)`,
    `☐ Make a test /brain/request call and verify you get a 200 response`,
    `☐ Configure your subdomain DNS: ${domain} → your VPS/server IP`,
    `☐ Run: certbot --nginx -d ${domain}`,
    `☐ Reload NGINX: nginx -s reload`,
    `☐ Visit Admin → Apps → ${data.appName} → Agents tab to assign AI agents`,
    `☐ Check Admin → Apps → ${data.appName} → Metrics tab to confirm requests appear`,
    `☐ Enable monitoring in Admin → Apps → ${data.appName} → Overview`,
  ]

  return { appId, appSecret, brainEndpoint, subdomainNginx, envVars, sdkSnippet, checklist }
}

function buildSdkSnippet(stack: TechStack | '', appId: string, appSecret: string, endpoint: string): string {
  const isNode = !stack || stack.includes('Node') || stack.includes('Next') || stack.includes('React') || stack.includes('Vue') || stack.includes('Nuxt') || stack.includes('Svelte') || stack.includes('Astro')
  const isPython = stack === 'FastAPI' || stack === 'Django'

  if (isPython) {
    return `# Install
# pip install httpx

import httpx

AMARKTAI_APP_ID = "${appId}"
AMARKTAI_APP_SECRET = "${appSecret}"
AMARKTAI_ENDPOINT = "${endpoint}"

async def brain_request(message: str, task_type: str = "chat") -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            AMARKTAI_ENDPOINT,
            json={
                "appId": AMARKTAI_APP_ID,
                "appSecret": AMARKTAI_APP_SECRET,
                "taskType": task_type,
                "message": message,
            },
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json()

# Usage
import asyncio
result = asyncio.run(brain_request("Hello, what can you do?"))
print(result["output"])`
  }

  if (isNode) {
    return `// Install
// npm install @amarktai/sdk
// (or use fetch directly — no SDK required)

const AMARKTAI_APP_ID = "${appId}";
const AMARKTAI_APP_SECRET = "${appSecret}";
const AMARKTAI_ENDPOINT = "${endpoint}";

export async function brainRequest(message, taskType = "chat") {
  const res = await fetch(AMARKTAI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appId: AMARKTAI_APP_ID,
      appSecret: AMARKTAI_APP_SECRET,
      taskType,
      message,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? \`HTTP \${res.status}\`);
  }
  return res.json();
}

// Usage
const result = await brainRequest("Hello, what can you do?");
console.log(result.output);`
  }

  // Generic HTTP
  return `# HTTP request (any language)
# POST ${endpoint}
# Content-Type: application/json
#
# Body:
# {
#   "appId": "${appId}",
#   "appSecret": "${appSecret}",
#   "taskType": "chat",
#   "message": "Your message here"
# }
#
# Response: { "output": "...", "success": true, ... }`
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const glass = 'bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl'
const inputCls = 'w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all'
const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5 tracking-wide'

const STEPS = [
  { label: 'App Info',      icon: Globe,        color: 'violet' },
  { label: 'Stack',         icon: Cpu,          color: 'blue' },
  { label: 'Capabilities',  icon: Layers,       color: 'cyan' },
  { label: 'Subdomain',     icon: Terminal,     color: 'amber' },
  { label: 'Output',        icon: Rocket,       color: 'emerald' },
]

/** Explicit active step styles per step index — avoids dynamic Tailwind class generation */
const STEP_ACTIVE_CLS = [
  'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
] as const
  enter:  { opacity: 0, x: 40,  filter: 'blur(4px)' },
  center: { opacity: 1, x: 0,   filter: 'blur(0px)' },
  exit:   { opacity: 0, x: -40, filter: 'blur(4px)' },
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingWizardPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>({
    appName: '',
    appUrl: '',
    techStack: '',
    subdomain: '',
    capabilities: ['chat'],
  })
  const [output, setOutput] = useState<GeneratedOutput | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }, [])

  const canNext = useCallback((): boolean => {
    if (step === 0) return data.appName.trim().length > 0
    if (step === 1) return !!data.techStack
    if (step === 2) return data.capabilities.length > 0
    if (step === 3) return true
    return false
  }, [step, data])

  const next = useCallback(async () => {
    if (step < STEPS.length - 2) {
      setStep((s: number) => s + 1)
      return
    }
    // Final step: generate output and optionally create app in DB
    setCreating(true)
    setCreateError(null)
    try {
      const built = buildOutput(data)
      // Try to persist the app via the admin API
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.appName,
          slug: built.appId,
          category: 'generic',
          status: 'in_development',
          primaryUrl: data.appUrl || '',
          aiEnabled: true,
          connectedToBrain: false,
          monitoringEnabled: false,
          integrationEnabled: true,
          appSecret: built.appSecret,
          onboardingStatus: 'pending',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        // Non-fatal: show output anyway even if DB persist failed
        console.warn('App persist failed:', err.error)
      }
      setOutput(built)
      setStep(STEPS.length - 1)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create app')
    } finally {
      setCreating(false)
    }
  }, [step, data])

  const back = useCallback(() => {
    if (step > 0) setStep((s: number) => s - 1)
  }, [step])

  const toggleCapability = (cap: Capability) => {
    setData((d: WizardData) => ({
      ...d,
      capabilities: d.capabilities.includes(cap)
        ? d.capabilities.filter((c: Capability) => c !== cap)
        : [...d.capabilities, cap],
    }))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Rocket className="w-5 h-5 text-violet-400" />
          Connect Your App
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Step-by-step wizard that generates real, copy-paste integration output.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = i < step
          const active = i === step
          return (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                active ? (STEP_ACTIVE_CLS[i] ?? STEP_ACTIVE_CLS[0])
                : done ? 'bg-white/[0.04] text-emerald-400 border border-emerald-500/20'
                : 'bg-white/[0.02] text-slate-600 border border-white/[0.04]'
              }`}>
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <span className="text-slate-700 text-xs">›</span>}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className={`${glass} p-6 min-h-64`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            {/* Step 0: App Info */}
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-white">Tell us about your app</h2>
                <div>
                  <label className={labelCls}>App Name *</label>
                  <input
                    className={inputCls}
                    placeholder="My Awesome App"
                    value={data.appName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData((d: WizardData) => ({ ...d, appName: e.target.value, subdomain: d.subdomain || slugify(e.target.value) }))}
                    autoFocus
                  />
                  {data.appName && (
                    <p className="text-[11px] text-slate-500 mt-1">App ID will be: <span className="font-mono text-violet-400">{slugify(data.appName) || '…'}</span></p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>App URL or Repo (optional)</label>
                  <input
                    className={inputCls}
                    placeholder="https://myapp.com or https://github.com/…"
                    value={data.appUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData((d: WizardData) => ({ ...d, appUrl: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 1: Tech Stack */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-white">What is your tech stack?</h2>
                <p className="text-xs text-slate-500">Used to generate the correct integration snippet.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TECH_STACKS.map((s: TechStack) => (
                    <button
                      key={s}
                      onClick={() => setData((d: WizardData) => ({ ...d, techStack: s }))}
                      className={`px-3 py-2 rounded-xl border text-xs text-left transition-all ${
                        data.techStack === s
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                          : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/[0.15] hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Capabilities */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-white">Required capabilities</h2>
                <p className="text-xs text-slate-500">Select what your app needs from the Amarktai Brain.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CAPABILITIES.map(cap => {
                    const on = data.capabilities.includes(cap)
                    return (
                      <button
                        key={cap}
                        onClick={() => toggleCapability(cap)}
                        className={`px-3 py-2 rounded-xl border text-xs text-left flex items-center gap-2 transition-all ${
                          on
                            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                            : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/[0.15] hover:text-white'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-cyan-500 border-cyan-500' : 'border-white/20'}`}>
                          {on && <Check className="w-2 h-2 text-white" />}
                        </span>
                        {cap.replace(/_/g, ' ')}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Subdomain */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-white">Subdomain & deployment</h2>
                <p className="text-xs text-slate-500">
                  Optional: enter the subdomain you will use for this app.
                  Leave blank to skip NGINX output.
                </p>
                <div>
                  <label className={labelCls}>Subdomain (optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      className={inputCls}
                      placeholder={slugify(data.appName) || 'myapp'}
                      value={data.subdomain}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData((d: WizardData) => ({ ...d, subdomain: slugify(e.target.value) }))}
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">.yourdomain.com</span>
                  </div>
                  {data.subdomain && (
                    <p className="text-[11px] text-slate-500 mt-1">Your subdomain: <span className="font-mono text-amber-400">{data.subdomain}.yourdomain.com</span></p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Output */}
            {step === STEPS.length - 1 && output && (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-emerald-400" />
                  Your integration is ready
                </h2>

                {/* Credentials */}
                <OutputBlock
                  title="App Credentials"
                  icon={Layers}
                  id="creds"
                  copiedKey={copiedKey}
                  onCopy={copy}
                  content={`App ID:     ${output.appId}\nApp Secret: ${output.appSecret}\nBrain API:  ${output.brainEndpoint}`}
                />

                {/* Env vars */}
                <OutputBlock
                  title=".env Variables"
                  icon={Terminal}
                  id="env"
                  copiedKey={copiedKey}
                  onCopy={copy}
                  content={output.envVars}
                  mono
                />

                {/* SDK snippet */}
                <OutputBlock
                  title={`Integration Snippet (${data.techStack || 'HTTP'})`}
                  icon={Cpu}
                  id="sdk"
                  copiedKey={copiedKey}
                  onCopy={copy}
                  content={output.sdkSnippet}
                  mono
                />

                {/* NGINX */}
                {data.subdomain && (
                  <OutputBlock
                    title="NGINX Config"
                    icon={Globe}
                    id="nginx"
                    copiedKey={copiedKey}
                    onCopy={copy}
                    content={output.subdomainNginx}
                    mono
                  />
                )}

                {/* Checklist */}
                <div className={`${glass} p-4 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5 text-violet-400" />
                      Verification Checklist
                    </h3>
                  </div>
                  <ul className="space-y-1.5">
                    {output.checklist.map((item: string, i: number) => (
                      <li key={i} className="text-xs text-slate-400 font-mono leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>

                <p className="text-[11px] text-slate-600">
                  ⚠ The app secret shown above is a client-side preview. Your actual secret is stored securely in the dashboard — go to Apps → {output.appId} → Agents tab to view or rotate it.
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Error */}
      {createError && (
        <p className="text-xs text-red-400">{createError}</p>
      )}

      {/* Nav buttons */}
      {step < STEPS.length - 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={next}
            disabled={!canNext() || creating}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-sm text-white font-medium disabled:opacity-40 transition-all"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {step === STEPS.length - 2 ? 'Generate Output' : 'Next'}
            {!creating && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  )
}

// ── OutputBlock component ─────────────────────────────────────────────────────

function OutputBlock({
  title, icon: Icon, id, content, mono = false, copiedKey, onCopy,
}: {
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  id: string
  content: string
  mono?: boolean
  copiedKey: string | null
  onCopy: (text: string, key: string) => void
}) {
  return (
    <div className="bg-black/30 border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          {title}
        </h3>
        <button
          onClick={() => onCopy(content, id)}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white transition-colors"
        >
          {copiedKey === id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copiedKey === id ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className={`p-4 text-xs overflow-x-auto leading-relaxed ${mono ? 'font-mono text-slate-300' : 'text-slate-300'} whitespace-pre-wrap break-words`}>
        {content}
      </pre>
    </div>
  )
}
