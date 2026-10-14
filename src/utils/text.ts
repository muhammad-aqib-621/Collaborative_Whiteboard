import Konva from 'konva'
import type { FontFamilyKey, TextAlign } from '@/types/board'
import { FONT_STACKS, TEXT_LINE_HEIGHT, TEXT_PADDING } from './constants'

export type KonvaFontStyle = 'normal' | 'bold' | 'italic' | 'italic bold'

export function konvaFontStyle(bold: boolean, italic: boolean): KonvaFontStyle {
  if (bold && italic) return 'italic bold'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

export interface TextMetricsInput {
  text: string
  width: number
  fontSize: number
  fontFamily: FontFamilyKey
  bold: boolean
  italic: boolean
  align: TextAlign
}

/** Measures how tall a text object must be to show all of its content. */
export function measureTextHeight(input: TextMetricsInput): number {
  const node = new Konva.Text({
    text: input.text.length > 0 ? input.text : ' ',
    width: input.width,
    fontSize: input.fontSize,
    fontFamily: FONT_STACKS[input.fontFamily],
    fontStyle: konvaFontStyle(input.bold, input.italic),
    lineHeight: TEXT_LINE_HEIGHT,
    padding: TEXT_PADDING,
    align: input.align,
    wrap: 'word',
  })
  const height = Math.ceil(node.height())
  node.destroy()
  return height
}
