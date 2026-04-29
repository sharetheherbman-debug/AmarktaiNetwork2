import { describe, expect, it } from 'vitest'
import path from 'path'
import {
  ALLOWED_CHECKS,
  isBinaryPath,
  isSecretPath,
  parseGitHubRepoUrl,
  resolveRepoPath,
  sanitizeBranchName,
} from '@/lib/repo-workbench'

describe('repo workbench safety helpers', () => {
  it('accepts only supported GitHub repo URLs', () => {
    expect(parseGitHubRepoUrl('https://github.com/owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo',
      remoteUrl: 'https://github.com/owner/repo.git',
    })
    expect(() => parseGitHubRepoUrl('https://gitlab.com/owner/repo')).toThrow(/Only https:\/\/github.com/)
  })

  it('sanitizes branch names and rejects traversal-like names', () => {
    expect(sanitizeBranchName('feature/repo-workbench')).toBe('feature/repo-workbench')
    expect(() => sanitizeBranchName('../main')).toThrow(/Invalid branch/)
    expect(() => sanitizeBranchName('/main')).toThrow(/Invalid branch/)
  })

  it('blocks repo path traversal', () => {
    const root = path.resolve('tmp', 'workspace')
    expect(resolveRepoPath(root, 'src/app.ts')).toBe(path.resolve(root, 'src/app.ts'))
    expect(() => resolveRepoPath(root, '../secret')).toThrow(/Path traversal/)
  })

  it('blocks secrets and binaries from file viewer', () => {
    expect(isSecretPath('.env')).toBe(true)
    expect(isSecretPath('config/private.pem')).toBe(true)
    expect(isBinaryPath('public/logo.png')).toBe(true)
    expect(isBinaryPath('src/app/page.tsx')).toBe(false)
  })

  it('exposes only named npm check commands', () => {
    expect(Object.keys(ALLOWED_CHECKS).sort()).toEqual(['audit', 'build', 'lint', 'test'])
  })
})
