import { describe, expect, it } from 'vitest'

import { isThemePreference, resolveThemePreference } from './theme'

describe('isThemePreference', () => {
  it('accepts the supported theme values', () => {
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
  })

  it('rejects unsupported theme values', () => {
    expect(isThemePreference('sepia')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
  })
})

describe('resolveThemePreference', () => {
  it('follows the system preference when set to system', () => {
    expect(resolveThemePreference('system', false)).toBe('light')
    expect(resolveThemePreference('system', true)).toBe('dark')
  })

  it('respects explicit light and dark preferences', () => {
    expect(resolveThemePreference('light', true)).toBe('light')
    expect(resolveThemePreference('dark', false)).toBe('dark')
  })
})
