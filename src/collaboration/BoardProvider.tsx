import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import type { BoardController, ObjectsSnapshot } from './boardController'
import type { CollaborationSession } from './session'

const SessionContext = createContext<CollaborationSession | null>(null)

export function BoardProvider({
  session,
  children,
}: {
  session: CollaborationSession
  children: ReactNode
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export function useSession(): CollaborationSession {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside <BoardProvider>')
  return session
}

export function useBoard(): BoardController {
  return useSession().controller
}

/** Subscribes to the immutable snapshot of all objects on the board. */
export function useBoardObjects(): ObjectsSnapshot {
  const board = useBoard()
  return useSyncExternalStore(board.subscribe, board.getSnapshot, board.getSnapshot)
}

export function useBoardTitle(): string {
  const board = useBoard()
  return useSyncExternalStore(board.subscribeTitle, board.getTitle, board.getTitle)
}
