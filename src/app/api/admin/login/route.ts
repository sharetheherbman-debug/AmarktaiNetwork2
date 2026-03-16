import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminCredentials } from '@/lib/auth'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = schema.parse(body)

    const admin = await verifyAdminCredentials(email, password)
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const session = await getSession()
    session.adminId = admin.id
    session.email = admin.email
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({ success: true, email: admin.email })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
