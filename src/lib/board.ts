import { z } from 'zod'

import { DEFAULT_BOARD_TITLE, EDGE_KIND_LABELS, isStateAllowedForKind } from '../constants'
import type {
  BoardData,
  BoardEdge,
  BoardEdgeKind,
  BoardMeta,
  BoardNode,
  BoardNodeKind,
  BoardNodeState,
} from '../types'

const nodeKindSchema = z.enum(['issue', 'pr'] satisfies BoardNodeKind[])
const nodeStateSchema = z.enum(['open', 'closed', 'merged', 'draft'] satisfies BoardNodeState[])
const edgeKindSchema = z.enum(
  [
    'solved_by',
    'continued_by',
    'has_option',
    'combines_into',
    'followed_by',
    'relates_to',
  ] satisfies BoardEdgeKind[],
)

const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
})

const boardNodeSchema = z.object({
  id: z.string().min(1),
  kind: nodeKindSchema,
  githubUrl: z.string().url(),
  repoSlug: z.string().min(3),
  number: z.number().int().positive(),
  title: z.string(),
  state: nodeStateSchema.optional(),
  isOwnedByMe: z.boolean().optional(),
  position: positionSchema,
})

const boardEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: edgeKindSchema,
  label: z.string().optional(),
})

export const boardDataSchema = z
  .object({
    version: z.literal(1),
    meta: z.object({
      title: z.string().trim().min(1),
      updatedAt: z.string().datetime({ offset: true }),
    }),
    nodes: z.array(boardNodeSchema),
    edges: z.array(boardEdgeSchema),
  })
  .superRefine((board, ctx) => {
    const nodeIds = new Set<string>()
    const edgeIds = new Set<string>()

    for (const node of board.nodes) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate node id "${node.id}".`,
        })
      }

      nodeIds.add(node.id)

      if (!isStateAllowedForKind(node.kind, node.state)) {
        ctx.addIssue({
          code: 'custom',
          message: `State "${node.state}" is not valid for ${node.kind} node "${node.id}".`,
        })
      }
    }

    for (const edge of board.edges) {
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate edge id "${edge.id}".`,
        })
      }

      edgeIds.add(edge.id)

      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: 'custom',
          message: `Edge "${edge.id}" points to missing node ids.`,
        })
      }
    }
  })

export function createEmptyBoard(title = DEFAULT_BOARD_TITLE): BoardData {
  return {
    version: 1,
    meta: {
      title,
      updatedAt: new Date().toISOString(),
    },
    nodes: [],
    edges: [],
  }
}

export function parseBoardData(input: unknown): BoardData {
  return boardDataSchema.parse(input) as BoardData
}

export function safeParseBoardData(input: unknown):
  | { success: true; data: BoardData }
  | { success: false; error: string } {
  const result = boardDataSchema.safeParse(input)

  if (result.success) {
    return { success: true, data: result.data as BoardData }
  }

  return {
    success: false,
    error: result.error.issues.map((issue) => issue.message).join(' '),
  }
}

export function createBoardSnapshot(input: {
  meta: BoardMeta
  nodes: BoardNode[]
  edges: BoardEdge[]
}): BoardData {
  return {
    version: 1,
    meta: {
      title: input.meta.title.trim() || DEFAULT_BOARD_TITLE,
      updatedAt: new Date().toISOString(),
    },
    nodes: [...input.nodes],
    edges: [...input.edges],
  }
}

export function serializeBoardData(board: BoardData): string {
  return JSON.stringify(board, null, 2)
}

export function normalizeEdgeLabel(label: string | undefined): string | undefined {
  const trimmed = label?.trim()

  if (!trimmed) {
    return undefined
  }

  if (Object.values(EDGE_KIND_LABELS).includes(trimmed)) {
    return undefined
  }

  return trimmed
}

export function getEdgeDisplayLabel(kind: BoardEdgeKind, label: string | undefined): string {
  return normalizeEdgeLabel(label) ?? EDGE_KIND_LABELS[kind]
}
