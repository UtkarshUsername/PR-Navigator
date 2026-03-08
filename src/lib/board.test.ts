import { describe, expect, it } from 'vitest'

import { createBoardSnapshot, safeParseBoardData } from './board'

describe('board schema', () => {
  it('accepts a valid board payload', () => {
    const board = createBoardSnapshot({
      meta: {
        title: 'Demo board',
        updatedAt: '2026-03-08T00:00:00.000Z',
      },
      nodes: [
        {
          id: 'node-1',
          kind: 'issue',
          githubUrl: 'https://github.com/octocat/Hello-World/issues/1',
          repoSlug: 'octocat/Hello-World',
          number: 1,
          title: 'Track navigation',
          state: 'open',
          position: { x: 120, y: 180 },
        },
      ],
      edges: [],
    })

    const result = safeParseBoardData(board)

    expect(result.success).toBe(true)
  })

  it('rejects edges that point to missing nodes', () => {
    const result = safeParseBoardData({
      version: 1,
      meta: {
        title: 'Broken board',
        updatedAt: '2026-03-08T00:00:00.000Z',
      },
      nodes: [],
      edges: [
        {
          id: 'edge-1',
          source: 'missing-a',
          target: 'missing-b',
          kind: 'relates',
        },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('points to missing node ids')
    }
  })

  it('rejects issue states that only make sense for pull requests', () => {
    const result = safeParseBoardData({
      version: 1,
      meta: {
        title: 'Broken states',
        updatedAt: '2026-03-08T00:00:00.000Z',
      },
      nodes: [
        {
          id: 'node-1',
          kind: 'issue',
          githubUrl: 'https://github.com/octocat/Hello-World/issues/1',
          repoSlug: 'octocat/Hello-World',
          number: 1,
          title: 'Impossible issue state',
          state: 'merged',
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('not valid for issue node')
    }
  })
})
