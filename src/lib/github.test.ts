import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createGitHubResourceId,
  fetchAuthoredGitHubItems,
  parseGitHubResourceUrl,
} from './github'

describe('parseGitHubResourceUrl', () => {
  it('parses GitHub issue URLs', () => {
    expect(parseGitHubResourceUrl('https://github.com/octocat/Hello-World/issues/42')).toEqual({
      kind: 'issue',
      githubUrl: 'https://github.com/octocat/Hello-World/issues/42',
      repoSlug: 'octocat/Hello-World',
      number: 42,
    })
  })

  it('parses pull request URLs and normalizes the type to pr', () => {
    expect(parseGitHubResourceUrl('https://github.com/octocat/Hello-World/pull/19')).toEqual({
      kind: 'pr',
      githubUrl: 'https://github.com/octocat/Hello-World/pull/19',
      repoSlug: 'octocat/Hello-World',
      number: 19,
    })
  })

  it('rejects URLs that do not point to GitHub issues or PRs', () => {
    expect(() => parseGitHubResourceUrl('https://example.com/issues/1')).toThrow(
      'Only github.com issue and pull request URLs are supported.',
    )
  })

  it('rejects mismatched kinds in the add-node form', () => {
    expect(() =>
      parseGitHubResourceUrl('https://github.com/octocat/Hello-World/pull/19', 'issue'),
    ).toThrow('That URL points to a pull request, not an issue.')
  })
})

describe('createGitHubResourceId', () => {
  it('normalizes repo slugs for duplicate detection', () => {
    expect(createGitHubResourceId('issue', 'OctoCat/Hello-World', 42)).toBe(
      'issue:octocat/hello-world:42',
    )
  })
})

describe('fetchAuthoredGitHubItems', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads authored issues and PRs from GitHub GraphQL and uses linked issues from GitHub data', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            issues: {
              nodes: [
                {
                  number: 12,
                  title: 'Fix flaky CI',
                  url: 'https://github.com/octocat/Hello-World/issues/12',
                  state: 'CLOSED',
                  updatedAt: '2026-02-01T10:00:00Z',
                  repository: {
                    nameWithOwner: 'octocat/Hello-World',
                  },
                },
              ],
            },
            pullRequests: {
              nodes: [
                {
                  number: 19,
                  title: 'Ship the sidebar',
                  url: 'https://github.com/octocat/Hello-World/pull/19',
                  state: 'CLOSED',
                  updatedAt: '2026-03-01T10:00:00Z',
                  isDraft: false,
                  mergedAt: '2026-03-01T12:00:00Z',
                  repository: {
                    nameWithOwner: 'octocat/Hello-World',
                  },
                  closingIssuesReferences: {
                    nodes: [
                      {
                        number: 12,
                        repository: {
                          nameWithOwner: 'octocat/Hello-World',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        }),
        { status: 200 },
      ),
    )

    await expect(
      fetchAuthoredGitHubItems({
        repoSlug: 'octocat/Hello-World',
        username: 'octocat',
        limit: 8,
        fetchImpl: fetchMock,
        token: 'test-token',
      }),
    ).resolves.toEqual([
      {
        id: 'pr:octocat/hello-world:19',
        kind: 'pr',
        githubUrl: 'https://github.com/octocat/Hello-World/pull/19',
        repoSlug: 'octocat/Hello-World',
        number: 19,
        title: 'Ship the sidebar',
        state: 'merged',
        updatedAt: '2026-03-01T10:00:00Z',
        closingIssueIds: ['issue:octocat/hello-world:12'],
      },
      {
        id: 'issue:octocat/hello-world:12',
        kind: 'issue',
        githubUrl: 'https://github.com/octocat/Hello-World/issues/12',
        repoSlug: 'octocat/Hello-World',
        number: 12,
        title: 'Fix flaky CI',
        state: 'closed',
        updatedAt: '2026-02-01T10:00:00Z',
      },
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('requires a token for the GraphQL sidebar fetch', async () => {
    await expect(
      fetchAuthoredGitHubItems({
        repoSlug: 'octocat/Hello-World',
        username: 'octocat',
        fetchImpl: vi.fn<typeof fetch>(),
      }),
    ).rejects.toThrow('Set VITE_GITHUB_TOKEN to load authored items from GitHub GraphQL.')
  })

  it('surfaces a GraphQL rate-limit specific error', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'API rate limit exceeded' }), { status: 403 }),
    )

    await expect(
      fetchAuthoredGitHubItems({
        repoSlug: 'octocat/Hello-World',
        username: 'octocat',
        fetchImpl: fetchMock,
        token: 'test-token',
      }),
    ).rejects.toThrow('GitHub rate limit reached or the token lacks access for GitHub GraphQL.')
  })

  it('surfaces GraphQL field errors', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ message: 'Resource not accessible by integration' }],
        }),
        { status: 200 },
      ),
    )

    await expect(
      fetchAuthoredGitHubItems({
        repoSlug: 'octocat/Hello-World',
        username: 'octocat',
        fetchImpl: fetchMock,
        token: 'test-token',
      }),
    ).rejects.toThrow(
      'GitHub GraphQL request failed: Resource not accessible by integration',
    )
  })
})
