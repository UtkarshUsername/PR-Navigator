import type { BoardData } from '../types'
import { parseBoardData, safeParseBoardData, serializeBoardData } from './board'

export async function fetchBoardData(boardDataPath: string): Promise<BoardData> {
  const response = await fetch(resolveBoardDataUrl(boardDataPath), {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Unable to load board data (${response.status}).`)
  }

  return parseBoardData(await response.json())
}

export function resolveBoardDataUrl(boardDataPath: string): string {
  const normalizedPath = (boardDataPath || '/board.json').trim()
  const relativePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin)

  return new URL(relativePath, baseUrl).toString()
}

export function loadDraftFromStorage(storageKey: string): BoardData | null {
  const raw = window.localStorage.getItem(storageKey)

  if (!raw) {
    return null
  }

  const parsed = safeParseBoardData(JSON.parse(raw))
  return parsed.success ? parsed.data : null
}

export function saveDraftToStorage(storageKey: string, board: BoardData): void {
  window.localStorage.setItem(storageKey, serializeBoardData(board))
}

export function clearDraftFromStorage(storageKey: string): void {
  window.localStorage.removeItem(storageKey)
}

export async function readBoardFile(file: File): Promise<BoardData> {
  const text = await file.text()
  return parseBoardData(JSON.parse(text))
}

export function downloadBoardFile(board: BoardData): void {
  const blob = new Blob([serializeBoardData(board)], {
    type: 'application/json',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'board.json'
  link.click()

  window.URL.revokeObjectURL(url)
}

export async function publishBoardData(board: BoardData): Promise<void> {
  const response = await fetch('/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: serializeBoardData(board),
  })

  if (!response.ok) {
    throw new Error('Publish failed.')
  }
}
