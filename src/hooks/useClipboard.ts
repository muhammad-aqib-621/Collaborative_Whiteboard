import { useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { getViewportRect } from '@/utils/geometry'
import { isBoardObject } from '@/utils/validate'
import type { BoardObject } from '@/types/board'
import { useBoardActions } from './useBoardActions'
import { isEditableTarget } from './useKeyboardShortcuts'

const CLIPBOARD_KIND = 'collaborative-whiteboard/objects'

function serialize(objects: readonly BoardObject[]): string {
  return JSON.stringify({ kind: CLIPBOARD_KIND, version: 1, objects })
}

function parse(text: string): BoardObject[] | null {
  if (!text.startsWith('{')) return null
  try {
    const data = JSON.parse(text) as { kind?: unknown; objects?: unknown }
    if (data.kind !== CLIPBOARD_KIND || !Array.isArray(data.objects)) return null
    const objects = data.objects.filter(isBoardObject)
    return objects.length > 0 ? objects : null
  } catch {
    return null
  }
}

function sameObjects(a: readonly BoardObject[], b: readonly BoardObject[]): boolean {
  return a.length === b.length && a.every((o, i) => o.id === b[i]?.id)
}

/**
 * Copy / cut / paste through the native clipboard events. Using the events
 * (rather than key handlers) lets objects travel between boards and browser
 * tabs as JSON, and lets plain text on the clipboard become a text object.
 */
export function useClipboard(): void {
  const actions = useBoardActions()

  useEffect(() => {
    const copySelection = (event: ClipboardEvent): BoardObject[] | null => {
      const objects = actions.selectedObjects()
      if (objects.length === 0) return null
      event.clipboardData?.setData('text/plain', serialize(objects))
      event.preventDefault()
      useEditorStore.getState().setClipboard({ objects, pasteCount: 0 })
      return objects
    }

    const onCopy = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return
      copySelection(event)
    }

    const onCut = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (copySelection(event)) actions.deleteSelection()
    }

    const onPaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return
      const state = useEditorStore.getState()
      const text = event.clipboardData?.getData('text/plain') ?? ''
      const parsed = parse(text)

      if (parsed) {
        event.preventDefault()
        const internal = state.clipboard
        const isRepeat = internal !== null && sameObjects(internal.objects, parsed)
        const index = isRepeat ? internal.pasteCount : 0
        actions.pasteObjects(parsed, index)
        state.setClipboard({ objects: parsed, pasteCount: index + 1 })
        return
      }

      if (text.trim().length > 0) {
        event.preventDefault()
        const view = getViewportRect(state.viewport, state.stageSize)
        actions.addTextAt(text.slice(0, 5000), {
          x: view.x + view.width / 2 - 110,
          y: view.y + view.height / 2 - 20,
        })
        return
      }

      // Nothing usable on the system clipboard: fall back to the in-app one.
      const internal = state.clipboard
      if (internal) {
        event.preventDefault()
        actions.pasteObjects(internal.objects, internal.pasteCount)
        state.setClipboard({ objects: internal.objects, pasteCount: internal.pasteCount + 1 })
      }
    }

    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCut)
    document.addEventListener('paste', onPaste)
    return () => {
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('cut', onCut)
      document.removeEventListener('paste', onPaste)
    }
  }, [actions])
}
