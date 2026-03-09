import { formatNodeState, ISSUE_STATE_OPTIONS, NODE_KIND_LABELS, PR_STATE_OPTIONS } from '../constants'
import type { AppMode, BoardNodeKind, BoardNodeState } from '../types'

interface ToolbarProps {
  mode: AppMode
  title: string
  updatedAt: string
  composerKind: BoardNodeKind | null
  composerUrl: string
  composerTitle: string
  composerState: BoardNodeState | ''
  composerError: string | null
  draftAvailable: boolean
  statusMessage: string | null
  nodeCount: number
  edgeCount: number
  isDirty: boolean
  onTitleChange: (value: string) => void
  onOpenComposer: (kind: BoardNodeKind) => void
  onCloseComposer: () => void
  onComposerUrlChange: (value: string) => void
  onComposerTitleChange: (value: string) => void
  onComposerStateChange: (value: BoardNodeState | '') => void
  onComposerSubmit: () => void
  onImportClick: () => void
  onExportClick: () => void
  onClearDraftClick: () => void
  onFocusBoard: () => void
}

export function Toolbar({
  mode,
  title,
  updatedAt,
  composerKind,
  composerUrl,
  composerTitle,
  composerState,
  composerError,
  draftAvailable,
  statusMessage,
  nodeCount,
  edgeCount,
  isDirty,
  onTitleChange,
  onOpenComposer,
  onCloseComposer,
  onComposerUrlChange,
  onComposerTitleChange,
  onComposerStateChange,
  onComposerSubmit,
  onImportClick,
  onExportClick,
  onClearDraftClick,
  onFocusBoard,
}: ToolbarProps) {
  const composerStateOptions = composerKind === 'issue' ? ISSUE_STATE_OPTIONS : PR_STATE_OPTIONS

  return (
    <header className="command-panel">
      <div className="command-panel__masthead">
        <p className="command-panel__eyebrow">Board {mode}</p>
        <label className="command-panel__title-wrap">
          <span className="sr-only">Board title</span>
          <input
            className="command-panel__title-input"
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Board title"
          />
        </label>
        <p className="command-panel__meta">
          {nodeCount} cards · {edgeCount} links · {isDirty ? 'editing local draft' : 'published state'} ·{' '}
          {updatedAt}
        </p>
      </div>

      <div className="command-panel__actions">
        <button
          className={`hud-button ${composerKind === 'issue' ? 'is-active' : ''}`}
          type="button"
          onClick={() => onOpenComposer('issue')}
        >
          Add issue
        </button>
        <button
          className={`hud-button ${composerKind === 'pr' ? 'is-active' : ''}`}
          type="button"
          onClick={() => onOpenComposer('pr')}
        >
          Add PR
        </button>
        <button className="hud-button" type="button" onClick={onImportClick}>
          Import
        </button>
        <button className="hud-button" type="button" onClick={onExportClick}>
          Export
        </button>
        <button className="hud-button" type="button" onClick={onFocusBoard}>
          Center
        </button>
        <button
          className="hud-button"
          type="button"
          onClick={onClearDraftClick}
          disabled={!draftAvailable}
        >
          Clear draft
        </button>
      </div>

      {statusMessage ? <p className="command-panel__status">{statusMessage}</p> : null}

      {composerKind ? (
        <div className="composer-sheet">
          <div className="composer-sheet__header">
            <div>
              <p className="composer-sheet__eyebrow">New card</p>
              <h2 className="composer-sheet__title">{NODE_KIND_LABELS[composerKind]}</h2>
            </div>
            <button className="hud-button" type="button" onClick={onCloseComposer}>
              Close
            </button>
          </div>

          <label className="field-group">
            <span>GitHub URL</span>
            <input
              type="url"
              value={composerUrl}
              onChange={(event) => onComposerUrlChange(event.target.value)}
              placeholder={
                composerKind === 'issue'
                  ? 'https://github.com/owner/repo/issues/123'
                  : 'https://github.com/owner/repo/pull/456'
              }
            />
          </label>

          <label className="field-group">
            <span>Title</span>
            <input
              type="text"
              value={composerTitle}
              onChange={(event) => onComposerTitleChange(event.target.value)}
              placeholder="Short card title"
            />
          </label>

          <label className="field-group">
            <span>Status</span>
            <select
              value={composerState}
              onChange={(event) => onComposerStateChange(event.target.value as BoardNodeState | '')}
            >
              <option value="">Unset</option>
              {composerStateOptions.map((stateOption) => (
                <option key={stateOption} value={stateOption}>
                  {formatNodeState(stateOption)}
                </option>
              ))}
            </select>
          </label>

          {composerError ? <p className="composer-sheet__error">{composerError}</p> : null}

          <div className="composer-sheet__actions">
            <button className="hud-button hud-button--primary" type="button" onClick={onComposerSubmit}>
              Create card
            </button>
            <button className="hud-button" type="button" onClick={onCloseComposer}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </header>
  )
}
