import { Handle, Position, type NodeProps } from '@xyflow/react'

import { formatNodeState, getNodeStateBadgeTone } from '../constants'
import type { FlowBoardNode } from '../types'

export function GraphNode({ data, selected }: NodeProps<FlowBoardNode>) {
  const nodeLabel = data.kind === 'issue' ? 'Issue' : 'PR'
  const ownedClassName = data.isOwnedByMe ? 'nav-node--owned' : ''
  const stateBadgeTone = getNodeStateBadgeTone(data.kind, data.state)

  return (
    <div className={`nav-node nav-node--${data.kind} ${ownedClassName} ${selected ? 'is-selected' : ''}`}>
      <Handle className="nav-node__handle nav-node__handle--left" type="target" position={Position.Left} />
      <Handle className="nav-node__handle nav-node__handle--right" type="source" position={Position.Right} />

      <div className={`nav-node__surface ${data.mode === 'viewer' ? 'nav-node__surface--viewer' : ''}`}>
        <div className="nav-node__header">
          <div className="nav-node__identity">
            <svg
              className="nav-node__gh-icon"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.64 7.64 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span className="nav-node__label">
              {nodeLabel} #{data.number}
            </span>
          </div>
          {data.state && stateBadgeTone ? (
            <span className={`status-badge status-badge--compact status-badge--${stateBadgeTone}`}>
              {formatNodeState(data.state)}
            </span>
          ) : null}
        </div>

        <div className="nav-node__title">{data.title.trim() || `Untitled ${nodeLabel}`}</div>
      </div>
    </div>
  )
}
