import { MarkerType } from '@xyflow/react'

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
import { getEdgeDisplayLabel, normalizeEdgeLabel } from './board'

const EDGE_COLORS: Record<BoardEdgeKind, string> = {
  solved_by: 'var(--edge-solved-by)',
  continued_by: 'var(--edge-continued-by)',
  has_option: 'var(--edge-has-option)',
  combines_into: 'var(--edge-combines-into)',
  followed_by: 'var(--edge-followed-by)',
  relates_to: 'var(--edge-relates-to)',
}

export function boardToFlowNodes(board: BoardData, mode: AppMode): FlowBoardNode[] {
  return board.nodes.map((node) => ({
    id: node.id,
    type: 'navigator',
    position: node.position,
    className: mode === 'viewer' ? 'nopan' : undefined,
    data: {
      kind: node.kind,
      githubUrl: node.githubUrl,
      repoSlug: node.repoSlug,
      number: node.number,
      title: node.title,
      state: node.state,
      isOwnedByMe: node.isOwnedByMe,
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
    isOwnedByMe: node.data.isOwnedByMe,
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
    kind: edge.data?.kind ?? 'relates_to',
    label: normalizeEdgeLabel(edge.data?.label),
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
  kind?: BoardEdgeKind
  label?: string
  data?: NavigatorEdgeData
}): FlowBoardEdge {
  const kind = edge.data?.kind ?? edge.kind ?? 'relates_to'
  const customLabel = normalizeEdgeLabel(edge.data?.label ?? edge.label)
  const stroke = EDGE_COLORS[kind]
  const displayLabel = getEdgeDisplayLabel(kind, customLabel)
  const isOptionPath = kind === 'has_option'

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'step',
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: stroke,
      width: 18,
      height: 18,
    },
    style: {
      stroke,
      strokeWidth: 2.2,
      strokeDasharray: isOptionPath ? '7 6' : undefined,
    },
    label: displayLabel,
    labelStyle: {
      fill: stroke,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.03em',
    },
    labelShowBg: true,
    labelBgStyle: {
      fill: 'var(--edge-label-bg)',
      stroke: 'none',
      strokeWidth: 0,
    },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 8,
    data: {
      kind,
      label: customLabel,
    },
    ariaLabel: `Left-to-right relationship: ${displayLabel}`,
  }
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}
