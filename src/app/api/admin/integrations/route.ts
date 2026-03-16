import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const integrationSchema = z.object({
  productId: z.number().int(),
  heartbeatEnabled: z.boolean().default(true),
  metricsEnabled: z.boolean().default(true),
  eventsEnabled: z.boolean().default(true),
})

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const integrations = await prisma.appIntegration.findMany({
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { id: true, name: true, slug: true } } },
  })
  return NextResponse.json(integrations)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = integrationSchema.parse(body)
    const token = randomBytes(32).toString('hex')

    const integration = await prisma.appIntegration.create({
      data: {
        productId: data.productId,
        integrationToken: token,
        heartbeatEnabled: data.heartbeatEnabled,
        metricsEnabled: data.metricsEnabled,
        eventsEnabled: data.eventsEnabled,
      },
      include: { product: { select: { id: true, name: true, slug: true } } },
    })
    return NextResponse.json(integration, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Create integration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
