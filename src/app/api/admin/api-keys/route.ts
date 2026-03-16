import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const apiKeySchema = z.object({
  provider: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  apiKey: z.string().min(1),
  isActive: z.boolean().default(true),
})

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      provider: true,
      label: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      apiKey: false,
    },
  })
  return NextResponse.json(keys)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = apiKeySchema.parse(body)
    const key = await prisma.apiKey.create({ data })
    return NextResponse.json({ ...key, apiKey: undefined }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Create API key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
