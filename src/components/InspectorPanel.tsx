import { EDGE_KIND_LABELS, EDGE_KIND_OPTIONS, formatNodeState } from '../constants'
import type { BoardEdgeKind, BoardNodeState, FlowBoardEdge, FlowBoardNode } from '../types'

interface InspectorPanelProps {
  selectedNode: FlowBoardNode | undefined
  selectedEdge: FlowBoardEdge | undefined
  sourceLabel: string | null
  targetLabel: string | null
  onNodeTitleChange: (value: string) => void
  onNodeStateChange: (value: BoardNodeState | '') => void
  onNodeDelete: () => void
  onEdgeKindChange: (value: BoardEdgeKind) => void
  onEdgeLabelChange: (value: string) => void
  onEdgeDelete: () => void
}

export function InspectorPanel({
  selectedNode,
  selectedEdge,
  sourceLabel,
  targetLabel,
  onNodeTitleChange,
  onNodeStateChange,
  onNodeDelete,
  onEdgeKindChange,
  onEdgeLabelChange,
  onEdgeDelete,
}: InspectorPanelProps) {
  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="inspector-panel">
        <div className="inspector-panel__empty">
          <p className="inspector-panel__eyebrow">Inspector</p>
          <h2 className="inspector-panel__heading">Select a card or connection</h2>
          <p>Drag blocks, draw edges, then refine titles and relationship labels here.</p>
        </div>
      </aside>
    )
  }

  if (selectedNode) {
    const stateOptions: BoardNodeState[] =
      selectedNode.data.kind === 'issue' ? ['open', 'closed'] : ['draft', 'open', 'closed', 'merged']

    return (
      <aside className="inspector-panel">
        <p className="inspector-panel__eyebrow">Node</p>
        <h2 className="inspector-panel__heading">
          {selectedNode.data.kind === 'issue' ? 'Issue card' : 'PR card'}
        </h2>

        <label className="inspector-panel__field">
          <span>Title</span>
          <textarea
            rows={4}
            value={selectedNode.data.title}
            onChange={(event) => onNodeTitleChange(event.target.value)}
          />
        </label>

        <label className="inspector-panel__field">
          <span>Status</span>
          <select
            value={selectedNode.data.state ?? ''}
            onChange={(event) => onNodeStateChange(event.target.value as BoardNodeState | '')}
          >
            <option value="">Unset</option>
            {stateOptions.map((stateOption) => (
              <option key={stateOption} value={stateOption}>
                {formatNodeState(stateOption)}
              </option>
            ))}
          </select>
        </label>

        <dl className="inspector-panel__metadata">
          <div>
            <dt>Repository</dt>
            <dd>{selectedNode.data.repoSlug}</dd>
          </div>
          <div>
            <dt>Number</dt>
            <dd>#{selectedNode.data.number}</dd>
          </div>
        </dl>

        <a
          className="inspector-panel__link"
          href={selectedNode.data.githubUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open on GitHub
        </a>

        <button className="toolbar-button toolbar-button--danger" type="button" onClick={onNodeDelete}>
          Delete node
        </button>
      </aside>
    )
  }

  if (!selectedEdge) {
    return null
  }

  return (
    <aside className="inspector-panel">
      <p className="inspector-panel__eyebrow">Connection</p>
      <h2 className="inspector-panel__heading">Relationship edge</h2>

      <label className="inspector-panel__field">
        <span>Kind</span>
        <select
          value={selectedEdge.data?.kind ?? 'relates'}
          onChange={(event) => onEdgeKindChange(event.target.value as BoardEdgeKind)}
        >
          {EDGE_KIND_OPTIONS.map((kind) => (
            <option key={kind} value={kind}>
              {EDGE_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>

      <label className="inspector-panel__field">
        <span>Custom label</span>
        <input
          type="text"
          value={selectedEdge.data?.label ?? ''}
          onChange={(event) => onEdgeLabelChange(event.target.value)}
          placeholder="Optional edge label override"
        />
      </label>

      <dl className="inspector-panel__metadata">
        <div>
          <dt>Source</dt>
          <dd>{sourceLabel ?? selectedEdge.source}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{targetLabel ?? selectedEdge.target}</dd>
        </div>
      </dl>

      <button className="toolbar-button toolbar-button--danger" type="button" onClick={onEdgeDelete}>
        Delete edge
      </button>
    </aside>
  )
}
