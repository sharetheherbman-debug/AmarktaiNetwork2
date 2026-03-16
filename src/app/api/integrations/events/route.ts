import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const eventSchema = z.object({
  eventType: z.string().min(1).max(100),
  severity: z.enum(['info', 'warning', 'error', 'critical']).default('info'),
  title: z.string().min(1).max(200),
  message: z.string().optional().default(''),
  timestamp: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-integration-token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const integration = await prisma.appIntegration.findUnique({
      where: { integrationToken: token },
    })
    if (!integration || !integration.eventsEnabled) {
      return NextResponse.json({ error: 'Invalid token or events disabled' }, { status: 401 })
    }

    const body = await request.json()
    const data = eventSchema.parse(body)

    await prisma.appEvent.create({
      data: {
        productId: integration.productId,
        eventType: data.eventType,
        severity: data.severity,
        title: data.title,
        message: data.message,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
