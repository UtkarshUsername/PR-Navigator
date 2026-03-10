import type { Edge, Node } from '@xyflow/react'

export type AppMode = 'viewer' | 'editor'

export type BoardNodeKind = 'issue' | 'pr'
export type BoardNodeState = 'open' | 'closed' | 'merged' | 'draft'
export type BoardEdgeKind =
  | 'solved_by'
  | 'continued_by'
  | 'has_option'
  | 'combines_into'
  | 'followed_by'
  | 'relates_to'

export interface BoardMeta {
  title: string
  updatedAt: string
}

export interface BoardData {
  version: 1
  meta: BoardMeta
  nodes: BoardNode[]
  edges: BoardEdge[]
}

export interface BoardNode {
  id: string
  kind: BoardNodeKind
  githubUrl: string
  repoSlug: string
  number: number
  title: string
  state?: BoardNodeState
  isOwnedByMe?: boolean
  position: {
    x: number
    y: number
  }
}

export interface BoardEdge {
  id: string
  source: string
  target: string
  kind: BoardEdgeKind
  label?: string
}

export interface NavigatorNodeData extends Record<string, unknown> {
  kind: BoardNodeKind
  githubUrl: string
  repoSlug: string
  number: number
  title: string
  state?: BoardNodeState
  isOwnedByMe?: boolean
  mode: AppMode
}

export interface NavigatorEdgeData extends Record<string, unknown> {
  kind: BoardEdgeKind
  label?: string
}

export type FlowBoardNode = Node<NavigatorNodeData, 'navigator'>
export type FlowBoardEdge = Edge<NavigatorEdgeData, 'step'>

export type SelectionState =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | null
