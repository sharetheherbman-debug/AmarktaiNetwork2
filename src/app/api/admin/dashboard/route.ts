import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    totalProducts,
    totalContacts,
    totalWaitlist,
    totalIntegrations,
    recentContacts,
    recentEvents,
    productStats,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.contactSubmission.count(),
    prisma.waitlistEntry.count(),
    prisma.appIntegration.count(),
    prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true, companyOrProject: true },
    }),
    prisma.appEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: { product: { select: { name: true } } },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        integration: {
          select: { healthStatus: true, lastHeartbeatAt: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  return NextResponse.json({
    metrics: {
      totalProducts,
      totalContacts,
      totalWaitlist,
      totalIntegrations,
    },
    recentContacts,
    recentEvents,
    productStats,
  })
}
