import { useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { usePresenceStore } from '@/store/presenceStore'
import { useSession } from './BoardProvider'

/**
 * Connects the collaboration session to the UI stores:
 *  - connection status and undo/redo availability into the editor store
 *  - remote presence into the presence store
 *  - local user, selection and editing state out to other clients
 *  - pruning of selection when objects disappear (deleted remotely or undone)
 */
export function useCollabBindings(): void {
  const session = useSession()
  const board = session.controller

  // Connection status.
  useEffect(() => {
    const store = useEditorStore.getState()
    store.setConnection(session.getStatus())
    return session.onStatusChange((status) => useEditorStore.getState().setConnection(status))
  }, [session])

  // Undo / redo availability.
  useEffect(() => {
    const sync = () => useEditorStore.getState().setHistory(board.canUndo, board.canRedo)
    sync()
    return board.subscribeHistory(sync)
  }, [board])

  // Remote presence.
  useEffect(() => {
    const sync = () => usePresenceStore.getState().setRemoteUsers(session.getRemoteUsers())
    sync()
    const dispose = session.onPresenceChange(sync)
    return () => {
      dispose()
      usePresenceStore.getState().setRemoteUsers([])
    }
  }, [session])

  // Publish the local user (and keep it updated when the name changes).
  useEffect(() => {
    session.setLocalUser(useEditorStore.getState().user)
    let previous = useEditorStore.getState().user
    return useEditorStore.subscribe((state) => {
      if (state.user !== previous) {
        previous = state.user
        session.setLocalUser(state.user)
      }
    })
  }, [session])

  // Publish the local selection.
  useEffect(() => {
    session.setSelection(useEditorStore.getState().selectedIds)
    let previous = useEditorStore.getState().selectedIds
    return useEditorStore.subscribe((state) => {
      if (state.selectedIds !== previous) {
        previous = state.selectedIds
        session.setSelection(state.selectedIds)
      }
    })
  }, [session])

  // Drop selection / editing for objects that no longer exist.
  useEffect(() => {
    const prune = () => {
      const { byId } = board.getSnapshot()
      const state = useEditorStore.getState()
      const alive = state.selectedIds.filter((id) => byId.has(id))
      if (alive.length !== state.selectedIds.length) state.setSelection(alive)
      if (state.editingId && !byId.has(state.editingId)) state.setEditingId(null)
    }
    return board.subscribe(prune)
  }, [board])
}
