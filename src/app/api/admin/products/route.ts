import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  category: z.string().default('app'),
  shortDescription: z.string().max(500),
  longDescription: z.string().optional().default(''),
  status: z.enum(['live', 'invite_only', 'in_development', 'coming_soon', 'concept']).default('coming_soon'),
  accessType: z.enum(['public', 'invite', 'private']).default('public'),
  featured: z.boolean().default(false),
  primaryUrl: z.string().optional().default(''),
  hostedHere: z.boolean().default(false),
  sortOrder: z.number().int().default(99),
})

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { integration: true },
  })
  return NextResponse.json(products)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = productSchema.parse(body)
    const product = await prisma.product.create({ data })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
