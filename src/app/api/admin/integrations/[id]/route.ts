import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const integration = await prisma.appIntegration.update({
    where: { id: parseInt(params.id) },
    data: {
      heartbeatEnabled: body.heartbeatEnabled,
      metricsEnabled: body.metricsEnabled,
      eventsEnabled: body.eventsEnabled,
    },
    include: { product: { select: { id: true, name: true } } },
  })
  return NextResponse.json(integration)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.appIntegration.delete({ where: { id: parseInt(params.id) } })
  return NextResponse.json({ success: true })
}
