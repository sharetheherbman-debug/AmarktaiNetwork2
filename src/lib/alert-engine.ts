/**
 * Alert Engine — AmarktAI Network
 *
 * System-wide alerting for operator visibility.
 * Triggers on: provider failures, routing errors, queue backlogs,
 * cost spikes, repeated fallbacks, and app-agent failures.
 *
 * Alerts are stored in the database and shown in the dashboard.
 * Optional email delivery via existing SMTP when configured.
 *
 * Server-side only.
 */

import { prisma } from '@/lib/prisma'

// ── Alert types ─────────────────────────────────────────────────────────────

export type AlertType =
  | 'provider_failure'
  | 'routing_failure'
  | 'no_eligible_model'
  | 'queue_backlog'
  | 'job_failure'
  | 'cost_spike'
  | 'repeated_fallback'
  | 'agent_failure'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface CreateAlertInput {
  alertType: AlertType
  severity: AlertSeverity
  title: string
  message: string
  appSlug?: string
  metadata?: Record<string, unknown>
}

// ── Core functions ──────────────────────────────────────────────────────────

/**
 * Create a new system alert. Deduplicates by checking for an identical
 * unresolved alert within the last hour.
 */
export async function createAlert(input: CreateAlertInput): Promise<{ id: number; deduplicated: boolean }> {
  // Deduplicate: skip if identical unresolved alert exists within 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const existing = await prisma.systemAlert.findFirst({
    where: {
      alertType: input.alertType,
      severity: input.severity,
      appSlug: input.appSlug ?? null,
      resolved: false,
      createdAt: { gte: oneHourAgo },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    return { id: existing.id, deduplicated: true }
  }

  const alert = await prisma.systemAlert.create({
    data: {
      alertType: input.alertType,
      severity: input.severity,
      title: input.title,
      message: input.message,
      appSlug: input.appSlug ?? null,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  })

  // Best-effort email notification for critical alerts
  if (input.severity === 'critical') {
    sendAlertEmail(alert.title, alert.message).catch(() => {})
  }

  return { id: alert.id, deduplicated: false }
}

/**
 * Resolve an alert by ID.
 */
export async function resolveAlert(id: number): Promise<boolean> {
  try {
    await prisma.systemAlert.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

/**
 * List alerts with optional filters.
 */
export async function listAlerts(opts?: {
  resolved?: boolean
  severity?: AlertSeverity
  alertType?: AlertType
  limit?: number
}): Promise<Array<{
  id: number
  alertType: string
  severity: string
  title: string
  message: string
  appSlug: string | null
  metadata: string
  resolved: boolean
  resolvedAt: Date | null
  createdAt: Date
}>> {
  return prisma.systemAlert.findMany({
    where: {
      ...(opts?.resolved !== undefined ? { resolved: opts.resolved } : {}),
      ...(opts?.severity ? { severity: opts.severity } : {}),
      ...(opts?.alertType ? { alertType: opts.alertType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 100,
  })
}

/**
 * Get alert summary counts for the dashboard.
 */
export async function getAlertSummary(): Promise<{
  total: number
  unresolved: number
  critical: number
  warning: number
  info: number
}> {
  const [total, unresolved, critical, warning, info] = await Promise.all([
    prisma.systemAlert.count(),
    prisma.systemAlert.count({ where: { resolved: false } }),
    prisma.systemAlert.count({ where: { resolved: false, severity: 'critical' } }),
    prisma.systemAlert.count({ where: { resolved: false, severity: 'warning' } }),
    prisma.systemAlert.count({ where: { resolved: false, severity: 'info' } }),
  ])
  return { total, unresolved, critical, warning, info }
}

// ── Convenience alert triggers ──────────────────────────────────────────────

/**
 * Trigger an alert when a provider health check fails.
 */
export function alertProviderFailure(providerKey: string, error: string) {
  return createAlert({
    alertType: 'provider_failure',
    severity: 'critical',
    title: `Provider failure: ${providerKey}`,
    message: `Health check failed for ${providerKey}: ${error}`,
    metadata: { providerKey, error },
  })
}

/**
 * Trigger an alert when routing cannot find an eligible model.
 */
export function alertNoEligibleModel(capability: string, appSlug?: string) {
  return createAlert({
    alertType: 'no_eligible_model',
    severity: 'warning',
    title: `No eligible model for ${capability}`,
    message: `Routing could not find a model capable of "${capability}"${appSlug ? ` for app ${appSlug}` : ''}.`,
    appSlug,
    metadata: { capability },
  })
}

/**
 * Trigger an alert for job failure in the queue.
 */
export function alertJobFailure(jobType: string, jobId: string, error: string, appSlug?: string) {
  return createAlert({
    alertType: 'job_failure',
    severity: 'warning',
    title: `Job failed: ${jobType}`,
    message: `Job ${jobId} of type "${jobType}" failed: ${error}`,
    appSlug,
    metadata: { jobType, jobId, error },
  })
}

/**
 * Trigger alert on repeated fallback usage.
 */
export function alertRepeatedFallback(provider: string, count: number, appSlug?: string) {
  return createAlert({
    alertType: 'repeated_fallback',
    severity: 'warning',
    title: `Repeated fallback: ${provider}`,
    message: `Provider "${provider}" triggered ${count} fallbacks recently.`,
    appSlug,
    metadata: { provider, count },
  })
}

// ── Email delivery (best-effort) ────────────────────────────────────────────

async function sendAlertEmail(subject: string, body: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST
  const smtpFrom = process.env.SMTP_FROM
  const alertEmail = process.env.ALERT_EMAIL
  if (!smtpHost || !smtpFrom || !alertEmail) return

  // Use nodemailer if installed, otherwise skip silently
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer') as {
      createTransport: (opts: Record<string, unknown>) => {
        sendMail: (opts: Record<string, string>) => Promise<void>
      }
    }
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    })
    await transport.sendMail({
      from: smtpFrom,
      to: alertEmail,
      subject: `[AmarktAI Alert] ${subject}`,
      text: body,
    })
  } catch {
    // Email delivery is best-effort — nodemailer may not be installed
  }
}
