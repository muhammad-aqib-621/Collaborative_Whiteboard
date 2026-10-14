import { useEffect, useLayoutEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import type * as Y from 'yjs'
import { useBoard, useBoardObjects } from '@/collaboration/BoardProvider'
import { LOCAL_ORIGIN } from '@/collaboration/boardController'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useEditorStore } from '@/store/editorStore'
import type { TextualObject } from '@/types/board'
import { isTextualObject } from '@/types/board'
import { resolveColor } from '@/utils/colors'
import {
  ACCENT,
  FONT_STACKS,
  STICKY_PADDING,
  STICKY_TEXT_COLOR,
  TEXT_LINE_HEIGHT,
  TEXT_PADDING,
} from '@/utils/constants'
import { measureTextHeight } from '@/utils/text'

/** Mounts the in-place editor for the text or sticky note currently being edited. */
export function TextEditorOverlay() {
  const editingId = useEditorStore((s) => s.editingId)
  const objects = useBoardObjects()
  const object = editingId ? objects.byId.get(editingId) : undefined
  if (!object || !isTextualObject(object)) return null
  return <TextEditor key={object.id} object={object} />
}

function TextEditor({ object }: { object: TextualObject }) {
  const board = useBoard()
  const theme = useResolvedTheme()
  const viewport = useEditorStore((s) => s.viewport)
  const ref = useRef<HTMLTextAreaElement>(null)
  const id = object.id
  const isSticky = object.type === 'sticky'

  // Seed the textarea, focus it and put the caret at the end.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.value = board.getText(id)?.toString() ?? object.text
    element.focus()
    const end = element.value.length
    element.setSelectionRange(end, end)
    // Only on mount: the textarea is uncontrolled afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reflect edits made by other collaborators (and undo/redo) while typing.
  useEffect(() => {
    const yText = board.getText(id)
    if (!yText) return
    const observer = (_event: Y.YTextEvent, transaction: Y.Transaction) => {
      if (transaction.origin === LOCAL_ORIGIN) return
      const element = ref.current
      const next = yText.toString()
      if (!element || element.value === next) return
      const caret = Math.min(element.selectionStart, next.length)
      element.value = next
      element.setSelectionRange(caret, caret)
    }
    yText.observe(observer)
    return () => yText.unobserve(observer)
  }, [board, id])

  const finish = () => {
    const state = useEditorStore.getState()
    if (state.editingId !== id) return
    state.setEditingId(null)
    const current = board.getObject(id)
    // An empty free-standing text box is clutter; drop it like most whiteboards do.
    if (current && current.type === 'text' && current.text.trim().length === 0) {
      board.remove([id])
      state.clearSelection()
    }
  }

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value
    board.setText(id, next)
    if (object.type === 'text') {
      board.update([id], { height: measureTextHeight({ ...object, text: next }) }, { coalesce: `text:${id}` })
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
      event.preventDefault()
      finish()
    }
    event.stopPropagation()
  }

  const padding = isSticky ? STICKY_PADDING : TEXT_PADDING
  const x = viewport.x + object.x * viewport.zoom
  const y = viewport.y + object.y * viewport.zoom

  return (
    <textarea
      ref={ref}
      aria-label={isSticky ? 'Sticky note text' : 'Text'}
      spellCheck={false}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={finish}
      className="absolute left-0 top-0 m-0 resize-none border-0 bg-transparent"
      style={{
        width: object.width,
        height: object.height,
        transform: `translate(${x}px, ${y}px) rotate(${object.rotation}deg) scale(${viewport.zoom})`,
        transformOrigin: '0 0',
        boxSizing: 'border-box',
        padding,
        fontSize: object.fontSize,
        fontFamily: FONT_STACKS[object.fontFamily],
        fontWeight: object.bold ? 700 : 400,
        fontStyle: object.italic ? 'italic' : 'normal',
        lineHeight: TEXT_LINE_HEIGHT,
        textAlign: object.align,
        color: isSticky ? STICKY_TEXT_COLOR : resolveColor(object.fill, theme),
        opacity: object.opacity,
        overflow: isSticky ? 'auto' : 'hidden',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        outline: `1.5px solid ${ACCENT}`,
        outlineOffset: 2,
        borderRadius: isSticky ? 4 : 2,
        userSelect: 'text',
        caretColor: isSticky ? STICKY_TEXT_COLOR : resolveColor(object.fill, theme),
      }}
    />
  )
}
