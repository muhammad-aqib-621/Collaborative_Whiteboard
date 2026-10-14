export type ObjectType = 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'pen' | 'text' | 'sticky'

export type ToolType = 'select' | 'hand' | ObjectType

export type DashStyle = 'solid' | 'dashed' | 'dotted'
export type TextAlign = 'left' | 'center' | 'right'
export type FontFamilyKey = 'sans' | 'serif' | 'mono' | 'hand'
export type ThemeMode = 'light' | 'dark'
export type ThemePreference = ThemeMode | 'system'
export type GridMode = 'dots' | 'lines' | 'none'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

export interface Viewport {
  /** Screen-space offset of the world origin, in pixels. */
  x: number
  y: number
  zoom: number
}

interface BaseObject {
  id: string
  x: number
  y: number
  /** Degrees. Only meaningful for box-like objects. */
  rotation: number
  /** Stacking order. Higher values render on top. */
  z: number
  opacity: number
  /** Id of the user who created the object. */
  createdBy: string
}

export interface RectangleObject extends BaseObject {
  type: 'rectangle'
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  dash: DashStyle
  cornerRadius: number
}

export interface EllipseObject extends BaseObject {
  type: 'ellipse'
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  dash: DashStyle
}

export interface StickyObject extends BaseObject {
  type: 'sticky'
  width: number
  height: number
  /** Note color. */
  fill: string
  text: string
  fontSize: number
  fontFamily: FontFamilyKey
  bold: boolean
  italic: boolean
  align: TextAlign
}

export interface TextObject extends BaseObject {
  type: 'text'
  width: number
  height: number
  /** Text color. */
  fill: string
  text: string
  fontSize: number
  fontFamily: FontFamilyKey
  bold: boolean
  italic: boolean
  align: TextAlign
}

export interface LineObject extends BaseObject {
  type: 'line' | 'arrow'
  /** Flat [x1, y1, x2, y2] list, relative to the object's x/y. */
  points: number[]
  stroke: string
  strokeWidth: number
  dash: DashStyle
}

export interface PenObject extends BaseObject {
  type: 'pen'
  /** Flat [x1, y1, x2, y2, ...] list, relative to the object's x/y. */
  points: number[]
  stroke: string
  strokeWidth: number
}

export type BoxObject = RectangleObject | EllipseObject | StickyObject | TextObject
export type TextualObject = StickyObject | TextObject
export type PointsObject = LineObject | PenObject
export type BoardObject = BoxObject | PointsObject

/**
 * A partial update applied to an object. Keys that do not exist on the target
 * object are ignored, so the same patch can safely be applied to a mixed
 * selection.
 */
export interface ObjectPatch {
  x?: number
  y?: number
  rotation?: number
  z?: number
  opacity?: number
  width?: number
  height?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  dash?: DashStyle
  cornerRadius?: number
  fontSize?: number
  fontFamily?: FontFamilyKey
  bold?: boolean
  italic?: boolean
  align?: TextAlign
  points?: number[]
}

export type StyleDefaults = Record<ObjectType, ObjectPatch>

export type ReorderMode = 'front' | 'back' | 'forward' | 'backward'

export const OBJECT_TYPES: readonly ObjectType[] = [
  'rectangle',
  'ellipse',
  'line',
  'arrow',
  'pen',
  'text',
  'sticky',
]

export function isBoxObject(o: BoardObject): o is BoxObject {
  return o.type === 'rectangle' || o.type === 'ellipse' || o.type === 'sticky' || o.type === 'text'
}

export function isPointsObject(o: BoardObject): o is PointsObject {
  return o.type === 'line' || o.type === 'arrow' || o.type === 'pen'
}

export function isLineObject(o: BoardObject): o is LineObject {
  return o.type === 'line' || o.type === 'arrow'
}

export function isTextualObject(o: BoardObject): o is TextualObject {
  return o.type === 'text' || o.type === 'sticky'
}

export function isCreationTool(tool: ToolType): tool is ObjectType {
  return tool !== 'select' && tool !== 'hand'
}
