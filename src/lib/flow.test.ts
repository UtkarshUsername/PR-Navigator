import { describe, expect, it } from 'vitest'

import { boardToFlowEdges, boardToFlowNodes, createDecoratedEdge, flowToBoardEdges } from './flow'
import type { BoardData, FlowBoardEdge } from '../types'

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

describe('boardToFlowEdges', () => {
  it('uses the published board edge kind when hydrating viewer edges', () => {
    expect(
      boardToFlowEdges({
        ...board,
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            kind: 'solved_by',
          },
        ],
      })[0],
    ).toMatchObject({
      label: 'solved by',
      ariaLabel: 'Left-to-right relationship: solved by',
      data: {
        kind: 'solved_by',
        label: undefined,
      },
    })
  })
})

describe('edge label normalization', () => {
  it('drops stale built-in labels when decorating an edge', () => {
    const edge = createDecoratedEdge({
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      data: {
        kind: 'solved_by',
        label: 'relates to',
      },
    })

    expect(edge.label).toBe('solved by')
    expect(edge.data?.label).toBeUndefined()
  })

  it('does not serialize built-in labels as custom overrides', () => {
    const edges: FlowBoardEdge[] = [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'step',
        data: {
          kind: 'solved_by',
          label: 'relates to',
        },
      },
    ]

    expect(flowToBoardEdges(edges)).toEqual([
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        kind: 'solved_by',
        label: undefined,
      },
    ])
  })
})
