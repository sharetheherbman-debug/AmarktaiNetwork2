import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getRepoModelChoices } from '@/lib/repo-workbench'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const models = await getRepoModelChoices()
  return NextResponse.json(models)
}
