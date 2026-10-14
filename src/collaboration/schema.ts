import * as Y from 'yjs'
import type { BoardObject } from '@/types/board'
import { isBoardObject } from '@/utils/validate'

/**
 * Shared document layout
 * ----------------------
 *   doc.getMap('objects')  Y.Map<id, Y.Map<field, value>>   one entry per board object
 *   doc.getMap('meta')     Y.Map<string, unknown>            board-level settings (title)
 *
 * Every object is its own Y.Map so concurrent edits to different fields of the
 * same object (for example one user recoloring while another moves it) merge
 * instead of overwriting each other. Text content lives in a Y.Text so
 * concurrent typing merges at the character level.
 */
export const OBJECTS_KEY = 'objects'
export const META_KEY = 'meta'
export const TITLE_KEY = 'title'
export const TEXT_FIELD = 'text'

export type YObject = Y.Map<unknown>

export function objectToYMap(object: BoardObject): YObject {
  const map: YObject = new Y.Map()
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) continue
    if (key === TEXT_FIELD && typeof value === 'string') {
      map.set(key, new Y.Text(value))
    } else {
      map.set(key, value)
    }
  }
  return map
}

/** Reads a Y.Map into a plain object, returning null if it is malformed. */
export function yMapToObject(map: YObject): BoardObject | null {
  const plain: Record<string, unknown> = {}
  map.forEach((value, key) => {
    plain[key] = value instanceof Y.Text ? value.toString() : value
  })
  return isBoardObject(plain) ? plain : null
}
