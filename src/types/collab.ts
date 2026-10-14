import type { Point } from './board'

export interface LocalUser {
  id: string
  name: string
  color: string
}

/** The state each client publishes through Yjs awareness. */
export interface PresenceState {
  user: LocalUser
  /** Cursor position in world coordinates, or null when outside the canvas. */
  cursor: Point | null
  selection: string[]
}

export interface RemoteUser extends PresenceState {
  clientId: number
}

/**
 * - `local`: no network provider configured; tabs sync through BroadcastChannel.
 * - `connecting` / `connected` / `disconnected`: state of the network provider.
 */
export type ConnectionStatus = 'local' | 'connecting' | 'connected' | 'disconnected'
