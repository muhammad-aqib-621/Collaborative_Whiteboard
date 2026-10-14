import { useEffect, useMemo, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type Konva from 'konva'
import { nanoid } from 'nanoid'
import { useSession } from '@/collaboration/BoardProvider'
import { useBoardActions } from '@/hooks/useBoardActions'
import { useEditorStore } from '@/store/editorStore'
import type { BoardObject, ObjectType, Point, Viewport } from '@/types/board'
import { isCreationTool } from '@/types/board'
import { ACCENT, DEFAULT_SIZES, DRAG_THRESHOLD } from '@/utils/constants'
import {
  getObjectBounds,
  normalizeRect,
  rectsIntersect,
  round,
  screenToWorld,
  snapAngle,
} from '@/utils/geometry'
import { buildObject } from '@/utils/objectFactory'
import { measureTextHeight } from '@/utils/text'
import { gestureState } from './gestureState'
import { nodeRegistry } from './nodeRegistry'
import { setViewportImmediate } from './viewport'
import type { ObjectNodeHandlers } from './ObjectNode'

interface PanGesture {
  kind: 'pan'
  startX: number
  startY: number
  viewport: Viewport
}

interface MarqueeGesture {
  kind: 'marquee'
  start: Point
  additive: boolean
  base: string[]
}

interface DrawGesture {
  kind: 'draw'
  tool: ObjectType
  start: Point
  moved: boolean
  shift: boolean
  /** Pen only: points relative to `start`. */
  points: number[]
}

type Gesture = PanGesture | MarqueeGesture | DrawGesture

interface DragSession {
  ids: string[]
  origins: Map<string, Point>
}

export interface CanvasInteractions {
  onStagePointerDown: (event: Konva.KonvaEventObject<PointerEvent>) => void
  onContextMenu: (event: Konva.KonvaEventObject<PointerEvent>) => void
  nodeHandlers: ObjectNodeHandlers
  onContainerPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onContainerPointerLeave: () => void
}

const CURSOR_INTERVAL_MS = 40

/**
 * Pointer interactions for the canvas: panning, marquee selection, drawing
 * shapes, and moving objects. Gestures run as small state machines that
 * listen on `window` once they start, so they keep working when the pointer
 * leaves the canvas or passes over floating UI.
 */
export function useCanvasInteractions(
  containerRef: RefObject<HTMLDivElement | null>,
): CanvasInteractions {
  const session = useSession()
  const actions = useBoardActions()

  const api = useMemo(() => {
    const board = session.controller
    let current: Gesture | null = null
    let drag: DragSession | null = null

    const toWorld = (clientX: number, clientY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect()
      const { viewport } = useEditorStore.getState()
      return screenToWorld(
        { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) },
        viewport,
      )
    }

    // ------------------------------------------------------------ drawing helpers

    const createTextObject = (x: number, y: number, width: number): BoardObject => {
      const state = useEditorStore.getState()
      const object = buildObject({
        id: nanoid(10),
        type: 'text',
        x,
        y,
        z: board.nextZ(),
        createdBy: state.user.id,
        width,
        style: state.defaults.text,
      })
      if (object.type === 'text') object.height = measureTextHeight(object)
      return object
    }

    const buildDraft = (g: DrawGesture, world: Point): BoardObject => {
      const state = useEditorStore.getState()
      const base = {
        id: 'draft',
        z: 0,
        createdBy: state.user.id,
        style: state.defaults[g.tool],
      }

      if (g.tool === 'line' || g.tool === 'arrow') {
        let dx = world.x - g.start.x
        let dy = world.y - g.start.y
        if (g.shift) {
          const snapped = snapAngle(dx, dy)
          dx = snapped.x
          dy = snapped.y
        }
        return buildObject({
          ...base,
          type: g.tool,
          x: g.start.x,
          y: g.start.y,
          points: [0, 0, dx, dy],
        })
      }

      if (g.tool === 'pen') {
        return buildObject({
          ...base,
          type: 'pen',
          x: g.start.x,
          y: g.start.y,
          points: g.points.slice(),
        })
      }

      let rect = normalizeRect(g.start, world)
      if (g.shift && (g.tool === 'rectangle' || g.tool === 'ellipse')) {
        const side = Math.max(rect.width, rect.height)
        rect = {
          x: world.x < g.start.x ? g.start.x - side : g.start.x,
          y: world.y < g.start.y ? g.start.y - side : g.start.y,
          width: side,
          height: side,
        }
      }

      if (g.tool === 'text') {
        // Text is previewed as a dashed frame; the real object is created on release.
        return buildObject({
          ...base,
          type: 'rectangle',
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          style: { fill: 'none', stroke: ACCENT, strokeWidth: 1.5, dash: 'dashed', cornerRadius: 2 },
        })
      }

      return buildObject({
        ...base,
        type: g.tool,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })
    }

    const defaultObjectAt = (tool: ObjectType, at: Point): BoardObject => {
      const state = useEditorStore.getState()
      const base = {
        id: nanoid(10),
        z: board.nextZ(),
        createdBy: state.user.id,
        style: state.defaults[tool],
      }
      switch (tool) {
        case 'rectangle':
        case 'ellipse':
        case 'sticky': {
          const size = DEFAULT_SIZES[tool]
          return buildObject({
            ...base,
            type: tool,
            x: at.x - size.width / 2,
            y: at.y - size.height / 2,
            width: size.width,
            height: size.height,
          })
        }
        case 'text':
          return createTextObject(at.x, at.y - 14, DEFAULT_SIZES.text.width)
        case 'line':
        case 'arrow': {
          const length = DEFAULT_SIZES.line.length
          return buildObject({
            ...base,
            type: tool,
            x: at.x - length / 2,
            y: at.y,
            points: [0, 0, length, 0],
          })
        }
        case 'pen':
          return buildObject({
            ...base,
            type: 'pen',
            x: at.x,
            y: at.y,
            points: [0, 0, 0.01, 0.01],
          })
      }
    }

    const finishDraw = (g: DrawGesture) => {
      const state = useEditorStore.getState()
      const draft = state.draft
      state.setDraft(null)

      let object: BoardObject
      if (g.tool === 'pen') {
        object = buildObject({
          id: nanoid(10),
          type: 'pen',
          x: g.start.x,
          y: g.start.y,
          z: board.nextZ(),
          createdBy: state.user.id,
          points: g.points.length >= 4 ? g.points : [0, 0, 0.01, 0.01],
          style: state.defaults.pen,
        })
      } else if (g.moved && draft) {
        if (g.tool === 'text') {
          object = createTextObject(draft.x, draft.y, Math.max(60, 'width' in draft ? draft.width : 0))
        } else {
          object = { ...draft, id: nanoid(10), z: board.nextZ() }
        }
      } else {
        object = defaultObjectAt(g.tool, g.start)
      }
      actions.commitNewObject(object)
    }

    // ------------------------------------------------------------ gesture lifecycle

    const onMove = (event: PointerEvent) => {
      const g = current
      if (!g || gestureState.pinching) return
      const state = useEditorStore.getState()

      switch (g.kind) {
        case 'pan':
          setViewportImmediate({
            ...g.viewport,
            x: g.viewport.x + (event.clientX - g.startX),
            y: g.viewport.y + (event.clientY - g.startY),
          })
          return

        case 'marquee': {
          const world = toWorld(event.clientX, event.clientY)
          const rect = normalizeRect(g.start, world)
          state.setMarquee(rect)
          const hit = board
            .getSnapshot()
            .ordered.filter((o) => rectsIntersect(getObjectBounds(o), rect))
            .map((o) => o.id)
          state.setSelection(g.additive ? Array.from(new Set([...g.base, ...hit])) : hit)
          return
        }

        case 'draw': {
          const world = toWorld(event.clientX, event.clientY)
          const dx = world.x - g.start.x
          const dy = world.y - g.start.y
          const zoom = state.viewport.zoom
          if (!g.moved && Math.hypot(dx, dy) * zoom < DRAG_THRESHOLD) return
          g.moved = true
          g.shift = event.shiftKey

          if (g.tool === 'pen') {
            const lastX = g.points[g.points.length - 2] ?? 0
            const lastY = g.points[g.points.length - 1] ?? 0
            if (Math.hypot(dx - lastX, dy - lastY) * zoom < 1.5) return
            g.points.push(dx, dy)
          }
          state.setDraft(buildDraft(g, world))
          return
        }
      }
    }

    const detach = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    const attach = () => {
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }

    function onUp() {
      const g = current
      current = null
      detach()
      if (!g) return
      const state = useEditorStore.getState()

      switch (g.kind) {
        case 'pan':
          state.setIsPanning(false)
          return
        case 'marquee':
          state.setMarquee(null)
          return
        case 'draw':
          if (gestureState.pinching) {
            state.setDraft(null)
            return
          }
          finishDraw(g)
          return
      }
    }

    /** Aborts whatever gesture is running without committing it. */
    const cancel = () => {
      if (!current) return
      current = null
      detach()
      const state = useEditorStore.getState()
      state.setDraft(null)
      state.setMarquee(null)
      state.setIsPanning(false)
    }

    // ------------------------------------------------------------ stage handlers

    const onStagePointerDown = (event: Konva.KonvaEventObject<PointerEvent>) => {
      if (gestureState.pinching || current) return
      const evt = event.evt
      const state = useEditorStore.getState()

      const wantsPan =
        evt.button === 1 || (evt.button === 0 && (state.tool === 'hand' || state.spacePan))
      if (wantsPan) {
        evt.preventDefault()
        current = { kind: 'pan', startX: evt.clientX, startY: evt.clientY, viewport: state.viewport }
        state.setIsPanning(true)
        attach()
        return
      }
      if (evt.button !== 0) return

      const world = toWorld(evt.clientX, evt.clientY)

      if (state.tool === 'select') {
        // Clicks on objects are handled by the object itself.
        if (event.target !== event.target.getStage()) return
        if (!evt.shiftKey) state.clearSelection()
        current = { kind: 'marquee', start: world, additive: evt.shiftKey, base: state.selectedIds }
        attach()
        return
      }

      if (isCreationTool(state.tool)) {
        current = {
          kind: 'draw',
          tool: state.tool,
          start: world,
          moved: false,
          shift: evt.shiftKey,
          points: [0, 0],
        }
        attach()
      }
    }

    const onContextMenu = (event: Konva.KonvaEventObject<PointerEvent>) => {
      event.evt.preventDefault()
    }

    // ------------------------------------------------------------ object handlers

    const nodeHandlers: ObjectNodeHandlers = {
      onPointerDown: (event) => {
        const state = useEditorStore.getState()
        if (state.tool !== 'select' || state.spacePan || gestureState.pinching) return
        if (event.evt.button !== 0) return
        const id = event.currentTarget.id()
        if (state.editingId === id) return
        if (event.evt.shiftKey) state.toggleSelection(id)
        else if (!state.selectedIds.includes(id)) state.setSelection([id])
      },

      onDragStart: (event) => {
        const state = useEditorStore.getState()
        const id = event.currentTarget.id()
        const ids = state.selectedIds.includes(id) ? state.selectedIds : [id]
        const origins = new Map<string, Point>()
        for (const oid of ids) {
          const node = nodeRegistry.get(oid)
          if (node) origins.set(oid, { x: node.x(), y: node.y() })
        }
        drag = { ids, origins }
        board.stopCapturing()
      },

      onDragMove: (event) => {
        if (!drag) return
        const id = event.currentTarget.id()
        const origin = drag.origins.get(id)
        if (!origin) return
        const dx = event.currentTarget.x() - origin.x
        const dy = event.currentTarget.y() - origin.y
        for (const [otherId, start] of drag.origins) {
          if (otherId === id) continue
          nodeRegistry.get(otherId)?.position({ x: start.x + dx, y: start.y + dy })
        }
      },

      onDragEnd: () => {
        if (!drag) return
        const updates: Array<{ id: string; patch: { x: number; y: number } }> = []
        for (const id of drag.ids) {
          const node = nodeRegistry.get(id)
          if (node) updates.push({ id, patch: { x: round(node.x()), y: round(node.y()) } })
        }
        drag = null
        board.updateEach(updates)
      },

      onDoubleClick: (event) => {
        if (useEditorStore.getState().tool !== 'select') return
        actions.startEditing(event.currentTarget.id())
      },
    }

    // ------------------------------------------------------------ presence cursor

    let cursorTimer = 0
    let pendingCursor: Point | null | undefined

    const flushCursor = () => {
      cursorTimer = 0
      if (pendingCursor !== undefined) session.setCursor(pendingCursor)
      pendingCursor = undefined
    }

    const queueCursor = (point: Point | null) => {
      pendingCursor = point
      if (!cursorTimer) cursorTimer = window.setTimeout(flushCursor, CURSOR_INTERVAL_MS)
    }

    const onContainerPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'touch') return
      queueCursor(toWorld(event.clientX, event.clientY))
    }

    const onContainerPointerLeave = () => queueCursor(null)

    const dispose = () => {
      cancel()
      if (cursorTimer) window.clearTimeout(cursorTimer)
      cursorTimer = 0
    }

    return {
      onStagePointerDown,
      onContextMenu,
      nodeHandlers,
      onContainerPointerMove,
      onContainerPointerLeave,
      cancel,
      dispose,
    }
  }, [session, actions, containerRef])

  useEffect(() => {
    gestureState.cancelPointerGesture = api.cancel
    return () => {
      if (gestureState.cancelPointerGesture === api.cancel) gestureState.cancelPointerGesture = null
      api.dispose()
    }
  }, [api])

  return api
}
