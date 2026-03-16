import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  interest: z.string().max(100).optional().default(''),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = schema.parse(body)

    await prisma.waitlistEntry.create({
      data: {
        name: data.name,
        email: data.email,
        interest: data.interest,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Waitlist submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
