import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { LocalUser, PresenceState, RemoteUser, ConnectionStatus } from '@/types/collab'
import type { Point } from '@/types/board'
import { BoardController } from './boardController'
import type { ProviderFactory, ProviderHandle } from './providers'

/**
 * One open board: the shared document, its awareness (presence) channel and
 * the transports that connect them to other clients.
 */
export class CollaborationSession {
  readonly roomId: string
  readonly doc: Y.Doc
  readonly awareness: Awareness
  readonly controller: BoardController

  private readonly handles: ProviderHandle[] = []
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()
  private readonly statusDisposers: Array<() => void> = []
  private status: ConnectionStatus = 'local'

  constructor(roomId: string, user: LocalUser, factories: readonly ProviderFactory[]) {
    this.roomId = roomId
    this.doc = new Y.Doc()
    this.awareness = new Awareness(this.doc)
    this.controller = new BoardController(this.doc)

    const initial: PresenceState = { user, cursor: null, selection: [] }
    this.awareness.setLocalState(initial)

    for (const factory of factories) {
      const handle = factory({ doc: this.doc, awareness: this.awareness, roomId })
      this.handles.push(handle)
      if (handle.onStatus) {
        this.statusDisposers.push(handle.onStatus((next) => this.setStatus(next)))
      }
    }
  }

  private setStatus(next: ConnectionStatus) {
    if (this.status === next) return
    this.status = next
    this.statusListeners.forEach((l) => l(next))
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  // ---------------------------------------------------------------- presence

  setLocalUser(user: LocalUser) {
    this.awareness.setLocalStateField('user', user)
  }

  setCursor(cursor: Point | null) {
    this.awareness.setLocalStateField('cursor', cursor)
  }

  setSelection(selection: string[]) {
    this.awareness.setLocalStateField('selection', selection)
  }

  getRemoteUsers(): RemoteUser[] {
    const users: RemoteUser[] = []
    this.awareness.getStates().forEach((state, clientId) => {
      if (clientId === this.doc.clientID) return
      const presence = state as Partial<PresenceState>
      if (!presence.user) return
      users.push({
        clientId,
        user: presence.user,
        cursor: presence.cursor ?? null,
        selection: Array.isArray(presence.selection) ? presence.selection : [],
      })
    })
    return users.sort((a, b) => a.clientId - b.clientId)
  }

  onPresenceChange(listener: () => void): () => void {
    this.awareness.on('change', listener)
    return () => this.awareness.off('change', listener)
  }

  // ---------------------------------------------------------------- lifecycle

  destroy() {
    this.statusDisposers.forEach((dispose) => dispose())
    this.handles.forEach((handle) => handle.destroy())
    this.awareness.destroy()
    this.controller.destroy()
    this.doc.destroy()
  }
}

export function createCollaboration(
  roomId: string,
  user: LocalUser,
  factories: readonly ProviderFactory[],
): CollaborationSession {
  return new CollaborationSession(roomId, user, factories)
}
