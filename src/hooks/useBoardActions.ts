import { useMemo } from 'react'
import { nanoid } from 'nanoid'
import { useBoard } from '@/collaboration/BoardProvider'
import type { BoardController } from '@/collaboration/boardController'
import { fitToObjects } from '@/canvas/viewport'
import { useEditorStore } from '@/store/editorStore'
import type { BoardObject, ObjectPatch, Point, ReorderMode } from '@/types/board'
import { isTextualObject } from '@/types/board'
import { getObjectsBounds, getViewportRect, rectsIntersect } from '@/utils/geometry'
import { buildObject } from '@/utils/objectFactory'
import { DEFAULT_SIZES } from '@/utils/constants'
import { measureTextHeight } from '@/utils/text'

const TEXT_LAYOUT_KEYS: Array<keyof ObjectPatch> = ['fontSize', 'fontFamily', 'bold', 'italic', 'align', 'width']

/**
 * Editing commands shared by the toolbar, properties panel, keyboard
 * shortcuts and canvas. They coordinate the shared document (via the
 * controller) with local editor state (selection, tool, editing).
 */
export function createBoardActions(board: BoardController) {
  const editor = () => useEditorStore.getState()

  const selectedObjects = (): BoardObject[] => board.getObjects(editor().selectedIds)

  /** Adds a freshly built object and applies the standard post-create behavior. */
  const commitNewObject = (object: BoardObject) => {
    board.add([object])
    const state = editor()
    // The pen stays active so several strokes can be drawn in a row.
    if (object.type === 'pen') return
    state.setTool('select')
    state.setSelection([object.id])
    if (isTextualObject(object)) state.setEditingId(object.id)
  }

  return {
    selectedObjects,
    commitNewObject,

    deleteSelection() {
      const state = editor()
      if (state.selectedIds.length === 0) return
      board.remove(state.selectedIds)
      state.clearSelection()
      state.setEditingId(null)
    },

    duplicateSelection() {
      const state = editor()
      if (state.selectedIds.length === 0) return
      const ids = board.duplicate(state.selectedIds, state.user.id)
      if (ids.length > 0) state.setSelection(ids)
    },

    selectAll() {
      editor().setSelection(board.getSnapshot().ordered.map((o) => o.id))
    },

    reorderSelection(mode: ReorderMode) {
      const ids = editor().selectedIds
      if (ids.length > 0) board.reorder(ids, mode)
    },

    undo() {
      board.undo()
    },

    redo() {
      board.redo()
    },

    nudgeSelection(dx: number, dy: number) {
      const objects = selectedObjects()
      if (objects.length === 0) return
      board.updateEach(
        objects.map((o) => ({ id: o.id, patch: { x: o.x + dx, y: o.y + dy } })),
        { coalesce: 'nudge' },
      )
    },

    /**
     * Applies a style patch to objects. Text objects are re-measured when the
     * patch changes their layout so their box keeps fitting the content.
     */
    applyStyle(ids: readonly string[], patch: ObjectPatch, coalesce?: string) {
      const relayout = TEXT_LAYOUT_KEYS.some((key) => key in patch)
      board.updateEach(
        ids.flatMap((id) => {
          const object = board.getObject(id)
          if (!object) return []
          if (relayout && object.type === 'text') {
            const merged = { ...object, ...patch }
            return [{ id, patch: { ...patch, height: measureTextHeight(merged) } }]
          }
          return [{ id, patch }]
        }),
        { coalesce },
      )
    },

    startEditing(id: string) {
      const object = board.getObject(id)
      if (!object || !isTextualObject(object)) return
      const state = editor()
      board.stopCapturing()
      state.setSelection([id])
      state.setEditingId(id)
    },

    /** Creates a text object at `point` containing `text` (used for pasted plain text). */
    addTextAt(text: string, point: Point) {
      const state = editor()
      const style = state.defaults.text
      const width = DEFAULT_SIZES.text.width
      const object = buildObject({
        id: nanoid(10),
        type: 'text',
        x: point.x,
        y: point.y,
        z: board.nextZ(),
        createdBy: state.user.id,
        width,
        text,
        style,
      })
      if (object.type !== 'text') return
      object.height = measureTextHeight(object)
      board.add([object])
      state.setSelection([object.id])
      state.setTool('select')
    },

    /** Creates a sticky note in the middle of the current view and starts editing it. */
    addStickyAtViewCenter() {
      const state = editor()
      const view = getViewportRect(state.viewport, state.stageSize)
      const { width, height } = DEFAULT_SIZES.sticky
      commitNewObject(
        buildObject({
          id: nanoid(10),
          type: 'sticky',
          x: view.x + view.width / 2 - width / 2,
          y: view.y + view.height / 2 - height / 2,
          z: board.nextZ(),
          createdBy: state.user.id,
          width,
          height,
          style: state.defaults.sticky,
        }),
      )
    },

    /**
     * Pastes clones of `objects`. They are offset slightly from the originals
     * when those are on screen, or centered in the view otherwise.
     */
    pasteObjects(objects: readonly BoardObject[], pasteIndex: number) {
      const bounds = getObjectsBounds(objects)
      if (!bounds) return
      const state = editor()
      const view = getViewportRect(state.viewport, state.stageSize)
      let offset: Point
      if (state.stageSize.width === 0 || rectsIntersect(bounds, view)) {
        const step = 24 * (pasteIndex + 1)
        offset = { x: step, y: step }
      } else {
        offset = {
          x: view.x + view.width / 2 - (bounds.x + bounds.width / 2),
          y: view.y + view.height / 2 - (bounds.y + bounds.height / 2),
        }
      }
      const ids = board.cloneObjects(objects, offset, state.user.id)
      if (ids.length > 0) {
        state.setTool('select')
        state.setSelection(ids)
      }
    },

    /** Fits the selection (or the whole board when nothing is selected) into view. */
    fitView() {
      const selected = selectedObjects()
      fitToObjects(selected.length > 0 ? selected : board.getSnapshot().ordered)
    },

    fitSelection() {
      const selected = selectedObjects()
      if (selected.length > 0) fitToObjects(selected)
    },
  }
}

export type BoardActions = ReturnType<typeof createBoardActions>

export function useBoardActions(): BoardActions {
  const board = useBoard()
  return useMemo(() => createBoardActions(board), [board])
}
