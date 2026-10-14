import { memo, useCallback, type ReactNode } from 'react'
import { Arrow, Ellipse, Group, Line, Rect, Text } from 'react-konva'
import type Konva from 'konva'
import type { BoardObject, DashStyle, ThemeMode } from '@/types/board'
import { resolveColor } from '@/utils/colors'
import {
  FONT_STACKS,
  STICKY_PADDING,
  STICKY_TEXT_COLOR,
  TEXT_LINE_HEIGHT,
  TEXT_PADDING,
} from '@/utils/constants'
import { konvaFontStyle } from '@/utils/text'

export interface ObjectNodeHandlers {
  onPointerDown: (event: Konva.KonvaEventObject<PointerEvent>) => void
  onDragStart: (event: Konva.KonvaEventObject<DragEvent>) => void
  onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void
  onDoubleClick: (event: Konva.KonvaEventObject<MouseEvent | Event>) => void
}

interface ObjectNodeProps {
  object: BoardObject
  theme: ThemeMode
  draggable?: boolean
  listening?: boolean
  /** Hide the rendered text while it is being edited in the overlay. */
  hideText?: boolean
  handlers?: ObjectNodeHandlers
  register?: (id: string, node: Konva.Group | null) => void
}

function dashArray(dash: DashStyle, strokeWidth: number): number[] | undefined {
  if (dash === 'dashed') return [Math.max(8, strokeWidth * 4), Math.max(6, strokeWidth * 3)]
  if (dash === 'dotted') return [0.1, Math.max(5, strokeWidth * 2.5)]
  return undefined
}

function ObjectNodeImpl({
  object,
  theme,
  draggable = false,
  listening = true,
  hideText = false,
  handlers,
  register,
}: ObjectNodeProps) {
  const setRef = useCallback(
    (node: Konva.Group | null) => {
      register?.(object.id, node)
    },
    [register, object.id],
  )

  const stroke = 'stroke' in object ? resolveColor(object.stroke, theme) : undefined

  let content: ReactNode = null

  switch (object.type) {
    case 'rectangle':
      content = (
        <Rect
          width={object.width}
          height={object.height}
          fill={resolveColor(object.fill, theme)}
          stroke={stroke}
          strokeWidth={object.strokeWidth}
          cornerRadius={Math.min(object.cornerRadius, object.width / 2, object.height / 2)}
          dash={dashArray(object.dash, object.strokeWidth)}
          lineCap={object.dash === 'dotted' ? 'round' : 'butt'}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
        />
      )
      break

    case 'ellipse':
      content = (
        <Ellipse
          x={object.width / 2}
          y={object.height / 2}
          radiusX={Math.max(object.width / 2, 0.5)}
          radiusY={Math.max(object.height / 2, 0.5)}
          fill={resolveColor(object.fill, theme)}
          stroke={stroke}
          strokeWidth={object.strokeWidth}
          dash={dashArray(object.dash, object.strokeWidth)}
          lineCap={object.dash === 'dotted' ? 'round' : 'butt'}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
        />
      )
      break

    case 'line':
      content = (
        <Line
          points={object.points}
          stroke={stroke}
          strokeWidth={object.strokeWidth}
          dash={dashArray(object.dash, object.strokeWidth)}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={Math.max(16, object.strokeWidth + 10)}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
        />
      )
      break

    case 'arrow':
      content = (
        <Arrow
          points={object.points}
          stroke={stroke}
          fill={stroke}
          strokeWidth={object.strokeWidth}
          dash={dashArray(object.dash, object.strokeWidth)}
          pointerLength={8 + object.strokeWidth * 2}
          pointerWidth={8 + object.strokeWidth * 2}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={Math.max(16, object.strokeWidth + 10)}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
        />
      )
      break

    case 'pen':
      content = (
        <Line
          points={object.points}
          stroke={stroke}
          strokeWidth={object.strokeWidth}
          tension={0.35}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={Math.max(14, object.strokeWidth + 8)}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
        />
      )
      break

    case 'sticky': {
      const showPlaceholder = object.text.length === 0 && !hideText
      content = (
        <>
          <Rect
            width={object.width}
            height={object.height}
            fill={resolveColor(object.fill, theme)}
            cornerRadius={4}
            shadowColor="#000000"
            shadowBlur={14}
            shadowOpacity={0.2}
            shadowOffsetY={5}
            shadowForStrokeEnabled={false}
            perfectDrawEnabled={false}
          />
          {!hideText && (
            <Text
              width={object.width}
              height={object.height}
              text={showPlaceholder ? 'Double-click to type…' : object.text}
              padding={STICKY_PADDING}
              fontSize={object.fontSize}
              fontFamily={FONT_STACKS[object.fontFamily]}
              fontStyle={konvaFontStyle(object.bold, object.italic)}
              lineHeight={TEXT_LINE_HEIGHT}
              align={object.align}
              fill={STICKY_TEXT_COLOR}
              opacity={showPlaceholder ? 0.4 : 1}
              wrap="word"
              ellipsis
              perfectDrawEnabled={false}
            />
          )}
        </>
      )
      break
    }

    case 'text':
      content = hideText ? (
        // Keeps a hit area while the overlay editor is open.
        <Rect width={object.width} height={object.height} fill="transparent" />
      ) : (
        <Text
          width={object.width}
          text={object.text}
          padding={TEXT_PADDING}
          fontSize={object.fontSize}
          fontFamily={FONT_STACKS[object.fontFamily]}
          fontStyle={konvaFontStyle(object.bold, object.italic)}
          lineHeight={TEXT_LINE_HEIGHT}
          align={object.align}
          fill={resolveColor(object.fill, theme)}
          wrap="word"
          perfectDrawEnabled={false}
        />
      )
      break
  }

  return (
    <Group
      ref={setRef}
      id={object.id}
      name="board-object"
      x={object.x}
      y={object.y}
      rotation={object.rotation}
      opacity={object.opacity}
      draggable={draggable}
      listening={listening}
      onPointerDown={handlers?.onPointerDown}
      onDragStart={handlers?.onDragStart}
      onDragMove={handlers?.onDragMove}
      onDragEnd={handlers?.onDragEnd}
      onDblClick={handlers?.onDoubleClick}
      onDblTap={handlers?.onDoubleClick}
    >
      {content}
    </Group>
  )
}

export const ObjectNode = memo(ObjectNodeImpl)
