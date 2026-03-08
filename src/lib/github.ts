import type { BoardNodeKind } from '../types'

export interface ParsedGitHubResource {
  kind: BoardNodeKind
  githubUrl: string
  repoSlug: string
  number: number
}

const GITHUB_HOSTNAMES = new Set(['github.com', 'www.github.com'])

export function parseGitHubResourceUrl(
  rawUrl: string,
  expectedKind?: BoardNodeKind,
): ParsedGitHubResource {
  let url: URL

  try {
    url = new URL(rawUrl.trim())
  } catch {
    throw new Error('Enter a valid GitHub issue or pull request URL.')
  }

  if (!GITHUB_HOSTNAMES.has(url.hostname.toLowerCase())) {
    throw new Error('Only github.com issue and pull request URLs are supported.')
  }

  const segments = url.pathname.split('/').filter(Boolean)

  if (segments.length < 4) {
    throw new Error('GitHub URLs must point to a specific issue or pull request.')
  }

  const [owner, repo, resource, numberSegment] = segments

  if (resource !== 'issues' && resource !== 'pull') {
    throw new Error('The URL must point to an issue or a pull request.')
  }

  if (!/^\d+$/.test(numberSegment)) {
    throw new Error('The issue or pull request number is missing from the URL.')
  }

  const kind: BoardNodeKind = resource === 'issues' ? 'issue' : 'pr'

  if (expectedKind && expectedKind !== kind) {
    throw new Error(
      expectedKind === 'issue'
        ? 'That URL points to a pull request, not an issue.'
        : 'That URL points to an issue, not a pull request.',
    )
  }

  return {
    kind,
    githubUrl: `https://github.com/${owner}/${repo}/${resource}/${numberSegment}`,
    repoSlug: `${owner}/${repo}`,
    number: Number(numberSegment),
  }
}
