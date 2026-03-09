import { formatNodeState, ISSUE_STATE_OPTIONS, NODE_KIND_LABELS, PR_STATE_OPTIONS } from '../constants'
import type { BoardNodeKind, BoardNodeState } from '../types'

interface AddCardModalProps {
  composerKind: BoardNodeKind
  composerNumber: string
  composerTitle: string
  composerState: BoardNodeState | ''
  composerError: string | null
  selectedRepo: string
  onKindChange: (kind: BoardNodeKind) => void
  onNumberChange: (value: string) => void
  onTitleChange: (value: string) => void
  onStateChange: (value: BoardNodeState | '') => void
  onSubmit: () => void
  onClose: () => void
}

export function AddCardModal({
  composerKind,
  composerNumber,
  composerTitle,
  composerState,
  composerError,
  selectedRepo,
  onKindChange,
  onNumberChange,
  onTitleChange,
  onStateChange,
  onSubmit,
  onClose,
}: AddCardModalProps) {
  const stateOptions = composerKind === 'issue' ? ISSUE_STATE_OPTIONS : PR_STATE_OPTIONS

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add {NODE_KIND_LABELS[composerKind]}</h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-kind-toggle">
            <button
              className={`kind-btn ${composerKind === 'issue' ? 'kind-btn--active' : ''}`}
              type="button"
              onClick={() => onKindChange('issue')}
            >
              Issue
            </button>
            <button
              className={`kind-btn ${composerKind === 'pr' ? 'kind-btn--active' : ''}`}
              type="button"
              onClick={() => onKindChange('pr')}
            >
              PR
            </button>
          </div>

          <label className="field-group">
            <span>{composerKind === 'issue' ? 'Issue' : 'PR'} # — {selectedRepo}</span>
            <input
              type="text"
              inputMode="numeric"
              value={composerNumber}
              onChange={(e) => onNumberChange(e.target.value)}
              placeholder="123"
            />
          </label>

          <label className="field-group">
            <span>Title</span>
            <input
              type="text"
              value={composerTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Card title"
            />
          </label>

          <label className="field-group">
            <span>Status</span>
            <select
              value={composerState}
              onChange={(e) => onStateChange(e.target.value as BoardNodeState | '')}
            >
              <option value="">Unset</option>
              {stateOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {formatNodeState(opt)}
                </option>
              ))}
            </select>
          </label>

          {composerError ? <p className="composer-sheet__error">{composerError}</p> : null}
        </div>

        <div className="modal-footer">
          <button className="hud-button hud-button--primary" type="button" onClick={onSubmit}>
            Create
          </button>
          <button className="hud-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
