import { formatNodeState, getNodeStateBadgeTone, NODE_KIND_LABELS } from '../constants'
import type { GitHubAuthoredItem } from '../types'

interface AuthoredItemsSidebarProps {
  authoredItems: GitHubAuthoredItem[]
  githubUsernameInput: string
  isLoading: boolean
  itemIdsOnBoard: ReadonlySet<string>
  loadError: string | null
  selectedRepo: string
  onAddItem: (item: GitHubAuthoredItem) => void
  onGitHubUsernameInputChange: (value: string) => void
  onRefresh: () => void
}

export function AuthoredItemsSidebar({
  authoredItems,
  githubUsernameInput,
  isLoading,
  itemIdsOnBoard,
  loadError,
  selectedRepo,
  onAddItem,
  onGitHubUsernameInputChange,
  onRefresh,
}: AuthoredItemsSidebarProps) {
  const trimmedUsername = githubUsernameInput.trim()
  const issueCount = authoredItems.filter((item) => item.kind === 'issue').length
  const prCount = authoredItems.length - issueCount

  return (
    <aside className="authored-sidebar" aria-label="Your authored GitHub items">
      <div className="authored-sidebar__header">
        <div>
          <p className="authored-sidebar__eyebrow">GitHub intake</p>
          <h2 className="authored-sidebar__title">Opened by you</h2>
        </div>
        <button
          className="hud-button"
          type="button"
          onClick={onRefresh}
          disabled={!trimmedUsername || isLoading}
        >
          Refresh
        </button>
      </div>

      <div className="authored-sidebar__controls">
        <label className="field-group">
          <span>GitHub username</span>
          <input
            type="text"
            value={githubUsernameInput}
            onChange={(event) => onGitHubUsernameInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onRefresh()
              }
            }}
            placeholder="octocat"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>

        <p className="authored-sidebar__summary">
          {trimmedUsername
            ? `Showing authored items in ${selectedRepo}`
            : 'Enter your GitHub username to load authored issues and PRs.'}
        </p>

        {trimmedUsername && !loadError && !isLoading ? (
          <p className="authored-sidebar__counts">
            {issueCount} issues / {prCount} PRs
          </p>
        ) : null}
      </div>

      {loadError ? <p className="composer-sheet__error">{loadError}</p> : null}

      {isLoading ? <p className="authored-sidebar__empty">Loading your authored items...</p> : null}

      {!isLoading && !loadError && trimmedUsername && authoredItems.length === 0 ? (
        <p className="authored-sidebar__empty">No authored issues or PRs found in this repo.</p>
      ) : null}

      <div className="authored-sidebar__list">
        {authoredItems.map((item) => {
          const stateBadgeTone = getNodeStateBadgeTone(item.kind, item.state)
          const isOnBoard = itemIdsOnBoard.has(item.id)

          return (
            <article key={item.id} className="authored-item">
              <div className="authored-item__meta">
                <span>{NODE_KIND_LABELS[item.kind]} #{item.number}</span>
                {stateBadgeTone ? (
                  <span className={`status-badge status-badge--compact status-badge--${stateBadgeTone}`}>
                    {formatNodeState(item.state)}
                  </span>
                ) : (
                  <span>{formatNodeState(item.state)}</span>
                )}
              </div>

              <h3 className="authored-item__title">{item.title}</h3>

              <p className="authored-item__updated">Updated {formatUpdatedAt(item.updatedAt)}</p>

              <div className="authored-item__actions">
                <a className="hud-button" href={item.githubUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button
                  className="hud-button hud-button--primary"
                  type="button"
                  onClick={() => onAddItem(item)}
                  disabled={isOnBoard}
                >
                  {isOnBoard ? 'On board' : 'Add to board'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </aside>
  )
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'recently'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
