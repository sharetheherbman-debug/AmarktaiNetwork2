import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const metricSchema = z.object({
  metricKey: z.string().min(1).max(100),
  metricValue: z.number(),
  metricLabel: z.string().optional().default(''),
  timestamp: z.string().optional(),
})

const batchSchema = z.object({
  metrics: z.array(metricSchema).min(1).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-integration-token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const integration = await prisma.appIntegration.findUnique({
      where: { integrationToken: token },
    })
    if (!integration || !integration.metricsEnabled) {
      return NextResponse.json({ error: 'Invalid token or metrics disabled' }, { status: 401 })
    }

    const body = await request.json()
    const { metrics } = batchSchema.parse(body)

    await prisma.appMetricPoint.createMany({
      data: metrics.map((m) => ({
        productId: integration.productId,
        metricKey: m.metricKey,
        metricValue: m.metricValue,
        metricLabel: m.metricLabel,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      })),
    })

    return NextResponse.json({ success: true, count: metrics.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Metrics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
