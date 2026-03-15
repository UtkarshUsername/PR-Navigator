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

interface GitHubGraphQlResponse {
  data?: {
    issues: {
      nodes: Array<GitHubGraphQlIssueNode | null>
    }
    pullRequests: {
      nodes: Array<GitHubGraphQlPullRequestNode | null>
    }
  }
  errors?: Array<{ message?: string }>
}

interface GitHubGraphQlRepository {
  nameWithOwner: string
}

interface GitHubGraphQlIssueNode {
  number: number
  title: string
  url: string
  state: 'OPEN' | 'CLOSED'
  updatedAt: string
  repository: GitHubGraphQlRepository
}

interface GitHubGraphQlPullRequestNode {
  number: number
  title: string
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  updatedAt: string
  isDraft: boolean
  mergedAt: string | null
  repository: GitHubGraphQlRepository
  closingIssuesReferences: {
    nodes: Array<{
      number: number
      repository: GitHubGraphQlRepository
    }>
  }
}

const GITHUB_HOSTNAMES = new Set(['github.com', 'www.github.com'])
const GITHUB_API_BASE_URL = 'https://api.github.com'
const GITHUB_GRAPHQL_URL = `${GITHUB_API_BASE_URL}/graphql`
const DEFAULT_FETCH_LIMIT = 24
const MAX_ITEMS_PER_KIND = 12
const AUTHORED_ITEMS_GRAPHQL_QUERY = `
  query AuthoredItems($issueQuery: String!, $prQuery: String!, $first: Int!) {
    issues: search(query: $issueQuery, type: ISSUE, first: $first) {
      nodes {
        ... on Issue {
          number
          title
          url
          state
          updatedAt
          repository {
            nameWithOwner
          }
        }
      }
    }
    pullRequests: search(query: $prQuery, type: ISSUE, first: $first) {
      nodes {
        ... on PullRequest {
          number
          title
          url
          state
          updatedAt
          isDraft
          mergedAt
          repository {
            nameWithOwner
          }
          closingIssuesReferences(first: 20) {
            nodes {
              number
              repository {
                nameWithOwner
              }
            }
          }
        }
      }
    }
  }
`

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

  if (!token) {
    throw new Error('Set VITE_GITHUB_TOKEN to load authored items from GitHub GraphQL.')
  }

  const perKindLimit = Math.min(Math.max(Math.ceil(limit / 2), 1), MAX_ITEMS_PER_KIND)
  const response = await fetchGitHubGraphQl<GitHubGraphQlResponse>({
    token,
    fetchImpl,
    query: AUTHORED_ITEMS_GRAPHQL_QUERY,
    variables: {
      issueQuery: `repo:${trimmedRepoSlug} author:${trimmedUsername} is:issue sort:updated-desc`,
      prQuery: `repo:${trimmedRepoSlug} author:${trimmedUsername} is:pr sort:updated-desc`,
      first: perKindLimit,
    },
  })

  if (!response.data) {
    throw new Error('GitHub GraphQL returned no data for the authored-items sidebar.')
  }

  const items = [
    ...response.data.issues.nodes.filter(isPresent).map((item) => mapIssueNodeToAuthoredItem(item)),
    ...response.data.pullRequests.nodes.filter(isPresent).map((item) =>
      mapPullRequestNodeToAuthoredItem(item),
    ),
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

async function fetchGitHubGraphQl<T>(input: {
  token: string
  fetchImpl: typeof fetch
  query: string
  variables: Record<string, string | number>
}): Promise<T> {
  const response = await input.fetchImpl(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      ...createGitHubApiHeaders(input.token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: input.query,
      variables: input.variables,
    }),
  })

  if (!response.ok) {
    throw new Error(await getGitHubApiErrorMessage(response))
  }

  const data = (await response.json()) as GitHubGraphQlResponse

  if (data.errors?.length) {
    const message = data.errors.find((error) => error.message)?.message

    throw new Error(
      message ? `GitHub GraphQL request failed: ${message}` : 'GitHub GraphQL request failed.',
    )
  }

  return data as T
}

async function getGitHubApiErrorMessage(response: Response): Promise<string> {
  if (response.status === 401) {
    return 'GitHub rejected the configured token for the authored-items sidebar.'
  }

  if (response.status === 403) {
    return 'GitHub rate limit reached or the token lacks access for GitHub GraphQL.'
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

function mapIssueNodeToAuthoredItem(item: GitHubGraphQlIssueNode): GitHubAuthoredItem {
  return {
    id: createGitHubResourceId('issue', item.repository.nameWithOwner, item.number),
    kind: 'issue',
    githubUrl: item.url,
    repoSlug: item.repository.nameWithOwner,
    number: item.number,
    title: item.title,
    state: getIssueState(item.state),
    updatedAt: item.updatedAt,
  }
}

function mapPullRequestNodeToAuthoredItem(item: GitHubGraphQlPullRequestNode): GitHubAuthoredItem {
  const closingIssueIds = item.closingIssuesReferences.nodes.map((issue) =>
    createGitHubResourceId('issue', issue.repository.nameWithOwner, issue.number),
  )

  return {
    id: createGitHubResourceId('pr', item.repository.nameWithOwner, item.number),
    kind: 'pr',
    githubUrl: item.url,
    repoSlug: item.repository.nameWithOwner,
    number: item.number,
    title: item.title,
    state: getPullRequestState(item),
    updatedAt: item.updatedAt,
    closingIssueIds: closingIssueIds.length > 0 ? closingIssueIds : undefined,
  }
}

function getPullRequestState(item: Pick<GitHubGraphQlPullRequestNode, 'mergedAt' | 'isDraft' | 'state'>): BoardNodeState {
  if (item.mergedAt) {
    return 'merged'
  }

  if (item.isDraft) {
    return 'draft'
  }

  return item.state === 'OPEN' ? 'open' : 'closed'
}

function getIssueState(state: GitHubGraphQlIssueNode['state']): BoardNodeState {
  return state === 'OPEN' ? 'open' : 'closed'
}

function isPresent<T>(value: T | null): value is T {
  return value !== null
}
