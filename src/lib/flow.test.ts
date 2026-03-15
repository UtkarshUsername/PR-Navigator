import { describe, expect, it } from 'vitest'

import {
  boardToFlowEdges,
  boardToFlowNodes,
  createDecoratedEdge,
  flowToBoardEdges,
  flowToBoardNodes,
  moveSelectedFlowNodesToBoard,
} from './flow'
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
  archived: {
    nodes: [],
    edges: [],
  },
}

describe('boardToFlowNodes', () => {
  it('marks viewer nodes as nopan so React Flow can deliver clicks', () => {
    expect(boardToFlowNodes(board, 'viewer')[0].className).toBe('nopan')
  })

  it('leaves editor nodes without viewer-only classes', () => {
    expect(boardToFlowNodes(board, 'editor')[0].className).toBeUndefined()
  })

  it('preserves PR closing issue metadata through flow conversion', () => {
    const nodes = boardToFlowNodes(
      {
        ...board,
        nodes: [
          {
            id: 'node-pr',
            kind: 'pr',
            githubUrl: 'https://github.com/octocat/Hello-World/pull/55',
            repoSlug: 'octocat/Hello-World',
            number: 55,
            title: 'Link issues automatically',
            closingIssueIds: ['issue:octocat/hello-world:42'],
            position: { x: 260, y: 0 },
          },
        ],
      },
      'editor',
    )

    expect(nodes[0].data.closingIssueIds).toEqual(['issue:octocat/hello-world:42'])
    expect(flowToBoardNodes(nodes)[0].closingIssueIds).toEqual(['issue:octocat/hello-world:42'])
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

describe('moveSelectedFlowNodesToBoard', () => {
  it('moves the full connected graph for the selected cards', () => {
    const result = moveSelectedFlowNodesToBoard({
      selectedNodeIds: ['node-1'],
      sourceNodes: boardToFlowNodes(
        {
          ...board,
          nodes: [
            board.nodes[0],
            {
              id: 'node-2',
              kind: 'pr',
              githubUrl: 'https://github.com/octocat/Hello-World/pull/43',
              repoSlug: 'octocat/Hello-World',
              number: 43,
              title: 'Archive me too',
              position: { x: 260, y: 0 },
            },
            {
              id: 'node-3',
              kind: 'issue',
              githubUrl: 'https://github.com/octocat/Hello-World/issues/44',
              repoSlug: 'octocat/Hello-World',
              number: 44,
              title: 'Archive this too',
              position: { x: 520, y: 0 },
            },
          ],
        },
        'editor',
      ),
      sourceEdges: boardToFlowEdges({
        ...board,
        nodes: [
          board.nodes[0],
          {
            id: 'node-2',
            kind: 'pr',
            githubUrl: 'https://github.com/octocat/Hello-World/pull/43',
            repoSlug: 'octocat/Hello-World',
            number: 43,
            title: 'Archive me too',
            position: { x: 260, y: 0 },
          },
          {
            id: 'node-3',
            kind: 'issue',
            githubUrl: 'https://github.com/octocat/Hello-World/issues/44',
            repoSlug: 'octocat/Hello-World',
            number: 44,
            title: 'Archive this too',
            position: { x: 520, y: 0 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            kind: 'solved_by',
          },
          {
            id: 'edge-2',
            source: 'node-2',
            target: 'node-3',
            kind: 'followed_by',
          },
        ],
      }),
      targetNodes: [],
      targetEdges: [],
    })

    expect(result.sourceNodes).toHaveLength(0)
    expect(result.sourceEdges).toHaveLength(0)
    expect(result.targetNodes.map((node) => node.id)).toEqual(['node-1', 'node-2', 'node-3'])
    expect(result.targetEdges.map((edge) => edge.id)).toEqual(['edge-1', 'edge-2'])
    expect(result.movedNodeCount).toBe(3)
    expect(result.movedEdgeCount).toBe(2)
  })
})
