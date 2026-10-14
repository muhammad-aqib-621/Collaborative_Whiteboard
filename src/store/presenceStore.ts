import { create } from 'zustand'
import type { RemoteUser } from '@/types/collab'

interface PresenceState {
  remoteUsers: RemoteUser[]
  setRemoteUsers: (users: RemoteUser[]) => void
}

/** Other people currently on the board, mirrored from Yjs awareness. */
export const usePresenceStore = create<PresenceState>()((set) => ({
  remoteUsers: [],
  setRemoteUsers: (remoteUsers) => set({ remoteUsers }),
}))
