import { memo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useBoardObjects } from '@/collaboration/BoardProvider'
import { setViewportImmediate } from '@/canvas/viewport'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useEditorStore } from '@/store/editorStore'
import { usePresenceStore } from '@/store/presenceStore'
import type { BoardObject, Point, Rect, ThemeMode } from '@/types/board'
import { isPointsObject } from '@/types/board'
import { previewColor } from '@/utils/colors'
import { NONE } from '@/utils/constants'
import { expandRect, getObjectsBounds, getViewportRect, unionRects } from '@/utils/geometry'

const WIDTH = 208
const HEIGHT = 144

const MinimapShape = memo(function MinimapShape({
  object,
  theme,
}: {
  object: BoardObject
  theme: ThemeMode
}) {
  if (isPointsObject(object)) {
    const points: string[] = []
    for (let i = 0; i + 1 < object.points.length; i += 2) {
      points.push(`${object.points[i]},${object.points[i + 1]}`)
    }
    return (
      <polyline
        points={points.join(' ')}
        transform={`translate(${object.x} ${object.y})`}
        fill="none"
        stroke={previewColor(object.stroke, theme)}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  const transform = `rotate(${object.rotation} ${object.x} ${object.y})`
  const common = { x: object.x, y: object.y, width: object.width, height: object.height, transform }

  switch (object.type) {
    case 'rectangle':
    case 'ellipse': {
      const hasFill = object.fill !== NONE
      const rounded =
        object.type === 'ellipse'
          ? { rx: object.width / 2, ry: object.height / 2 }
          : { rx: Math.min(object.cornerRadius, object.width / 2), ry: Math.min(object.cornerRadius, object.height / 2) }
      return (
        <rect
          {...common}
          {...rounded}
          fill={hasFill ? previewColor(object.fill, theme) : 'none'}
          stroke={previewColor(object.stroke, theme)}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )
    }
    case 'sticky':
      return <rect {...common} rx={3} fill={previewColor(object.fill, theme)} />
    case 'text':
      return <rect {...common} fill={previewColor(object.fill, theme)} opacity={0.4} />
  }
})

/** Overview of the whole board. Click or drag to move the viewport. */
export function Minimap() {
  const visible = useEditorStore((s) => s.minimapVisible)
  if (!visible) return null
  return <MinimapPanel />
}

function MinimapPanel() {
  const objects = useBoardObjects()
  const theme = useResolvedTheme()
  const viewport = useEditorStore((s) => s.viewport)
  const stageSize = useEditorStore((s) => s.stageSize)
  const remoteUsers = usePresenceStore((s) => s.remoteUsers)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  // While dragging, the mapping is frozen so the minimap does not shift under the pointer.
  const [frozen, setFrozen] = useState<Rect | null>(null)

  const view = getViewportRect(viewport, stageSize)
  const content = getObjectsBounds(objects.ordered)
  const computed = expandRect(unionRects(content ? [content, view] : [view]) ?? view, 80)
  const bounds = frozen ?? computed

  const toWorld = (event: ReactPointerEvent): Point | null => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return null
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const world = point.matrixTransform(matrix.inverse())
    return { x: world.x, y: world.y }
  }

  const centerOn = (event: ReactPointerEvent) => {
    const world = toWorld(event)
    if (!world) return
    const state = useEditorStore.getState()
    const zoom = state.viewport.zoom
    setViewportImmediate({
      zoom,
      x: state.stageSize.width / 2 - world.x * zoom,
      y: state.stageSize.height / 2 - world.y * zoom,
    })
  }

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = true
    setFrozen(computed)
    centerOn(event)
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragging.current) centerOn(event)
  }

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return
    dragging.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setFrozen(null)
  }

  const dot = Math.max(bounds.width, bounds.height) / 60

  return (
    <div
      className="panel absolute bottom-3 right-3 z-20 hidden overflow-hidden md:block"
      style={{ width: WIDTH, height: HEIGHT }}
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label="Minimap. Click or drag to move around the board."
        width={WIDTH}
        height={HEIGHT}
        viewBox={`${bounds.x} ${bounds.y} ${Math.max(bounds.width, 1)} ${Math.max(bounds.height, 1)}`}
        preserveAspectRatio="xMidYMid meet"
        className="block cursor-pointer touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {objects.ordered.map((object) => (
          <MinimapShape key={object.id} object={object} theme={theme} />
        ))}
        {remoteUsers.map(
          (remote) =>
            remote.cursor && (
              <circle
                key={remote.clientId}
                cx={remote.cursor.x}
                cy={remote.cursor.y}
                r={dot}
                fill={remote.user.color}
              />
            ),
        )}
        {stageSize.width > 0 && (
          <rect
            x={view.x}
            y={view.y}
            width={view.width}
            height={view.height}
            fill="var(--accent)"
            fillOpacity={0.1}
            stroke="var(--accent)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  )
}
