import { describe, expect, it } from 'vitest'

import { getViewerRedirectPath, isViewerPath, normalizePathname, VIEWER_PATH } from './routing'

describe('normalizePathname', () => {
  it('keeps the root pathname stable', () => {
    expect(normalizePathname('/')).toBe('/')
  })

  it('removes a trailing slash from non-root paths', () => {
    expect(normalizePathname('/t3code-utkarsh/')).toBe('/t3code-utkarsh')
  })
})

describe('isViewerPath', () => {
  it('accepts the canonical viewer path', () => {
    expect(isViewerPath(VIEWER_PATH)).toBe(true)
  })

  it('accepts the canonical viewer path with a trailing slash', () => {
    expect(isViewerPath(`${VIEWER_PATH}/`)).toBe(true)
  })
})

describe('getViewerRedirectPath', () => {
  it('redirects viewer mode away from the root pathname', () => {
    expect(getViewerRedirectPath('/', 'viewer')).toBe(VIEWER_PATH)
  })

  it('does not redirect the canonical viewer pathname', () => {
    expect(getViewerRedirectPath(VIEWER_PATH, 'viewer')).toBeNull()
  })

  it('never redirects editor mode', () => {
    expect(getViewerRedirectPath('/', 'editor')).toBeNull()
  })
})
