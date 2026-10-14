import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { Layer, Rect, Stage } from 'react-konva'
import { useBoardObjects } from '@/collaboration/BoardProvider'
import { RemoteCursors } from '@/components/RemoteCursors'
import { useElementSize } from '@/hooks/useElementSize'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useEditorStore } from '@/store/editorStore'
import { usePresenceStore } from '@/store/presenceStore'
import type { GridMode, Viewport } from '@/types/board'
import { isCreationTool } from '@/types/board'
import { expandRect, getObjectBounds } from '@/utils/geometry'
import { nodeRegistry } from './nodeRegistry'
import { ObjectNode } from './ObjectNode'
import { SelectionLayer } from './SelectionLayer'
import { TextEditorOverlay } from './TextEditorOverlay'
import { useCanvasInteractions } from './useCanvasInteractions'
import { useViewportGestures } from './useViewportGestures'
import { fitToObjects, setViewportImmediate } from './viewport'

/** CSS background that paints an infinite grid aligned with the world origin. */
function gridStyle(mode: GridMode, viewport: Viewport): CSSProperties {
  if (mode === 'none') return {}
  let step = 24 * viewport.zoom
  // Keep the grid readable when zoomed far out.
  while (step < 14) step *= 5

  if (mode === 'dots') {
    return {
      backgroundImage: 'radial-gradient(circle at center, var(--grid) 1.2px, transparent 1.7px)',
      backgroundSize: `${step}px ${step}px`,
      backgroundPosition: `${viewport.x - step / 2}px ${viewport.y - step / 2}px`,
    }
  }
  return {
    backgroundImage:
      'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
    backgroundSize: `${step}px ${step}px`,
    backgroundPosition: `${viewport.x}px ${viewport.y}px`,
  }
}

/** Outlines objects selected by other collaborators in their user color. */
function RemoteSelectionLayer() {
  const objects = useBoardObjects()
  const remoteUsers = usePresenceStore((s) => s.remoteUsers)
  const zoom = useEditorStore((s) => s.viewport.zoom)

  const outlines = useMemo(() => {
    const result: Array<{ key: string; color: string; x: number; y: number; width: number; height: number }> = []
    for (const remote of remoteUsers) {
      for (const id of remote.selection) {
        const object = objects.byId.get(id)
        if (!object) continue
        const bounds = expandRect(getObjectBounds(object), 4)
        result.push({ key: `${remote.clientId}:${id}`, color: remote.user.color, ...bounds })
      }
    }
    return result
  }, [remoteUsers, objects])

  return (
    <Layer listening={false}>
      {outlines.map((o) => (
        <Rect
          key={o.key}
          x={o.x}
          y={o.y}
          width={o.width}
          height={o.height}
          stroke={o.color}
          strokeWidth={2 / zoom}
          dash={[6 / zoom, 4 / zoom]}
          cornerRadius={3 / zoom}
        />
      ))}
    </Layer>
  )
}

/**
 * The drawing surface. It renders the shared board (from Yjs, through
 * `useBoardObjects`) and local editor state (from Zustand) and delegates all
 * pointer handling to `useCanvasInteractions`.
 */
export function BoardCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(containerRef)
  const objects = useBoardObjects()
  const theme = useResolvedTheme()
  const interactions = useCanvasInteractions(containerRef)
  useViewportGestures(containerRef)

  const viewport = useEditorStore((s) => s.viewport)
  const tool = useEditorStore((s) => s.tool)
  const spacePan = useEditorStore((s) => s.spacePan)
  const isPanning = useEditorStore((s) => s.isPanning)
  const editingId = useEditorStore((s) => s.editingId)
  const gridMode = useEditorStore((s) => s.gridMode)
  const setStageSize = useEditorStore((s) => s.setStageSize)

  useEffect(() => {
    setStageSize(size)
  }, [size, setStageSize])

  // Center the world origin on first layout, then fit content once it arrives
  // (it may load asynchronously from IndexedDB or the sync server).
  const centered = useRef(false)
  const fitted = useRef(false)
  const mountedAt = useRef(performance.now())
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return
    if (!centered.current) {
      centered.current = true
      setViewportImmediate({ x: size.width / 2, y: size.height / 2, zoom: 1 })
    }
    if (!fitted.current && objects.ordered.length > 0) {
      fitted.current = true
      if (performance.now() - mountedAt.current < 4000) fitToObjects(objects.ordered)
    }
  }, [size, objects])

  const panMode = tool === 'hand' || spacePan
  const cursor = isPanning
    ? 'grabbing'
    : panMode
      ? 'grab'
      : isCreationTool(tool)
        ? 'crosshair'
        : 'default'

  const selectMode = tool === 'select' && !spacePan

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-canvas"
      style={{ ...gridStyle(gridMode, viewport), cursor, touchAction: 'none' }}
      onPointerMove={interactions.onContainerPointerMove}
      onPointerLeave={interactions.onContainerPointerLeave}
      data-testid="board-canvas"
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.zoom}
          scaleY={viewport.zoom}
          onPointerDown={interactions.onStagePointerDown}
          onContextMenu={interactions.onContextMenu}
        >
          <Layer listening={tool === 'select'}>
            {objects.ordered.map((object) => (
              <ObjectNode
                key={object.id}
                object={object}
                theme={theme}
                draggable={selectMode && editingId !== object.id}
                hideText={editingId === object.id}
                handlers={interactions.nodeHandlers}
                register={nodeRegistry.register}
              />
            ))}
          </Layer>
          <RemoteSelectionLayer />
          <SelectionLayer objects={objects} theme={theme} />
        </Stage>
      )}
      <RemoteCursors />
      <TextEditorOverlay />
    </div>
  )
}
