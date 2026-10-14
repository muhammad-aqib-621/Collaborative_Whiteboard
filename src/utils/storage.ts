const PREFIX = 'whiteboard:'

export function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function savePref(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private mode, quota). Preferences are optional.
  }
}

export interface RecentBoard {
  id: string
  title: string
  openedAt: number
}

export function loadRecentBoards(): RecentBoard[] {
  const list = loadPref<RecentBoard[]>('recent', [])
  if (!Array.isArray(list)) return []
  return list.filter(
    (b) => typeof b?.id === 'string' && typeof b?.title === 'string' && typeof b?.openedAt === 'number',
  )
}

export function rememberBoard(id: string, title: string): void {
  const others = loadRecentBoards().filter((b) => b.id !== id)
  savePref('recent', [{ id, title, openedAt: Date.now() }, ...others].slice(0, 12))
}

export function forgetBoard(id: string): void {
  savePref(
    'recent',
    loadRecentBoards().filter((b) => b.id !== id),
  )
}
