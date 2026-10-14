import type { ThemeMode } from '@/types/board'
import { INK, NONE } from './constants'

const INK_LIGHT = '#1f2937'
const INK_DARK = '#f4f4f5'

/** Resolves a stored color token (hex, `ink` or `none`) into a concrete CSS color. */
export function resolveColor(color: string, theme: ThemeMode): string {
  if (color === NONE) return 'transparent'
  if (color === INK) return theme === 'dark' ? INK_DARK : INK_LIGHT
  return color
}

/** Returns a color suitable for drawing on the minimap or as a swatch preview. */
export function previewColor(color: string, theme: ThemeMode): string {
  return resolveColor(color, theme)
}

/** Converts a stored color into a value an `<input type="color">` accepts. */
export function toHexInput(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color
  if (color === INK) return '#1f2937'
  return '#ffffff'
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? '?'
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + second).toUpperCase()
}
