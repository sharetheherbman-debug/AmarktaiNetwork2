import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-integration-token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const integration = await prisma.appIntegration.findUnique({
      where: { integrationToken: token },
    })
    if (!integration || !integration.heartbeatEnabled) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    await prisma.appIntegration.update({
      where: { id: integration.id },
      data: {
        lastHeartbeatAt: new Date(),
        healthStatus: 'healthy',
      },
    })

    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
