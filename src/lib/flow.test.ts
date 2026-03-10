import { describe, expect, it } from 'vitest'

import { boardToFlowNodes } from './flow'
import type { BoardData } from '../types'

const board: BoardData = {
  version: 1,
  meta: {
    title: 'Demo board',
    updatedAt: '2026-03-10T00:00:00.000Z',
  },
  nodes: [
    {
      id: 'node-1',
      kind: 'issue',
      githubUrl: 'https://github.com/octocat/Hello-World/issues/42',
      repoSlug: 'octocat/Hello-World',
      number: 42,
      title: 'Track navigation',
      position: { x: 0, y: 0 },
    },
  ],
  edges: [],
}

describe('boardToFlowNodes', () => {
  it('marks viewer nodes as nopan so React Flow can deliver clicks', () => {
    expect(boardToFlowNodes(board, 'viewer')[0].className).toBe('nopan')
  })

  it('leaves editor nodes without viewer-only classes', () => {
    expect(boardToFlowNodes(board, 'editor')[0].className).toBeUndefined()
  })
})
