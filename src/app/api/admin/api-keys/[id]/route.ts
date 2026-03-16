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
  const key = await prisma.apiKey.update({
    where: { id: parseInt(params.id) },
    data: { isActive: body.isActive },
  })
  return NextResponse.json({ ...key, apiKey: undefined })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.apiKey.delete({ where: { id: parseInt(params.id) } })
  return NextResponse.json({ success: true })
}
