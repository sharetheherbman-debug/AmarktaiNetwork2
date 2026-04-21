'use client'

/**
 * WorkflowBuilderTab — Workflow skill templates & execution inside Build Studio.
 *
 * API contracts used:
 *   GET  /api/admin/skill-templates?launchReady   → { templates: SkillTemplate[] }
 *   GET  /api/workflows?appSlug=workspace         → { workflows: WorkflowRecord[] }
 *   POST /api/workflows { action:'create', ... }  → { workflow: { id } }
 *   POST /api/workflows { action:'execute', workflowId, input } → { run }
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Play, Loader2, CheckCircle, AlertCircle, Clock,
  ArrowRight, RefreshCw, Tag, Plus, X, ChevronDown, ChevronUp,
} from 'lucide-react'

// Shape returned by GET /api/admin/skill-templates
interface SkillTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  requiredCapabilities: string[]
  requiresExternalService: boolean
  launchReady: boolean
  steps: Array<{ id: string; name: string; type: string }>
  entryStepId: string
  exampleInput: Record<string, unknown>
}

// Shape returned by GET /api/workflows?appSlug=workspace
interface WorkflowRecord {
  id: string
  name: string
  description: string
  status: string
  createdAt: string
  updatedAt: string
}

export default function WorkflowBuilderTab() {
  const [templates, setTemplates] = useState<SkillTemplate[]>([])
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Per-template running state: templateId → 'creating' | 'executing' | null
  const [running, setRunning] = useState<Record<string, string | null>>({})
  const [runSuccess, setRunSuccess] = useState<string | null>(null)

  // Custom workflow creator
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [customSteps, setCustomSteps] = useState<Array<{ name: string; type: string }>>([
    { name: 'Input', type: 'input' },
    { name: 'AI Process', type: 'llm' },
    { name: 'Output', type: 'output' },
  ])
  const [customRunning, setCustomRunning] = useState(false)
  const [customSuccess, setCustomSuccess] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [tRes, wRes] = await Promise.all([
        // Real skill-templates endpoint (launchReady only for workspace)
        fetch('/api/admin/skill-templates?launchReady'),
        // Real workflows listing for workspace
        fetch('/api/workflows?appSlug=workspace'),
      ])
      if (tRes.ok) {
        const d = await tRes.json()
        setTemplates(d.templates ?? [])
      } else {
        // Non-fatal: templates may be empty on first run
        setTemplates([])
      }
      if (wRes.ok) {
        const d = await wRes.json()
        setWorkflows(d.workflows ?? [])
      } else {
        setWorkflows([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const runTemplate = useCallback(async (template: SkillTemplate) => {
    setRunning(prev => ({ ...prev, [template.id]: 'creating' }))
    setError(null)
    setRunSuccess(null)

    try {
      // Step 1: Create a workflow instance from the template
      const createRes = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: template.name,
          description: template.description,
          appSlug: 'workspace',
          steps: template.steps,
          entryStepId: template.entryStepId,
        }),
      })
      if (!createRes.ok) {
        const d = await createRes.json().catch(() => ({})) as { error?: string }
        throw new Error(d.error ?? `Workflow creation failed (HTTP ${createRes.status})`)
      }
      const createData = await createRes.json() as { workflow?: { id: string } }
      const workflowId = createData.workflow?.id
      if (!workflowId) throw new Error('Workflow created but no ID returned')

      // Step 2: Execute the workflow with the template's example input
      setRunning(prev => ({ ...prev, [template.id]: 'executing' }))
      const execRes = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          workflowId,
          input: template.exampleInput,
        }),
      })
      if (!execRes.ok) {
        const d = await execRes.json().catch(() => ({})) as { error?: string }
        throw new Error(d.error ?? `Workflow execution failed (HTTP ${execRes.status})`)
      }

      setRunSuccess(template.id)
      // Reload workflow list to show the new entry
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Workflow run failed')
    } finally {
      setRunning(prev => ({ ...prev, [template.id]: null }))
    }
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading workflow templates…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-400">
        Select a launch-ready workflow template. Each run creates and executes a new workflow instance in the workspace.
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400 font-medium">
            Launch-Ready Templates
            {templates.length > 0 && <span className="ml-2 text-slate-600">({templates.length})</span>}
          </div>
          <button onClick={load} className="text-xs text-slate-500 hover:text-white transition">
            <RefreshCw className="w-3 h-3 inline mr-1" />Refresh
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="text-xs text-slate-500 bg-white/[0.02] border border-white/[0.06] rounded-lg p-6 text-center">
            No launch-ready templates found. Templates require at least one configured AI provider.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map(t => {
              const runState = running[t.id]
              const isRunning = !!runState
              const succeeded = runSuccess === t.id
              return (
                <div key={t.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-white truncate">{t.name}</div>
                    <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 capitalize">{t.category}</span>
                  </div>
                  <p className="text-xs text-slate-400">{t.description}</p>

                  {/* Step pipeline */}
                  <div className="flex items-center flex-wrap gap-1 text-[10px] text-slate-500">
                    {t.steps.map((s, i) => (
                      <span key={s.id} className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04]">{s.name}</span>
                        {i < t.steps.length - 1 && <ArrowRight className="w-3 h-3 shrink-0" />}
                      </span>
                    ))}
                  </div>

                  {/* Required capabilities */}
                  {t.requiredCapabilities.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="w-3 h-3 text-slate-600 shrink-0" />
                      {t.requiredCapabilities.map(c => (
                        <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{c}</span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => runTemplate(t)}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-40 transition-colors"
                  >
                    {isRunning
                      ? <><Loader2 className="w-3 h-3 animate-spin" />{runState === 'creating' ? 'Creating…' : 'Executing…'}</>
                      : succeeded
                        ? <><CheckCircle className="w-3 h-3 text-emerald-300" />Ran — run again</>
                        : <><Play className="w-3 h-3" />Run</>
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Workspace Workflows (recent workflow instances) */}
      {workflows.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-medium">Workspace Workflow Instances ({workflows.length})</div>
          {workflows.slice(0, 10).map(w => (
            <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs">
              <span className="text-slate-300 truncate mr-2">{w.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                {w.status === 'completed'
                  ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                  : w.status === 'failed'
                    ? <AlertCircle className="w-3 h-3 text-red-400" />
                    : <Clock className="w-3 h-3 text-amber-400" />
                }
                <span className="text-slate-500 capitalize">{w.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Workflow Creator */}
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <button
          onClick={() => setCustomOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] text-xs text-slate-300 transition-colors"
        >
          <span className="flex items-center gap-2 font-medium">
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            Create Custom Workflow
          </span>
          {customOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        {customOpen && (
          <div className="p-4 space-y-4 bg-white/[0.01]">
            <p className="text-[11px] text-slate-500">Define a workflow with named steps. The workflow is created and executed immediately against the workspace app.</p>

            {customError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20 text-red-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {customError}
              </div>
            )}
            {customSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-xs">
                <CheckCircle className="w-3.5 h-3.5" /> Workflow created and executed — see Instances above.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Workflow Name *</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. Blog Post Pipeline"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={e => setCustomDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40"
                />
              </div>
            </div>

            {/* Steps editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Steps</label>
                <button
                  onClick={() => setCustomSteps(s => [...s, { name: `Step ${s.length + 1}`, type: 'llm' }])}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Step
                </button>
              </div>
              <div className="space-y-1.5">
                {customSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.04] text-[9px] text-slate-500 shrink-0">{idx + 1}</div>
                    <input
                      type="text"
                      value={step.name}
                      onChange={e => setCustomSteps(s => s.map((st, i) => i === idx ? { ...st, name: e.target.value } : st))}
                      className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40"
                      placeholder="Step name"
                    />
                    <select
                      value={step.type}
                      onChange={e => setCustomSteps(s => s.map((st, i) => i === idx ? { ...st, type: e.target.value } : st))}
                      className="bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="input">input</option>
                      <option value="llm">llm</option>
                      <option value="transform">transform</option>
                      <option value="output">output</option>
                      <option value="condition">condition</option>
                    </select>
                    {customSteps.length > 1 && (
                      <button
                        onClick={() => setCustomSteps(s => s.filter((_, i) => i !== idx))}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {customSteps.length > 1 && (
                <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-600 mt-1">
                  {customSteps.map((s, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.03]">{s.name}</span>
                      {i < customSteps.length - 1 && <ArrowRight className="w-3 h-3 shrink-0" />}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Input message */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider">Test Input (message)</label>
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="e.g. Write an introduction about AI"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40"
              />
            </div>

            <button
              disabled={!customName.trim() || customRunning}
              onClick={async () => {
                if (!customName.trim()) return
                setCustomRunning(true); setCustomError(null); setCustomSuccess(false)
                try {
                  const stepsWithIds = customSteps.map((s, i) => ({ id: `step_${i}`, name: s.name, type: s.type }))
                  const createRes = await fetch('/api/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'create',
                      name: customName.trim(),
                      description: customDesc.trim() || undefined,
                      appSlug: 'workspace',
                      steps: stepsWithIds,
                      entryStepId: stepsWithIds[0]?.id ?? 'step_0',
                    }),
                  })
                  if (!createRes.ok) {
                    const d = await createRes.json().catch(() => ({})) as { error?: string }
                    throw new Error(d.error ?? `Create failed (HTTP ${createRes.status})`)
                  }
                  const createData = await createRes.json() as { workflow?: { id: string } }
                  const workflowId = createData.workflow?.id
                  if (!workflowId) throw new Error('Workflow created but no ID returned')
                  const execRes = await fetch('/api/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'execute', workflowId, input: { message: customInput.trim() || 'test' } }),
                  })
                  if (!execRes.ok) {
                    const d = await execRes.json().catch(() => ({})) as { error?: string }
                    throw new Error(d.error ?? `Execute failed (HTTP ${execRes.status})`)
                  }
                  setCustomSuccess(true)
                  setCustomName(''); setCustomDesc(''); setCustomInput('')
                  setCustomSteps([{ name: 'Input', type: 'input' }, { name: 'AI Process', type: 'llm' }, { name: 'Output', type: 'output' }])
                  load()
                } catch (e) {
                  setCustomError(e instanceof Error ? e.message : 'Workflow failed')
                } finally {
                  setCustomRunning(false)
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-40 transition-colors"
            >
              {customRunning ? <><Loader2 className="w-3 h-3 animate-spin" />Creating & Running…</> : <><Play className="w-3 h-3" />Create & Run</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
