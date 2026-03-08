import {
  APP_NAME,
  formatNodeState,
  ISSUE_STATE_OPTIONS,
  NODE_KIND_LABELS,
  PR_STATE_OPTIONS,
} from '../constants'
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
}: ToolbarProps) {
  const isEditor = mode === 'editor'
  const composerStateOptions = composerKind === 'issue' ? ISSUE_STATE_OPTIONS : PR_STATE_OPTIONS

  return (
    <header className="app-toolbar">
      <div className="app-toolbar__title-block">
        <span className="app-toolbar__kicker">{APP_NAME}</span>
        {isEditor ? (
          <label className="app-toolbar__title-label">
            <span className="sr-only">Board title</span>
            <input
              className="app-toolbar__title-input"
              type="text"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Board title"
            />
          </label>
        ) : (
          <h1 className="app-toolbar__title">{title}</h1>
        )}
      </div>

      <div className="app-toolbar__meta-block">
        <div className="app-toolbar__meta-row">
          <span className={`mode-pill mode-pill--${mode}`}>{mode}</span>
          <span className="app-toolbar__timestamp">Updated {updatedAt}</span>
        </div>

        {statusMessage ? <p className="app-toolbar__status">{statusMessage}</p> : null}
      </div>

      {isEditor ? (
        <div className="app-toolbar__actions">
          <button className="toolbar-button" type="button" onClick={() => onOpenComposer('issue')}>
            Add Issue
          </button>
          <button className="toolbar-button" type="button" onClick={() => onOpenComposer('pr')}>
            Add PR
          </button>
          <button className="toolbar-button toolbar-button--ghost" type="button" onClick={onImportClick}>
            Import JSON
          </button>
          <button className="toolbar-button toolbar-button--ghost" type="button" onClick={onExportClick}>
            Export JSON
          </button>
          <button
            className="toolbar-button toolbar-button--ghost"
            type="button"
            onClick={onClearDraftClick}
            disabled={!draftAvailable}
          >
            Clear Draft
          </button>
        </div>
      ) : null}

      {isEditor && composerKind ? (
        <div className="composer-card">
          <div className="composer-card__header">
            <h2 className="composer-card__title">New {NODE_KIND_LABELS[composerKind]}</h2>
            <button className="composer-card__dismiss" type="button" onClick={onCloseComposer}>
              Close
            </button>
          </div>

          <label className="composer-card__field">
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

          <label className="composer-card__field">
            <span>Title</span>
            <input
              type="text"
              value={composerTitle}
              onChange={(event) => onComposerTitleChange(event.target.value)}
              placeholder="Manual title for the card"
            />
          </label>

          <label className="composer-card__field">
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

          {composerError ? <p className="composer-card__error">{composerError}</p> : null}

          <div className="composer-card__actions">
            <button className="toolbar-button" type="button" onClick={onComposerSubmit}>
              Create Node
            </button>
            <button className="toolbar-button toolbar-button--ghost" type="button" onClick={onCloseComposer}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </header>
  )
}
