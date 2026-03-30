import {
  EDGE_KIND_HELP,
  EDGE_KIND_LABELS,
  EDGE_KIND_OPTIONS,
  formatNodeState,
  getNodeStateBadgeTone,
} from '../constants'
import { getEdgeDisplayLabel } from '../lib/board'
import type { BoardEdgeKind, FlowBoardEdge, FlowBoardNode } from '../types'

interface InspectorPanelProps {
  selectedNode: FlowBoardNode | undefined
  selectedEdge: FlowBoardEdge | undefined
  leftLabel: string | null
  rightLabel: string | null
  edgeReadsLeftToRight: boolean
  onNodeTitleChange: (value: string) => void
  onNodeOwnedByMeChange: (value: boolean) => void
  onNodeDelete: () => void
  onEdgeKindChange: (value: BoardEdgeKind) => void
  onEdgeLabelChange: (value: string) => void
  onEdgeDelete: () => void
}

export function InspectorPanel({
  selectedNode,
  selectedEdge,
  leftLabel,
  rightLabel,
  edgeReadsLeftToRight,
  onNodeTitleChange,
  onNodeOwnedByMeChange,
  onNodeDelete,
  onEdgeKindChange,
  onEdgeLabelChange,
  onEdgeDelete,
}: InspectorPanelProps) {
  if (!selectedNode && !selectedEdge) {
    return null
  }

  if (selectedNode) {
    const stateBadgeTone = getNodeStateBadgeTone(selectedNode.data.kind, selectedNode.data.state)

    return (
      <aside className="selection-panel">
        <p className="selection-panel__eyebrow">Card</p>
        <h2 className="selection-panel__heading">
          {selectedNode.data.kind === 'issue' ? 'Issue' : 'Pull request'} #{selectedNode.data.number}
        </h2>

        <label className="field-group">
          <span>Title</span>
          <textarea
            rows={4}
            value={selectedNode.data.title}
            onChange={(event) => onNodeTitleChange(event.target.value)}
          />
        </label>

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={selectedNode.data.isOwnedByMe ?? false}
            onChange={(event) => onNodeOwnedByMeChange(event.target.checked)}
          />
          <span>By me</span>
        </label>

        <dl className="selection-panel__meta">
          <div className="selection-panel__meta-row">
            <dt>Repository</dt>
            <dd>{selectedNode.data.repoSlug}</dd>
          </div>
          <div className="selection-panel__meta-row">
            <dt>State</dt>
            <dd>
              {selectedNode.data.state && stateBadgeTone ? (
                <span className={`status-badge status-badge--${stateBadgeTone}`}>
                  {formatNodeState(selectedNode.data.state)}
                </span>
              ) : (
                formatNodeState(selectedNode.data.state)
              )}
            </dd>
          </div>
          <div className="selection-panel__meta-row">
            <dt>Authorship</dt>
            <dd>{selectedNode.data.isOwnedByMe ? 'By me' : 'Not by me'}</dd>
          </div>
        </dl>

        <div className="selection-panel__actions">
          <a
            className="hud-button"
            href={selectedNode.data.githubUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open on GitHub
          </a>
          <button className="hud-button hud-button--danger" type="button" onClick={onNodeDelete}>
            Delete card
          </button>
        </div>
      </aside>
    )
  }

  if (!selectedEdge) {
    return null
  }

  const edgeKind = selectedEdge.data?.kind ?? 'relates_to'
  const relationshipLabel = getEdgeDisplayLabel(edgeKind, selectedEdge.data?.label)
  const leftItem = leftLabel ?? selectedEdge.source
  const rightItem = rightLabel ?? selectedEdge.target

  return (
    <aside className="selection-panel">
      <p className="selection-panel__eyebrow">Relationship</p>
      <h2 className="selection-panel__heading">Left to Right</h2>

      <label className="field-group">
        <span>Built-in label</span>
        <select
          value={edgeKind}
          onChange={(event) => onEdgeKindChange(event.target.value as BoardEdgeKind)}
        >
          {EDGE_KIND_OPTIONS.map((kind) => (
            <option key={kind} value={kind}>
              {EDGE_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>

      <p className="selection-panel__helper">
        Read every edge from the left item to the right item. {EDGE_KIND_HELP[edgeKind]}
      </p>

      <label className="field-group">
        <span>Custom label</span>
        <input
          type="text"
          value={selectedEdge.data?.label ?? ''}
          onChange={(event) => onEdgeLabelChange(event.target.value)}
          placeholder="Optional override, still read left to right"
        />
      </label>

      <dl className="selection-panel__meta">
        <div className="selection-panel__meta-row">
          <dt>Left item</dt>
          <dd>{leftItem}</dd>
        </div>
        <div className="selection-panel__meta-row">
          <dt>Right item</dt>
          <dd>{rightItem}</dd>
        </div>
        <div className="selection-panel__meta-row">
          <dt>Reads as</dt>
          <dd>{`${leftItem} ${relationshipLabel} ${rightItem}`}</dd>
        </div>
      </dl>

      {!edgeReadsLeftToRight ? (
        <p className="selection-panel__warning">
          Move the left item before the right item so this relationship still reads left to right.
        </p>
      ) : null}

      <div className="selection-panel__actions">
        <button className="hud-button hud-button--danger" type="button" onClick={onEdgeDelete}>
          Delete relationship
        </button>
      </div>
    </aside>
  )
}
