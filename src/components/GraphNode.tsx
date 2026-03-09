import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { KeyboardEvent, MouseEvent } from 'react'

import { formatNodeState } from '../constants'
import type { FlowBoardNode } from '../types'

export function GraphNode({ data, selected }: NodeProps<FlowBoardNode>) {
  const isViewer = data.mode === 'viewer'
  const nodeLabel = data.kind === 'issue' ? 'Issue' : 'PR'

  function openGitHubResource(event?: MouseEvent | KeyboardEvent) {
    event?.stopPropagation()
    window.open(data.githubUrl, '_blank', 'noopener,noreferrer')
  }

  function handleViewerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isViewer) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openGitHubResource(event)
    }
  }

  return (
    <div className={`nav-node nav-node--${data.kind} ${selected ? 'is-selected' : ''}`}>
      <Handle className="nav-node__handle nav-node__handle--top" type="target" position={Position.Top} />
      <Handle className="nav-node__handle nav-node__handle--left" type="target" position={Position.Left} />
      <Handle className="nav-node__handle nav-node__handle--bottom" type="source" position={Position.Bottom} />
      <Handle className="nav-node__handle nav-node__handle--right" type="source" position={Position.Right} />

      <div
        className={`nav-node__surface ${isViewer ? 'nav-node__surface--viewer' : ''}`}
        role={isViewer ? 'link' : undefined}
        tabIndex={isViewer ? 0 : undefined}
        onClick={isViewer ? openGitHubResource : undefined}
        onKeyDown={handleViewerKeyDown}
      >
        <div className="nav-node__header">
          <span className="nav-node__marker" aria-hidden="true" />
          <span className="nav-node__label">
            {nodeLabel} #{data.number}
          </span>
        </div>

        <div className="nav-node__title">{data.title.trim() || `Untitled ${nodeLabel}`}</div>

        <div className="nav-node__footer">
          <span className="nav-node__repo">{data.repoSlug}</span>
          {data.state ? <span className="nav-node__state">{formatNodeState(data.state)}</span> : null}
        </div>
      </div>
    </div>
  )
}
