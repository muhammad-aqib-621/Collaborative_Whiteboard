import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'
import type { ConnectionStatus } from '@/types/collab'
import { BroadcastChannelProvider } from './BroadcastChannelProvider'

export interface ProviderContext {
  doc: Y.Doc
  awareness: Awareness
  roomId: string
}

/** A running transport attached to the shared document. */
export interface ProviderHandle {
  name: string
  destroy(): void
  /**
   * Network transports report their connection state. Handles without
   * `onStatus` (local-only transports) do not affect the status indicator.
   */
  onStatus?(listener: (status: ConnectionStatus) => void): () => void
}

/**
 * A provider factory attaches one transport to a document. To use a different
 * backend (y-webrtc, Hocuspocus, Liveblocks, ...) write a factory that returns
 * a handle and pass it to `createCollaboration`.
 */
export type ProviderFactory = (context: ProviderContext) => ProviderHandle

/** Syncs tabs of the same browser through BroadcastChannel. No server needed. */
export const broadcastChannelProvider: ProviderFactory = ({ doc, awareness, roomId }) => {
  if (typeof BroadcastChannel === 'undefined') {
    return { name: 'broadcast-channel', destroy() {} }
  }
  const provider = new BroadcastChannelProvider(doc, awareness, roomId)
  return { name: 'broadcast-channel', destroy: () => provider.destroy() }
}

/** Persists the board in IndexedDB so it survives reloads and works offline. */
export const indexedDbProvider: ProviderFactory = ({ doc, roomId }) => {
  if (typeof indexedDB === 'undefined') {
    return { name: 'indexeddb', destroy() {} }
  }
  const persistence = new IndexeddbPersistence(`collaborative-whiteboard:${roomId}`, doc)
  return {
    name: 'indexeddb',
    destroy: () => {
      void persistence.destroy()
    },
  }
}

/** Syncs through a y-websocket compatible server (see `server/index.mjs`). */
export function websocketProvider(serverUrl: string): ProviderFactory {
  return ({ doc, awareness, roomId }) => {
    const provider = new WebsocketProvider(serverUrl, roomId, doc, {
      awareness,
      // Cross-tab sync is already handled by the BroadcastChannel provider.
      disableBc: true,
    })

    let status: ConnectionStatus = 'connecting'
    const listeners = new Set<(status: ConnectionStatus) => void>()
    const emit = (next: ConnectionStatus) => {
      status = next
      listeners.forEach((l) => l(next))
    }
    provider.on('status', (event: { status: string }) => {
      if (event.status === 'connected') emit('connected')
      else if (event.status === 'connecting') emit('connecting')
      else emit('disconnected')
    })

    return {
      name: 'websocket',
      destroy: () => provider.destroy(),
      onStatus(listener) {
        listeners.add(listener)
        listener(status)
        return () => {
          listeners.delete(listener)
        }
      },
    }
  }
}
