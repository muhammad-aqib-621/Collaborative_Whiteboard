import { useEffect } from 'react'
import { useBoard } from '@/collaboration/BoardProvider'
import { cancelViewportAnimation, zoomBy, zoomTo } from '@/canvas/viewport'
import { useEditorStore } from '@/store/editorStore'
import type { ToolType } from '@/types/board'
import { useBoardActions } from './useBoardActions'

export const TOOL_SHORTCUTS: Record<string, ToolType> = {
  v: 'select',
  h: 'hand',
  r: 'rectangle',
  o: 'ellipse',
  l: 'line',
  a: 'arrow',
  p: 'pen',
  t: 'text',
  n: 'sticky',
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  // Radix sliders use arrow keys themselves.
  return target.closest('[role="slider"]') !== null
}

/** Global keyboard shortcuts for the editor. Mount once inside the board. */
export function useKeyboardShortcuts(): void {
  const board = useBoard()
  const actions = useBoardActions()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useEditorStore.getState()
      if (isEditableTarget(event.target)) return
      // A dialog or menu is open; leave keys to it.
      if (state.shortcutsOpen) return

      const mod = event.ctrlKey || event.metaKey
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key

      // Space: temporary hand tool.
      if (key === ' ' && !mod) {
        event.preventDefault()
        if (!event.repeat) state.setSpacePan(true)
        return
      }

      if (mod) {
        switch (key) {
          case 'z':
            event.preventDefault()
            if (event.shiftKey) actions.redo()
            else actions.undo()
            return
          case 'y':
            event.preventDefault()
            actions.redo()
            return
          case 'a':
            event.preventDefault()
            actions.selectAll()
            return
          case 'd':
            event.preventDefault()
            actions.duplicateSelection()
            return
          case ']':
            event.preventDefault()
            actions.reorderSelection('front')
            return
          case '[':
            event.preventDefault()
            actions.reorderSelection('back')
            return
          case '=':
          case '+':
            event.preventDefault()
            zoomBy(1.25)
            return
          case '-':
            event.preventDefault()
            zoomBy(0.8)
            return
          case '0':
            event.preventDefault()
            zoomTo(1)
            return
          default:
            // Copy / cut / paste are handled by clipboard events (useClipboard).
            return
        }
      }

      if (event.altKey) return

      switch (key) {
        case 'Delete':
        case 'Backspace':
          if (state.selectedIds.length > 0) {
            event.preventDefault()
            actions.deleteSelection()
          }
          return
        case 'Escape':
          if (state.editingId) return
          state.clearSelection()
          state.setTool('select')
          return
        case 'Enter': {
          const [only] = state.selectedIds
          if (only && state.selectedIds.length === 1) {
            event.preventDefault()
            actions.startEditing(only)
          }
          return
        }
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          if (state.selectedIds.length === 0) return
          event.preventDefault()
          const step = event.shiftKey ? 10 : 1
          const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0
          const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0
          actions.nudgeSelection(dx, dy)
          return
        }
        case ']':
          actions.reorderSelection('forward')
          return
        case '[':
          actions.reorderSelection('backward')
          return
        case '+':
        case '=':
          cancelViewportAnimation()
          zoomBy(1.25)
          return
        case '-':
        case '_':
          cancelViewportAnimation()
          zoomBy(0.8)
          return
        case '0':
          zoomTo(1)
          return
        case '!': // Shift + 1
          actions.fitView()
          return
        case '@': // Shift + 2
          actions.fitSelection()
          return
        case '?':
          state.setShortcutsOpen(true)
          return
        default:
          break
      }

      if (!event.shiftKey) {
        const tool = TOOL_SHORTCUTS[key]
        if (tool) state.setTool(tool)
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') useEditorStore.getState().setSpacePan(false)
    }

    const onBlur = () => useEditorStore.getState().setSpacePan(false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [board, actions])
}
