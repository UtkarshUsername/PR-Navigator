import type { AppMode } from '../types'

export const VIEWER_PATH = '/t3code-utkarsh'

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export function isViewerPath(pathname: string): boolean {
  return normalizePathname(pathname) === VIEWER_PATH
}

export function getViewerRedirectPath(pathname: string, mode: AppMode): string | null {
  if (mode !== 'viewer') {
    return null
  }

  return isViewerPath(pathname) ? null : VIEWER_PATH
}
