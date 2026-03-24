import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Public apps registry endpoint.
 * Returns all publicly visible apps ordered by sortOrder.
 * No authentication required — this powers the public /apps page.
 */
export async function GET() {
  try {
    const apps = await prisma.product.findMany({
      where: { publicVisibility: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        shortDescription: true,
        longDescription: true,
        status: true,
        featured: true,
        primaryUrl: true,
        hostedHere: true,
        aiEnabled: true,
        monitoringEnabled: true,
        readyToDeploy: true,
        connectedToBrain: true,
        onboardingStatus: true,
        sortOrder: true,
      },
    })
    return NextResponse.json(apps)
  } catch (err) {
    console.error('[/api/apps] Failed to fetch registry:', err)
    return NextResponse.json({ error: 'Failed to load apps' }, { status: 500 })
  }
}
