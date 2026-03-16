import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  companyOrProject: z.string().max(200).optional().default(''),
  message: z.string().min(10).max(2000),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = schema.parse(body)

    await prisma.contactSubmission.create({
      data: {
        name: data.name,
        email: data.email,
        companyOrProject: data.companyOrProject,
        message: data.message,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Contact submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
