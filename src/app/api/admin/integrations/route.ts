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
  vpsEnabled: z.boolean().default(false),
  environment: z.string().default('production'),
})

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const integrations = await prisma.appIntegration.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, status: true,
          hostedHere: true, hostingScope: true, subdomain: true,
          customDomain: true, primaryUrl: true, monitoringEnabled: true,
        },
      },
    },
  })

  // Mask tokens — show prefix (10 chars) + "..." + last 4
  const masked = integrations.map(i => ({
    ...i,
    integrationToken: `${i.integrationToken.slice(0, 10)}...${i.integrationToken.slice(-4)}`,
  }))

  return NextResponse.json(masked)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = integrationSchema.parse(body)

    const product = await prisma.product.findUnique({ where: { id: data.productId } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const existing = await prisma.appIntegration.findUnique({ where: { productId: data.productId } })
    if (existing) return NextResponse.json({ error: 'Integration already exists for this product' }, { status: 409 })

    const token = `amkt_${randomBytes(32).toString('hex')}`
    const integration = await prisma.appIntegration.create({
      data: {
        productId: data.productId,
        integrationToken: token,
        heartbeatEnabled: data.heartbeatEnabled,
        metricsEnabled: data.metricsEnabled,
        eventsEnabled: data.eventsEnabled,
        vpsEnabled: data.vpsEnabled,
        environment: data.environment,
      },
      include: { product: { select: { name: true, slug: true } } },
    })

    // Return FULL token only on creation
    return NextResponse.json(integration, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
