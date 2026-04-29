import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getGitHubConfig, listGitHubRepos } from '@/lib/github-integration'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [config, workspaces] = await Promise.all([
    getGitHubConfig(),
    prisma.repoWorkspace.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 25,
      include: {
        tasks: { orderBy: { updatedAt: 'desc' }, take: 3 },
        patches: { orderBy: { updatedAt: 'desc' }, take: 3 },
      },
    }).catch(() => []),
  ])

  const github = config?.configured ? await listGitHubRepos() : { repos: [], error: 'GitHub token not configured' }

  return NextResponse.json({
    github: {
      connected: !!config?.configured && !github.error,
      setupRequired: !config?.configured,
      error: github.error,
      repos: github.repos,
    },
    publicImportAvailable: true,
    workspaces,
  })
}
