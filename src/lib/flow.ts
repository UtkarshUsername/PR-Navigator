import { MarkerType } from '@xyflow/react'

import { EDGE_KIND_LABELS } from '../constants'
import type {
  AppMode,
  BoardData,
  BoardEdge,
  BoardEdgeKind,
  BoardMeta,
  BoardNode,
  FlowBoardEdge,
  FlowBoardNode,
  NavigatorEdgeData,
  NavigatorNodeData,
} from '../types'
import { getEdgeDisplayLabel } from './board'

const EDGE_COLORS: Record<BoardEdgeKind, string> = {
  addresses: '#214f82',
  alternative: '#8c5a1c',
  builds_on: '#2d6f63',
  relates: '#6b6873',
}

export function boardToFlowNodes(board: BoardData, mode: AppMode): FlowBoardNode[] {
  return board.nodes.map((node) => ({
    id: node.id,
    type: 'navigator',
    position: node.position,
    data: {
      kind: node.kind,
      githubUrl: node.githubUrl,
      repoSlug: node.repoSlug,
      number: node.number,
      title: node.title,
      state: node.state,
      mode,
    } satisfies NavigatorNodeData,
  }))
}

export function boardToFlowEdges(board: BoardData): FlowBoardEdge[] {
  return board.edges.map(createDecoratedEdge)
}

export function flowToBoardNodes(nodes: FlowBoardNode[]): BoardNode[] {
  return nodes.map((node) => ({
    id: node.id,
    kind: node.data.kind,
    githubUrl: node.data.githubUrl,
    repoSlug: node.data.repoSlug,
    number: node.data.number,
    title: node.data.title,
    state: node.data.state,
    position: {
      x: roundCoordinate(node.position.x),
      y: roundCoordinate(node.position.y),
    },
  }))
}

export function flowToBoardEdges(edges: FlowBoardEdge[]): BoardEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.data?.kind ?? 'relates',
    label: edge.data?.label?.trim() ? edge.data.label.trim() : undefined,
  }))
}

export function createBoardFromFlow(input: {
  meta: BoardMeta
  nodes: FlowBoardNode[]
  edges: FlowBoardEdge[]
}): BoardData {
  return {
    version: 1,
    meta: input.meta,
    nodes: flowToBoardNodes(input.nodes),
    edges: flowToBoardEdges(input.edges),
  }
}

export function createDecoratedEdge(edge: {
  id: string
  source: string
  target: string
  data?: NavigatorEdgeData
}): FlowBoardEdge {
  const kind = edge.data?.kind ?? 'relates'
  const stroke = EDGE_COLORS[kind]
  const displayLabel = getEdgeDisplayLabel(kind, edge.data?.label)

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: stroke,
      width: 18,
      height: 18,
    },
    style: {
      stroke,
      strokeWidth: 1.7,
    },
    label: displayLabel,
    labelStyle: {
      fill: stroke,
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    labelBgStyle: {
      fill: 'rgba(251, 247, 240, 0.98)',
      stroke: '#d7d0c2',
      strokeWidth: 1,
    },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 999,
    data: {
      kind,
      label: edge.data?.label?.trim() ? edge.data.label.trim() : undefined,
    },
    ariaLabel: `${EDGE_KIND_LABELS[kind]} relationship`,
  }
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}
