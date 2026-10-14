import type { FontFamilyKey } from '@/types/board'

export const MIN_ZOOM = 0.05
export const MAX_ZOOM = 8

export const TEXT_PADDING = 4
export const STICKY_PADDING = 16
export const TEXT_LINE_HEIGHT = 1.25
export const STICKY_TEXT_COLOR = '#27272a'

export const DEFAULT_SIZES = {
  rectangle: { width: 160, height: 100 },
  ellipse: { width: 160, height: 100 },
  sticky: { width: 200, height: 200 },
  text: { width: 220 },
  line: { length: 160 },
} as const

/** Minimum pointer travel (in screen pixels) before a click becomes a drag. */
export const DRAG_THRESHOLD = 5

export const ACCENT = '#6366f1'

export const FONT_STACKS: Record<FontFamilyKey, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  hand: '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive',
}

export const FONT_LABELS: Record<FontFamilyKey, string> = {
  sans: 'Sans',
  serif: 'Serif',
  mono: 'Mono',
  hand: 'Hand',
}

/** Special color token that resolves to a readable "ink" color for the active theme. */
export const INK = 'ink'
export const NONE = 'none'

export const STROKE_PALETTE = [
  INK,
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#a1a1aa',
]

export const FILL_PALETTE = [
  NONE,
  '#ffffff',
  '#fee2e2',
  '#ffedd5',
  '#fef9c3',
  '#dcfce7',
  '#cffafe',
  '#dbeafe',
  '#ede9fe',
  '#fce7f3',
  '#e4e4e7',
]

export const NOTE_PALETTE = [
  '#fef08a',
  '#fdba74',
  '#fca5a5',
  '#f9a8d4',
  '#d8b4fe',
  '#93c5fd',
  '#6ee7b7',
  '#e5e7eb',
]

export const STROKE_WIDTHS = [1, 2, 4, 8]

export const USER_COLORS = [
  '#ef4444',
  '#f97316',
  '#d97706',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
]
