import { Map as MapIcon, Maximize, Minus, Plus } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { zoomBy, zoomTo } from '@/canvas/viewport'
import { useBoardActions } from '@/hooks/useBoardActions'
import { IconButton } from './ui/IconButton'

export function ZoomControls() {
  const zoom = useEditorStore((s) => s.viewport.zoom)
  const minimapVisible = useEditorStore((s) => s.minimapVisible)
  const setMinimapVisible = useEditorStore((s) => s.setMinimapVisible)
  const actions = useBoardActions()

  return (
    <div
      role="group"
      aria-label="Zoom"
      className="panel absolute bottom-[4.5rem] left-2 z-20 flex items-center gap-0.5 p-1 md:bottom-3 md:left-3"
    >
      <IconButton label="Zoom out" shortcut="−" onClick={() => zoomBy(0.8)}>
        <Minus size={16} />
      </IconButton>
      <button
        type="button"
        onClick={() => zoomTo(1)}
        title="Reset zoom to 100%"
        aria-label={`Zoom ${Math.round(zoom * 100)}%. Reset to 100%`}
        className="h-9 min-w-14 rounded-lg px-1 text-center text-xs font-medium tabular-nums hover:bg-surface-2"
      >
        {Math.round(zoom * 100)}%
      </button>
      <IconButton label="Zoom in" shortcut="+" onClick={() => zoomBy(1.25)}>
        <Plus size={16} />
      </IconButton>
      <IconButton label="Fit to screen" shortcut="⇧1" onClick={() => actions.fitView()}>
        <Maximize size={16} />
      </IconButton>
      <IconButton
        label={minimapVisible ? 'Hide minimap' : 'Show minimap'}
        active={minimapVisible}
        onClick={() => setMinimapVisible(!minimapVisible)}
        className="hidden md:inline-flex"
      >
        <MapIcon size={16} />
      </IconButton>
    </div>
  )
}
