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
  addresses: 'rgba(244, 247, 251, 0.92)',
  alternative: 'rgba(244, 247, 251, 0.72)',
  builds_on: 'rgba(244, 247, 251, 0.92)',
  relates: 'rgba(244, 247, 251, 0.82)',
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
  const isAlternative = kind === 'alternative'

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: stroke,
      width: 16,
      height: 16,
    },
    style: {
      stroke,
      strokeWidth: 2,
      strokeDasharray: isAlternative ? '7 6' : undefined,
    },
    label: displayLabel,
    labelStyle: {
      fill: stroke,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
    },
    labelBgStyle: {
      fill: 'rgba(10, 12, 15, 0.96)',
      stroke: 'rgba(244, 247, 251, 0.14)',
      strokeWidth: 1,
    },
    labelBgPadding: [7, 4],
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
