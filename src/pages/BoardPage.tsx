import { useEffect, useState } from 'react'
import { BoardCanvas } from '@/canvas/BoardCanvas'
import { BoardProvider, useBoardTitle } from '@/collaboration/BoardProvider'
import { getDefaultProviders } from '@/collaboration/config'
import { createCollaboration, type CollaborationSession } from '@/collaboration/session'
import { useCollabBindings } from '@/collaboration/useCollabBindings'
import { EmptyState } from '@/components/EmptyState'
import { Minimap } from '@/components/Minimap'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import { ShortcutsDialog } from '@/components/ShortcutsDialog'
import { Toolbar } from '@/components/Toolbar'
import { TopBar } from '@/components/TopBar'
import { ZoomControls } from '@/components/ZoomControls'
import { useClipboard } from '@/hooks/useClipboard'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useEditorStore } from '@/store/editorStore'
import { rememberBoard } from '@/utils/storage'

interface BoardPageProps {
  roomId: string
  onHome: () => void
}

/** Owns the lifetime of one collaboration session for the board `roomId`. */
export function BoardPage({ roomId, onHome }: BoardPageProps) {
  const [session, setSession] = useState<CollaborationSession | null>(null)

  useEffect(() => {
    const editor = useEditorStore.getState()
    editor.setTool('select')
    editor.setSelection([])
    editor.setEditingId(null)
    editor.setDraft(null)
    editor.setMarquee(null)

    const created = createCollaboration(roomId, editor.user, getDefaultProviders())
    setSession(created)
    return () => {
      setSession(null)
      created.destroy()
    }
  }, [roomId])

  if (!session) return <div className="h-full w-full bg-canvas" />

  return (
    <BoardProvider session={session}>
      <Workspace roomId={roomId} onHome={onHome} />
    </BoardProvider>
  )
}

function Workspace({ roomId, onHome }: BoardPageProps) {
  useCollabBindings()
  useKeyboardShortcuts()
  useClipboard()

  const title = useBoardTitle()
  useEffect(() => {
    rememberBoard(roomId, title)
    document.title = `${title} · Collaborative Whiteboard`
    return () => {
      document.title = 'Collaborative Whiteboard'
    }
  }, [roomId, title])

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      <BoardCanvas />
      <EmptyState />
      <TopBar onHome={onHome} />
      <Toolbar />
      <PropertiesPanel />
      <ZoomControls />
      <Minimap />
      <ShortcutsDialog />
    </div>
  )
}
