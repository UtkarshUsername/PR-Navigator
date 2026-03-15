import type { AppMode, BoardView } from '../types'

export const VIEWER_PATH = '/t3code-utkarsh'
export const ARCHIVED_PATH_SEGMENT = 'archived'
export const EDITOR_ARCHIVED_PATH = `/${ARCHIVED_PATH_SEGMENT}`
export const VIEWER_ARCHIVED_PATH = `${VIEWER_PATH}/${ARCHIVED_PATH_SEGMENT}`

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export function isViewerPath(pathname: string): boolean {
  const normalizedPath = normalizePathname(pathname)
  return normalizedPath === VIEWER_PATH || normalizedPath === VIEWER_ARCHIVED_PATH
}

export function getBoardPath(mode: AppMode, boardView: BoardView): string {
  if (mode === 'viewer') {
    return boardView === 'archived' ? VIEWER_ARCHIVED_PATH : VIEWER_PATH
  }

  return boardView === 'archived' ? EDITOR_ARCHIVED_PATH : '/'
}

export function getBoardView(pathname: string, mode: AppMode): BoardView {
  const normalizedPath = normalizePathname(pathname)

  if (mode === 'viewer') {
    return normalizedPath === VIEWER_ARCHIVED_PATH ? 'archived' : 'current'
  }

  return normalizedPath === EDITOR_ARCHIVED_PATH ? 'archived' : 'current'
}

export function getViewerRedirectPath(pathname: string, mode: AppMode): string | null {
  if (mode !== 'viewer') {
    return null
  }

  return isViewerPath(pathname) ? null : VIEWER_PATH
}
