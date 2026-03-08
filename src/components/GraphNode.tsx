import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { KeyboardEvent, MouseEvent } from 'react'

import { formatNodeState, NODE_KIND_LABELS } from '../constants'
import type { FlowBoardNode } from '../types'

export function GraphNode({ data, selected }: NodeProps<FlowBoardNode>) {
  const isViewer = data.mode === 'viewer'

  function openGitHubIssue(event?: MouseEvent | KeyboardEvent) {
    event?.stopPropagation()
    window.open(data.githubUrl, '_blank', 'noopener,noreferrer')
  }

  function handleViewerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isViewer) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openGitHubIssue(event)
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
        onClick={isViewer ? openGitHubIssue : undefined}
        onKeyDown={handleViewerKeyDown}
      >
        <div className="nav-node__eyebrow">
          <span className="nav-node__kind">{NODE_KIND_LABELS[data.kind]}</span>
          {data.state ? <span className="nav-node__state">{formatNodeState(data.state)}</span> : null}
        </div>

        <div className="nav-node__title">{data.title.trim() || `Untitled ${NODE_KIND_LABELS[data.kind]}`}</div>

        <div className="nav-node__meta">
          <span className="nav-node__slug">{data.repoSlug}</span>
          <span className="nav-node__number">#{data.number}</span>
        </div>

        <button className="nav-node__open nodrag nopan" type="button" onClick={openGitHubIssue}>
          Open
        </button>
      </div>
    </div>
  )
}
