import type { ResolvedTheme, ThemePreference } from '../types'

const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }

  return preference
}

export function loadThemePreference(storageKey: string): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const storedPreference = window.localStorage.getItem(storageKey)
  return isThemePreference(storedPreference) ? storedPreference : 'system'
}

export function saveThemePreference(
  storageKey: string,
  preference: ThemePreference,
): void {
  if (typeof window === 'undefined') {
    return
  }

  if (preference === 'system') {
    window.localStorage.removeItem(storageKey)
    return
  }

  window.localStorage.setItem(storageKey, preference)
}

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches
}

export function subscribeToSystemThemePreference(
  onChange: (prefersDark: boolean) => void,
): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
  const handleChange = (event: MediaQueryListEvent) => {
    onChange(event.matches)
  }

  onChange(mediaQuery.matches)
  mediaQuery.addEventListener('change', handleChange)

  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
}

export function applyThemePreferenceToDocument(preference: ThemePreference): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  if (preference === 'system') {
    root.removeAttribute('data-theme')
    return
  }

  root.dataset.theme = preference
}
