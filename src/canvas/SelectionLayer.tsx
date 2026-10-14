import { useLayoutEffect, useMemo, useRef } from 'react'
import { Circle, Layer, Rect, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useBoard } from '@/collaboration/BoardProvider'
import type { ObjectUpdate, ObjectsSnapshot } from '@/collaboration/boardController'
import { useEditorStore } from '@/store/editorStore'
import type { BoardObject, LineObject, Point, ThemeMode } from '@/types/board'
import { isLineObject, isPointsObject } from '@/types/board'
import { ACCENT } from '@/utils/constants'
import { clamp, round, snapAngle } from '@/utils/geometry'
import { measureTextHeight } from '@/utils/text'
import { nodeRegistry } from './nodeRegistry'
import { ObjectNode } from './ObjectNode'

interface SelectionLayerProps {
  objects: ObjectsSnapshot
  theme: ThemeMode
}

const TEXT_ANCHORS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'middle-left',
  'middle-right',
]

const ROTATION_SNAPS = [0, 45, 90, 135, 180, 225, 270, 315]

/**
 * Everything drawn above the objects: the transformer (resize / rotate
 * handles), line endpoint handles, the marquee and the shape being drawn.
 */
export function SelectionLayer({ objects, theme }: SelectionLayerProps) {
  const board = useBoard()
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const editingId = useEditorStore((s) => s.editingId)
  const marquee = useEditorStore((s) => s.marquee)
  const draft = useEditorStore((s) => s.draft)
  const zoom = useEditorStore((s) => s.viewport.zoom)
  const tool = useEditorStore((s) => s.tool)
  const transformerRef = useRef<Konva.Transformer>(null)

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => objects.byId.get(id))
        .filter((o): o is BoardObject => o !== undefined),
    [selectedIds, objects],
  )

  const singleLine: LineObject | null = useMemo(() => {
    const only = selected.length === 1 ? selected[0] : undefined
    return only && isLineObject(only) ? only : null
  }, [selected])

  const interactive = tool === 'select' && editingId === null
  const transformerIds = interactive && !singleLine ? selected.map((o) => o.id) : []
  const transformerKey = transformerIds.join(',')
  const allText = selected.length > 0 && selected.every((o) => o.type === 'text')

  // Attach the transformer to the live Konva nodes whenever the selection or the objects change.
  useLayoutEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const nodes: Konva.Group[] = []
    for (const id of transformerKey === '' ? [] : transformerKey.split(',')) {
      const node = nodeRegistry.get(id)
      if (node) nodes.push(node)
    }
    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [transformerKey, objects])

  const handleTransformEnd = () => {
    const transformer = transformerRef.current
    if (!transformer) return
    const updates: ObjectUpdate[] = []

    for (const node of transformer.nodes()) {
      const object = board.getObject(node.id())
      if (!object) continue
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()

      if (isPointsObject(object)) {
        // Bake rotation and scale into the points so lines always stay axis-free.
        const transform = node.getTransform()
        const absolute: Point[] = []
        for (let i = 0; i + 1 < object.points.length; i += 2) {
          absolute.push(
            transform.point({ x: object.points[i] as number, y: object.points[i + 1] as number }),
          )
        }
        const origin = absolute[0] ?? { x: object.x, y: object.y }
        updates.push({
          id: object.id,
          patch: {
            x: round(origin.x),
            y: round(origin.y),
            rotation: 0,
            points: absolute.flatMap((p) => [round(p.x - origin.x), round(p.y - origin.y)]),
          },
        })
        node.rotation(0)
        node.position({ x: origin.x, y: origin.y })
      } else if (object.type === 'text') {
        const width = Math.max(40, round(object.width * scaleX))
        const fontSize = clamp(round(object.fontSize * scaleY, 1), 8, 400)
        updates.push({
          id: object.id,
          patch: {
            x: round(node.x()),
            y: round(node.y()),
            rotation: round(node.rotation()),
            width,
            fontSize,
            height: measureTextHeight({ ...object, width, fontSize }),
          },
        })
      } else {
        updates.push({
          id: object.id,
          patch: {
            x: round(node.x()),
            y: round(node.y()),
            rotation: round(node.rotation()),
            width: Math.max(8, round(object.width * scaleX)),
            height: Math.max(8, round(object.height * scaleY)),
          },
        })
      }

      node.scaleX(1)
      node.scaleY(1)
    }

    board.stopCapturing()
    board.updateEach(updates)
  }

  // ---- line endpoint handles ----

  const moveEndpoint = (line: LineObject, endIndex: number, event: Konva.KonvaEventObject<DragEvent>) => {
    const handle = event.target
    const points = line.points.slice()
    const otherIndex = endIndex === 0 ? points.length - 2 : 0
    let x = handle.x()
    let y = handle.y()

    if (event.evt.shiftKey) {
      const otherX = line.x + (points[otherIndex] as number)
      const otherY = line.y + (points[otherIndex + 1] as number)
      const snapped = snapAngle(x - otherX, y - otherY)
      x = otherX + snapped.x
      y = otherY + snapped.y
      handle.position({ x, y })
    }

    points[endIndex] = x - line.x
    points[endIndex + 1] = y - line.y
    return points
  }

  const previewEndpoint = (line: LineObject, endIndex: number, event: Konva.KonvaEventObject<DragEvent>) => {
    const points = moveEndpoint(line, endIndex, event)
    const shape = nodeRegistry.get(line.id)?.getChildren()[0] as Konva.Line | undefined
    shape?.points(points)
    shape?.getLayer()?.batchDraw()
  }

  const commitEndpoint = (line: LineObject, endIndex: number, event: Konva.KonvaEventObject<DragEvent>) => {
    const points = moveEndpoint(line, endIndex, event).map((v) => round(v))
    board.stopCapturing()
    board.update([line.id], { points })
  }

  const handleRadius = 7 / zoom

  return (
    <Layer>
      {draft && <ObjectNode object={draft} theme={theme} listening={false} />}

      {marquee && (
        <Rect
          x={marquee.x}
          y={marquee.y}
          width={marquee.width}
          height={marquee.height}
          fill="rgba(99, 102, 241, 0.08)"
          stroke={ACCENT}
          strokeWidth={1 / zoom}
          listening={false}
        />
      )}

      <Transformer
        ref={transformerRef}
        flipEnabled={false}
        ignoreStroke
        keepRatio={allText}
        enabledAnchors={allText ? TEXT_ANCHORS : undefined}
        rotationSnaps={ROTATION_SNAPS}
        rotationSnapTolerance={4}
        anchorSize={10}
        anchorCornerRadius={3}
        anchorStroke={ACCENT}
        anchorFill="#ffffff"
        borderStroke={ACCENT}
        borderStrokeWidth={1.5}
        padding={4}
        boundBoxFunc={(oldBox, newBox) =>
          Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10 ? oldBox : newBox
        }
        onTransformEnd={handleTransformEnd}
      />

      {interactive &&
        singleLine &&
        [0, singleLine.points.length - 2].map((index) => (
          <Circle
            key={index}
            x={singleLine.x + (singleLine.points[index] as number)}
            y={singleLine.y + (singleLine.points[index + 1] as number)}
            radius={handleRadius}
            fill="#ffffff"
            stroke={ACCENT}
            strokeWidth={2 / zoom}
            draggable
            onDragStart={() => board.stopCapturing()}
            onDragMove={(event) => previewEndpoint(singleLine, index, event)}
            onDragEnd={(event) => commitEndpoint(singleLine, index, event)}
          />
        ))}
    </Layer>
  )
}
