import type { BoardNodeKind, BoardNodeState, GitHubAuthoredItem } from '../types'

export interface ParsedGitHubResource {
  kind: BoardNodeKind
  githubUrl: string
  repoSlug: string
  number: number
}

interface FetchAuthoredGitHubItemsOptions {
  repoSlug: string
  username: string
  limit?: number
  token?: string
  fetchImpl?: typeof fetch
}

interface GitHubSearchResultItem {
  number: number
  title: string
  html_url: string
  state: 'open' | 'closed'
  updated_at: string
}

interface GitHubSearchResponse {
  items: GitHubSearchResultItem[]
}

const GITHUB_HOSTNAMES = new Set(['github.com', 'www.github.com'])
const GITHUB_API_BASE_URL = 'https://api.github.com'
const DEFAULT_FETCH_LIMIT = 24
const MAX_ITEMS_PER_KIND = 12

export function createGitHubResourceId(
  kind: BoardNodeKind,
  repoSlug: string,
  number: number,
): string {
  return `${kind}:${repoSlug.toLowerCase()}:${number}`
}

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

export async function fetchAuthoredGitHubItems({
  repoSlug,
  username,
  limit = DEFAULT_FETCH_LIMIT,
  token = import.meta.env.VITE_GITHUB_TOKEN?.trim(),
  fetchImpl = fetch,
}: FetchAuthoredGitHubItemsOptions): Promise<GitHubAuthoredItem[]> {
  const trimmedRepoSlug = repoSlug.trim()
  const trimmedUsername = username.trim()

  if (!trimmedRepoSlug || !trimmedUsername) {
    return []
  }

  const perKindLimit = Math.min(Math.max(Math.ceil(limit / 2), 1), MAX_ITEMS_PER_KIND)
  const headers = createGitHubApiHeaders(token)
  const issueQuery = encodeURIComponent(`repo:${trimmedRepoSlug} author:${trimmedUsername} is:issue`)
  const prQuery = encodeURIComponent(`repo:${trimmedRepoSlug} author:${trimmedUsername} is:pr`)

  const items = [
    ...(
      await fetchGitHubApiJson<GitHubSearchResponse>(
        `/search/issues?q=${issueQuery}&sort=updated&order=desc&per_page=${perKindLimit}`,
        fetchImpl,
        headers,
      )
    ).items.map((item) => mapSearchResultToAuthoredItem(trimmedRepoSlug, 'issue', item)),
    ...(
      await fetchGitHubApiJson<GitHubSearchResponse>(
        `/search/issues?q=${prQuery}&sort=updated&order=desc&per_page=${perKindLimit}`,
        fetchImpl,
        headers,
      )
    ).items.map((item) => mapSearchResultToAuthoredItem(trimmedRepoSlug, 'pr', item)),
  ]

  return items
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, limit)
}

function createGitHubApiHeaders(token: string | undefined): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function fetchGitHubApiJson<T>(
  path: string,
  fetchImpl: typeof fetch,
  headers: HeadersInit,
): Promise<T> {
  const response = await fetchImpl(`${GITHUB_API_BASE_URL}${path}`, {
    headers,
  })

  if (!response.ok) {
    throw new Error(await getGitHubApiErrorMessage(response))
  }

  return (await response.json()) as T
}

async function getGitHubApiErrorMessage(response: Response): Promise<string> {
  if (response.status === 401) {
    return 'GitHub rejected the configured token for the authored-items sidebar.'
  }

  if (response.status === 403) {
    return 'GitHub rate limit reached. Add VITE_GITHUB_TOKEN to raise the limit.'
  }

  if (response.status === 404) {
    return 'GitHub could not find that repository.'
  }

  try {
    const data = (await response.json()) as { message?: string }

    if (data.message) {
      return `GitHub request failed: ${data.message}`
    }
  } catch {
    return `GitHub request failed (${response.status}).`
  }

  return `GitHub request failed (${response.status}).`
}

function mapSearchResultToAuthoredItem(
  repoSlug: string,
  kind: BoardNodeKind,
  item: GitHubSearchResultItem,
): GitHubAuthoredItem {
  return {
    id: createGitHubResourceId(kind, repoSlug, item.number),
    kind,
    githubUrl: item.html_url,
    repoSlug,
    number: item.number,
    title: item.title,
    state: kind === 'pr' ? getPullRequestState(item.state) : getIssueState(item.state),
    updatedAt: item.updated_at,
  }
}

function getPullRequestState(state: GitHubSearchResultItem['state']): BoardNodeState {
  return state === 'open' ? 'open' : 'closed'
}

function getIssueState(state: GitHubSearchResultItem['state']): BoardNodeState {
  return state === 'open' ? 'open' : 'closed'
}
