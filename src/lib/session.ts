import { getIronSession, IronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  adminId?: number
  email?: string
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: (process.env.SESSION_SECRET || 'dev-fallback-secret-32-chars-minimum!!') as string,
  cookieName: 'amarktai-admin-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.isLoggedIn) {
    session.isLoggedIn = false
  }
  return session
}
