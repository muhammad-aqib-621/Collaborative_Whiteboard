import type { BoardObject } from '@/types/board'
import { OBJECT_TYPES } from '@/types/board'

const MAX_POINTS = 20000

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.length <= MAX_POINTS && v.every(isFiniteNumber)
}

/**
 * Structural check used on data that crosses a trust boundary (remote peers,
 * clipboard, persisted state). It guarantees the renderer will not crash on
 * the value; it does not check styling values beyond their type.
 */
export function isBoardObject(value: unknown): value is BoardObject {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  if (typeof o.id !== 'string' || o.id.length === 0 || o.id.length > 64) return false
  if (typeof o.type !== 'string' || !(OBJECT_TYPES as readonly string[]).includes(o.type)) {
    return false
  }
  if (!isFiniteNumber(o.x) || !isFiniteNumber(o.y)) return false
  if (!isFiniteNumber(o.rotation) || !isFiniteNumber(o.z) || !isFiniteNumber(o.opacity)) return false
  if (typeof o.createdBy !== 'string') return false

  switch (o.type) {
    case 'line':
    case 'arrow':
    case 'pen':
      return (
        isNumberArray(o.points) &&
        o.points.length >= 2 &&
        typeof o.stroke === 'string' &&
        isFiniteNumber(o.strokeWidth)
      )
    case 'text':
    case 'sticky':
      return (
        isFiniteNumber(o.width) &&
        isFiniteNumber(o.height) &&
        typeof o.fill === 'string' &&
        typeof o.text === 'string' &&
        isFiniteNumber(o.fontSize) &&
        typeof o.fontFamily === 'string' &&
        typeof o.bold === 'boolean' &&
        typeof o.italic === 'boolean' &&
        typeof o.align === 'string'
      )
    case 'rectangle':
    case 'ellipse':
      return (
        isFiniteNumber(o.width) &&
        isFiniteNumber(o.height) &&
        typeof o.fill === 'string' &&
        typeof o.stroke === 'string' &&
        isFiniteNumber(o.strokeWidth)
      )
    default:
      return false
  }
}
