import { formatNodeState, getNodeStateBadgeTone, NODE_KIND_LABELS } from '../constants'
import type { GitHubAuthoredItem } from '../types'

interface AuthoredItemsSidebarProps {
  authoredItems: GitHubAuthoredItem[]
  isLoading: boolean
  itemIdsOnBoard: ReadonlySet<string>
  loadError: string | null
  onAddItem: (item: GitHubAuthoredItem) => void
  onRefresh: () => void
}

export function AuthoredItemsSidebar({
  authoredItems,
  isLoading,
  itemIdsOnBoard,
  loadError,
  onAddItem,
  onRefresh,
}: AuthoredItemsSidebarProps) {
  return (
    <aside className="authored-sidebar" aria-label="Your authored GitHub items">
      <div className="authored-sidebar__header">
        <h2 className="authored-sidebar__title">Opened by you</h2>
        <button className="hud-button" type="button" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </button>
      </div>

      {loadError ? <p className="composer-sheet__error">{loadError}</p> : null}

      {isLoading ? <p className="authored-sidebar__empty">Loading your authored items...</p> : null}

      {!isLoading && !loadError && authoredItems.length === 0 ? (
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
