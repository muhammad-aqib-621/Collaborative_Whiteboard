import type { BoardObject, ObjectPatch, ObjectType, StyleDefaults } from '@/types/board'
import { INK, NONE } from './constants'

export interface BuildInput {
  id: string
  type: ObjectType
  x: number
  y: number
  z: number
  createdBy: string
  width?: number
  height?: number
  points?: number[]
  text?: string
  style: ObjectPatch
}

/** Builds a fully-populated board object, filling anything missing from `style`. */
export function buildObject(input: BuildInput): BoardObject {
  const { style: s } = input
  const common = {
    id: input.id,
    x: input.x,
    y: input.y,
    rotation: 0,
    z: input.z,
    opacity: s.opacity ?? 1,
    createdBy: input.createdBy,
  }

  switch (input.type) {
    case 'rectangle':
      return {
        ...common,
        type: 'rectangle',
        width: input.width ?? 160,
        height: input.height ?? 100,
        fill: s.fill ?? NONE,
        stroke: s.stroke ?? INK,
        strokeWidth: s.strokeWidth ?? 2,
        dash: s.dash ?? 'solid',
        cornerRadius: s.cornerRadius ?? 8,
      }
    case 'ellipse':
      return {
        ...common,
        type: 'ellipse',
        width: input.width ?? 160,
        height: input.height ?? 100,
        fill: s.fill ?? NONE,
        stroke: s.stroke ?? INK,
        strokeWidth: s.strokeWidth ?? 2,
        dash: s.dash ?? 'solid',
      }
    case 'sticky':
      return {
        ...common,
        type: 'sticky',
        width: input.width ?? 200,
        height: input.height ?? 200,
        fill: s.fill ?? '#fef08a',
        text: input.text ?? '',
        fontSize: s.fontSize ?? 20,
        fontFamily: s.fontFamily ?? 'sans',
        bold: s.bold ?? false,
        italic: s.italic ?? false,
        align: s.align ?? 'left',
      }
    case 'text':
      return {
        ...common,
        type: 'text',
        width: input.width ?? 220,
        height: input.height ?? 30,
        fill: s.fill ?? INK,
        text: input.text ?? '',
        fontSize: s.fontSize ?? 24,
        fontFamily: s.fontFamily ?? 'sans',
        bold: s.bold ?? false,
        italic: s.italic ?? false,
        align: s.align ?? 'left',
      }
    case 'line':
    case 'arrow':
      return {
        ...common,
        type: input.type,
        points: input.points ?? [0, 0, 160, 0],
        stroke: s.stroke ?? INK,
        strokeWidth: s.strokeWidth ?? 2,
        dash: s.dash ?? 'solid',
      }
    case 'pen':
      return {
        ...common,
        type: 'pen',
        points: input.points ?? [0, 0],
        stroke: s.stroke ?? INK,
        strokeWidth: s.strokeWidth ?? 3,
      }
  }
}

export function createDefaultStyles(): StyleDefaults {
  return {
    rectangle: { fill: NONE, stroke: INK, strokeWidth: 2, dash: 'solid', opacity: 1, cornerRadius: 8 },
    ellipse: { fill: NONE, stroke: INK, strokeWidth: 2, dash: 'solid', opacity: 1 },
    line: { stroke: INK, strokeWidth: 2, dash: 'solid', opacity: 1 },
    arrow: { stroke: INK, strokeWidth: 2, dash: 'solid', opacity: 1 },
    pen: { stroke: INK, strokeWidth: 3, opacity: 1 },
    text: {
      fill: INK,
      fontSize: 24,
      fontFamily: 'sans',
      bold: false,
      italic: false,
      align: 'left',
      opacity: 1,
    },
    sticky: {
      fill: '#fef08a',
      fontSize: 20,
      fontFamily: 'sans',
      bold: false,
      italic: false,
      align: 'left',
      opacity: 1,
    },
  }
}
