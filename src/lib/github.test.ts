import { describe, expect, it } from 'vitest'

import { parseGitHubResourceUrl } from './github'

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
