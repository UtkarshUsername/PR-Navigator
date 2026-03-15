import { describe, expect, it } from 'vitest'

import {
  EDITOR_ARCHIVED_PATH,
  VIEWER_ARCHIVED_PATH,
  VIEWER_PATH,
  getBoardPath,
  getBoardView,
  getViewerRedirectPath,
  isViewerPath,
  normalizePathname,
} from './routing'

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

  it('accepts the archived viewer path', () => {
    expect(isViewerPath(VIEWER_ARCHIVED_PATH)).toBe(true)
  })
})

describe('getBoardPath', () => {
  it('builds the editor archived path', () => {
    expect(getBoardPath('editor', 'archived')).toBe(EDITOR_ARCHIVED_PATH)
  })

  it('builds the viewer archived path', () => {
    expect(getBoardPath('viewer', 'archived')).toBe(VIEWER_ARCHIVED_PATH)
  })
})

describe('getBoardView', () => {
  it('reads the editor archived path', () => {
    expect(getBoardView(EDITOR_ARCHIVED_PATH, 'editor')).toBe('archived')
  })

  it('reads the viewer archived path', () => {
    expect(getBoardView(VIEWER_ARCHIVED_PATH, 'viewer')).toBe('archived')
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
