import type { ResolvedTheme, ThemePreference } from '../types'

interface ThemeToggleProps {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  onPreferenceChange: (preference: ThemePreference) => void
}

const THEME_OPTIONS: Array<{
  value: ThemePreference
  label: string
  ariaLabel: string
  icon: React.ReactNode
}> = [
  {
    value: 'system',
    label: 'Auto',
    ariaLabel: 'Use the system theme',
    icon: (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <rect x="2.25" y="2.75" width="11.5" height="8.5" rx="1.5" />
        <path d="M6.25 13.25h3.5M8 11.25v2" />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'Light',
    ariaLabel: 'Use the light theme',
    icon: (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <circle cx="8" cy="8" r="2.75" />
        <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.45 1.45M11.15 11.15l1.45 1.45M12.6 3.4l-1.45 1.45M4.85 11.15L3.4 12.6" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    ariaLabel: 'Use the dark theme',
    icon: (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M10.5 1.5a5.83 5.83 0 0 0-.68 8.55 5.92 5.92 0 0 0 4.18 1.73 6 6 0 1 1-3.5-10.28Z" />
      </svg>
    ),
  },
]

export function ThemeToggle({
  preference,
  resolvedTheme,
  onPreferenceChange,
}: ThemeToggleProps) {
  const resolvedThemeLabel =
    resolvedTheme.charAt(0).toUpperCase() + resolvedTheme.slice(1)
  const currentLabel =
    preference === 'system' ? `System · ${resolvedThemeLabel}` : resolvedThemeLabel

  return (
    <div className="theme-toggle">
      <div className="theme-toggle__meta">
        <span className="theme-toggle__eyebrow">Theme</span>
        <span className="theme-toggle__value">{currentLabel}</span>
      </div>

      <div className="theme-toggle__group" role="group" aria-label="Color theme">
        {THEME_OPTIONS.map((option) => {
          const isActive = option.value === preference

          return (
            <button
              key={option.value}
              className={`theme-toggle__button ${isActive ? 'theme-toggle__button--active' : ''}`}
              type="button"
              aria-label={option.ariaLabel}
              aria-pressed={isActive}
              onClick={() => onPreferenceChange(option.value)}
            >
              <span className="theme-toggle__icon">{option.icon}</span>
              <span className="theme-toggle__button-label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
