import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const vpsSchema = z.object({
  cpuPercent: z.number().min(0).max(100),
  ramPercent: z.number().min(0).max(100),
  ramUsedMb: z.number().min(0),
  ramTotalMb: z.number().min(0),
  diskPercent: z.number().min(0).max(100),
  diskUsedGb: z.number().min(0),
  diskTotalGb: z.number().min(0),
  netInKbps: z.number().min(0).optional().default(0),
  netOutKbps: z.number().min(0).optional().default(0),
})

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-integration-token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const integration = await prisma.appIntegration.findUnique({ where: { integrationToken: token } })
    if (!integration || !integration.vpsEnabled) {
      return NextResponse.json({ error: 'Invalid token or VPS monitoring disabled' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = vpsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const snap = await prisma.vpsResourceSnapshot.create({
      data: { productId: integration.productId, ...parsed.data },
    })

    await prisma.appIntegration.update({
      where: { id: integration.id },
      data: { lastHeartbeatAt: new Date(), healthStatus: 'healthy' },
    })

    return NextResponse.json({ status: 'ok', id: snap.id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
