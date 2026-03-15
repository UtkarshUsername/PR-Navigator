import type { BoardEdgeKind, BoardNodeKind, BoardNodeState } from './types'

export type NodeStateBadgeTone =
  | 'open'
  | 'issue-closed'
  | 'pr-closed'
  | 'merged'
  | 'draft'

export const APP_NAME = 'PR Navigator'
export const LOCAL_DRAFT_STORAGE_KEY = 'pr-navigator/local-draft'
export const THEME_STORAGE_KEY = 'pr-navigator/theme'
export const DEFAULT_BOARD_TITLE = 'PR Navigator Board'

export const NODE_KIND_LABELS: Record<BoardNodeKind, string> = {
  issue: 'Issue',
  pr: 'Pull Request',
}

export const EDGE_KIND_LABELS: Record<BoardEdgeKind, string> = {
  solved_by: 'solved by',
  continued_by: 'continued by',
  has_option: 'has option',
  combines_into: 'combines into',
  followed_by: 'followed by',
  relates_to: 'relates to',
}

export const EDGE_KIND_HELP: Record<BoardEdgeKind, string> = {
  solved_by: 'Use when the item on the left is resolved by the item on the right.',
  continued_by: 'Use when the item on the right picks up where the left item stopped.',
  has_option: 'Use when one left-side item can lead to multiple right-side options.',
  combines_into: 'Use when multiple left-side items come together in one right-side follow-up.',
  followed_by: 'Use when the right-side item happens next after the left-side item.',
  relates_to: 'Use when the left and right items are connected but not by a stronger relationship.',
}

export const ISSUE_STATE_OPTIONS: BoardNodeState[] = ['open', 'closed']
export const PR_STATE_OPTIONS: BoardNodeState[] = ['draft', 'open', 'closed', 'merged']

export const EDGE_KIND_OPTIONS: BoardEdgeKind[] = [
  'solved_by',
  'continued_by',
  'has_option',
  'combines_into',
  'followed_by',
  'relates_to',
]

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

export function getNodeStateBadgeTone(
  kind: BoardNodeKind,
  state: BoardNodeState | undefined,
): NodeStateBadgeTone | null {
  if (!state) {
    return null
  }

  if (state === 'closed') {
    return kind === 'issue' ? 'issue-closed' : 'pr-closed'
  }

  return state
}
