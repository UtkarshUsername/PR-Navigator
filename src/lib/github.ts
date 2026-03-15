import type { BoardNodeKind, BoardNodeState, GitHubAuthoredItem } from '../types'

export interface ParsedGitHubResource {
  kind: BoardNodeKind
  githubUrl: string
  repoSlug: string
  number: number
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

interface GitHubPullRequestResponse {
  body: string | null
  draft: boolean
  merged_at: string | null
  state: 'open' | 'closed'
}

interface FetchAuthoredGitHubItemsOptions {
  repoSlug: string
  username: string
  limit?: number
  token?: string
  fetchImpl?: typeof fetch
}

const GITHUB_HOSTNAMES = new Set(['github.com', 'www.github.com'])
const GITHUB_API_BASE_URL = 'https://api.github.com'
const DEFAULT_FETCH_LIMIT = 24
const MAX_ITEMS_PER_KIND = 12
const CLOSING_KEYWORD_PATTERN =
  /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b[:\s]+((?:(?:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)?#\d+)(?:\s*(?:,|and)\s*(?:(?:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)?#\d+))*)/gi
const ISSUE_REFERENCE_PATTERN = /((?:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)?#\d+)/gi

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

  const [owner, repo] = parseRepoSlug(trimmedRepoSlug)
  const perKindLimit = Math.min(Math.max(Math.ceil(limit / 2), 1), MAX_ITEMS_PER_KIND)
  const headers = createGitHubApiHeaders(token)
  const issueQuery = encodeURIComponent(`repo:${trimmedRepoSlug} author:${trimmedUsername} is:issue`)
  const prQuery = encodeURIComponent(`repo:${trimmedRepoSlug} author:${trimmedUsername} is:pr`)

  const [issuesResponse, prsResponse] = await Promise.all([
    fetchGitHubApiJson<GitHubSearchResponse>(
      `/search/issues?q=${issueQuery}&sort=updated&order=desc&per_page=${perKindLimit}`,
      fetchImpl,
      headers,
    ),
    fetchGitHubApiJson<GitHubSearchResponse>(
      `/search/issues?q=${prQuery}&sort=updated&order=desc&per_page=${perKindLimit}`,
      fetchImpl,
      headers,
    ),
  ])

  const prDetails = await Promise.all(
    prsResponse.items.map((item) =>
      fetchGitHubApiJson<GitHubPullRequestResponse>(
        `/repos/${owner}/${repo}/pulls/${item.number}`,
        fetchImpl,
        headers,
      ),
    ),
  )

  const items = [
    ...issuesResponse.items.map((item) => mapSearchResultToAuthoredItem(trimmedRepoSlug, 'issue', item)),
    ...prsResponse.items.map((item, index) =>
      mapSearchResultToAuthoredItem(
        trimmedRepoSlug,
        'pr',
        item,
        getPullRequestState(prDetails[index]),
        parseClosingIssueIdsFromBody(prDetails[index].body ?? '', trimmedRepoSlug),
      ),
    ),
  ]

  return items
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, limit)
}

function parseRepoSlug(repoSlug: string): [string, string] {
  const segments = repoSlug.split('/').map((segment) => segment.trim()).filter(Boolean)

  if (segments.length !== 2) {
    throw new Error('GitHub repo slugs must look like owner/repo.')
  }

  return [segments[0], segments[1]]
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
    return 'GitHub could not find that repository or pull request.'
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
  state = getGitHubStateFromClosedFlag(item.state),
  closingIssueIds: string[] | undefined = undefined,
): GitHubAuthoredItem {
  return {
    id: createGitHubResourceId(kind, repoSlug, item.number),
    kind,
    githubUrl: item.html_url,
    repoSlug,
    number: item.number,
    title: item.title,
    state,
    updatedAt: item.updated_at,
    closingIssueIds: closingIssueIds?.length ? closingIssueIds : undefined,
  }
}

function getPullRequestState(item: GitHubPullRequestResponse): BoardNodeState {
  if (item.merged_at) {
    return 'merged'
  }

  if (item.draft) {
    return 'draft'
  }

  return getGitHubStateFromClosedFlag(item.state)
}

function getGitHubStateFromClosedFlag(state: 'open' | 'closed'): BoardNodeState {
  return state === 'open' ? 'open' : 'closed'
}

export function parseClosingIssueIdsFromBody(body: string, defaultRepoSlug: string): string[] {
  const closingIssueIds = new Set<string>()

  for (const match of body.matchAll(CLOSING_KEYWORD_PATTERN)) {
    const references = match[1]?.match(ISSUE_REFERENCE_PATTERN) ?? []

    for (const reference of references) {
      const normalizedReference = reference.trim()

      if (!normalizedReference) {
        continue
      }

      const [explicitRepoSlug, numberSegment] = normalizedReference.includes('/')
        ? normalizedReference.split('#')
        : [defaultRepoSlug, normalizedReference.slice(1)]

      if (!explicitRepoSlug || !numberSegment || !/^\d+$/.test(numberSegment)) {
        continue
      }

      closingIssueIds.add(
        createGitHubResourceId('issue', explicitRepoSlug, Number(numberSegment)),
      )
    }
  }

  return [...closingIssueIds]
}
