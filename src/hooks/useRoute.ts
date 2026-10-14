import { useCallback, useEffect, useState } from 'react'
import { ROOM_ID_PATTERN } from '@/utils/names'

export type Route = { name: 'home' } | { name: 'board'; roomId: string }

export function boardPath(roomId: string): string {
  return `#/board/${roomId}`
}

function parseHash(hash: string): Route {
  const match = hash.match(/^#\/board\/([^/?#]+)/)
  const roomId = match?.[1]
  if (roomId && ROOM_ID_PATTERN.test(roomId)) return { name: 'board', roomId }
  return { name: 'home' }
}

/** Minimal hash router: `#/` is the home page, `#/board/<id>` opens a board. */
export function useRoute(): { route: Route; navigate: (hash: string) => void } {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((hash: string) => {
    window.location.hash = hash
  }, [])

  return { route, navigate }
}
