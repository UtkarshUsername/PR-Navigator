import { useEffect, useRef, useState } from 'react'

const REPOS = [
  { slug: 'pingdotgg/t3code', label: 'pingdotgg/t3code', icon: '/t3code-icon.png' },
]

interface RepoSelectorProps {
  selectedRepo: string
  onRepoChange: (repo: string) => void
}

export function RepoSelector({ selectedRepo, onRepoChange }: RepoSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeRepo = REPOS.find((r) => r.slug === selectedRepo)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="repo-selector" ref={ref}>
      {open && (
        <ul className="repo-selector__menu">
          <li>
            <span className="repo-selector__option repo-selector__option--locked">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4 7V5a4 4 0 1 1 8 0v2h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1zm2 0h4V5a2 2 0 1 0-4 0v2z" />
              </svg>
              Locked
            </span>
          </li>
          {REPOS.map((repo) => (
            <li key={repo.slug}>
              <button
                className={`repo-selector__option ${repo.slug === selectedRepo ? 'repo-selector__option--active' : ''}`}
                type="button"
                onClick={() => {
                  onRepoChange(repo.slug)
                  setOpen(false)
                }}
              >
                {repo.icon && (
                  <img className="repo-selector__icon" src={repo.icon} alt="" width="14" height="14" />
                )}
                {repo.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="repo-selector__trigger" type="button" onClick={() => setOpen(!open)}>
        {activeRepo?.icon && (
          <img className="repo-selector__icon" src={activeRepo.icon} alt="" width="16" height="16" />
        )}
        <span className="repo-selector__label">{selectedRepo}</span>
        <svg
          className={`repo-selector__chevron ${open ? 'repo-selector__chevron--open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M4.427 10.573a.75.75 0 0 1 0-1.06L8 5.94l3.573 3.573a.75.75 0 1 1-1.06 1.06L8 8.06l-2.513 2.513a.75.75 0 0 1-1.06 0z" />
        </svg>
      </button>
    </div>
  )
}
