import type { BoardEdgeKind, BoardNodeKind, BoardNodeState } from './types'

export const APP_NAME = 'PR Navigator'
export const LOCAL_DRAFT_STORAGE_KEY = 'pr-navigator/local-draft'
export const DEFAULT_BOARD_TITLE = 'PR Navigator Board'

export const NODE_KIND_LABELS: Record<BoardNodeKind, string> = {
  issue: 'Issue',
  pr: 'Pull Request',
}

export const EDGE_KIND_LABELS: Record<BoardEdgeKind, string> = {
  addresses: 'Addresses',
  alternative: 'Alternative',
  builds_on: 'Builds On',
  relates: 'Relates',
}

export const ISSUE_STATE_OPTIONS: BoardNodeState[] = ['open', 'closed']
export const PR_STATE_OPTIONS: BoardNodeState[] = ['draft', 'open', 'closed', 'merged']

export const EDGE_KIND_OPTIONS = Object.keys(EDGE_KIND_LABELS) as BoardEdgeKind[]

export function isStateAllowedForKind(
  kind: BoardNodeKind,
  state: BoardNodeState | undefined,
): boolean {
  if (!state) {
    return true
  }

  return kind === 'issue'
    ? ISSUE_STATE_OPTIONS.includes(state)
    : PR_STATE_OPTIONS.includes(state)
}

export function formatNodeState(state: BoardNodeState | undefined): string {
  if (!state) {
    return 'Unset'
  }

  return state.charAt(0).toUpperCase() + state.slice(1)
}
