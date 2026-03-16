import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const products = await prisma.product.findMany({
    where: { monitoringEnabled: true },
    select: {
      id: true, name: true, slug: true, status: true,
      hostingScope: true, hostedHere: true,
      integration: { select: { healthStatus: true, lastHeartbeatAt: true, uptime: true } },
      vpsSnapshots: { orderBy: { timestamp: 'desc' }, take: 1 },
    },
    orderBy: { sortOrder: 'asc' },
  })

  const timeSeries = await Promise.all(
    products.map(async (p) => {
      const snapshots = await prisma.vpsResourceSnapshot.findMany({
        where: { productId: p.id },
        orderBy: { timestamp: 'asc' },
        take: 48,
        select: {
          cpuPercent: true, ramPercent: true, diskPercent: true,
          netInKbps: true, netOutKbps: true, timestamp: true,
        },
      })
      return { productId: p.id, productName: p.name, snapshots }
    })
  )

  return NextResponse.json({ products, timeSeries })
}
