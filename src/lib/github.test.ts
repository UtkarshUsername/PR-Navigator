import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createGitHubResourceId,
  fetchAuthoredGitHubItems,
  parseClosingIssueIdsFromBody,
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

describe('parseClosingIssueIdsFromBody', () => {
  it('extracts same-repo and explicit cross-repo closing references', () => {
    expect(
      parseClosingIssueIdsFromBody(
        'Fixes #12, resolves octo-org/docs#44 and closes #18',
        'octocat/Hello-World',
      ),
    ).toEqual([
      'issue:octocat/hello-world:12',
      'issue:octo-org/docs:44',
      'issue:octocat/hello-world:18',
    ])
  })
})

describe('fetchAuthoredGitHubItems', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads authored issues and PRs and normalizes pull request states', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                number: 12,
                title: 'Fix flaky CI',
                html_url: 'https://github.com/octocat/Hello-World/issues/12',
                state: 'closed',
                updated_at: '2026-02-01T10:00:00Z',
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                number: 19,
                title: 'Ship the sidebar',
                html_url: 'https://github.com/octocat/Hello-World/pull/19',
                state: 'closed',
                updated_at: '2026-03-01T10:00:00Z',
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            body: 'Fixes #12',
            draft: false,
            merged_at: '2026-03-01T12:00:00Z',
            state: 'closed',
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

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('surfaces a rate-limit specific error', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'API rate limit exceeded' }), { status: 403 }),
    )

    await expect(
      fetchAuthoredGitHubItems({
        repoSlug: 'octocat/Hello-World',
        username: 'octocat',
        fetchImpl: fetchMock,
      }),
    ).rejects.toThrow('GitHub rate limit reached. Add VITE_GITHUB_TOKEN to raise the limit.')
  })
})
