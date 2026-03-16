import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contacts = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(contacts)
}
