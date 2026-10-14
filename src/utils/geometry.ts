import type { BoardObject, Point, Rect, Size, Viewport } from '@/types/board'
import { isPointsObject } from '@/types/board'
import { MAX_ZOOM, MIN_ZOOM } from './constants'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clampZoom(zoom: number): number {
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM)
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  }
}

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  }
}

export function normalizeRect(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
  )
}

export function unionRects(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.width)
    maxY = Math.max(maxY, r.y + r.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function expandRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

/** Axis-aligned bounding box of an object in world coordinates. */
export function getObjectBounds(o: BoardObject): Rect {
  if (isPointsObject(o)) {
    let minX = 0
    let minY = 0
    let maxX = 0
    let maxY = 0
    for (let i = 0; i + 1 < o.points.length; i += 2) {
      const px = o.points[i] as number
      const py = o.points[i + 1] as number
      if (i === 0) {
        minX = maxX = px
        minY = maxY = py
      } else {
        minX = Math.min(minX, px)
        maxX = Math.max(maxX, px)
        minY = Math.min(minY, py)
        maxY = Math.max(maxY, py)
      }
    }
    const pad = o.strokeWidth / 2
    return {
      x: o.x + minX - pad,
      y: o.y + minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    }
  }

  const rad = (o.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: o.width, y: 0 },
    { x: o.width, y: o.height },
    { x: 0, y: o.height },
  ]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const c of corners) {
    const wx = o.x + c.x * cos - c.y * sin
    const wy = o.y + c.x * sin + c.y * cos
    minX = Math.min(minX, wx)
    minY = Math.min(minY, wy)
    maxX = Math.max(maxX, wx)
    maxY = Math.max(maxY, wy)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function getObjectsBounds(objects: readonly BoardObject[]): Rect | null {
  return unionRects(objects.map(getObjectBounds))
}

/** The visible region of the canvas in world coordinates. */
export function getViewportRect(viewport: Viewport, stage: Size): Rect {
  return {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: stage.width / viewport.zoom,
    height: stage.height / viewport.zoom,
  }
}

/** Zooms around a screen-space anchor so the world point under it stays put. */
export function zoomViewportAt(viewport: Viewport, anchor: Point, nextZoom: number): Viewport {
  const zoom = clampZoom(nextZoom)
  const world = screenToWorld(anchor, viewport)
  return {
    zoom,
    x: anchor.x - world.x * zoom,
    y: anchor.y - world.y * zoom,
  }
}

/** Viewport that fits `rect` inside `stage`, leaving `padding` pixels around it. */
export function fitRectViewport(rect: Rect, stage: Size, padding = 80, maxZoom = 1.5): Viewport {
  const availableW = Math.max(1, stage.width - padding * 2)
  const availableH = Math.max(1, stage.height - padding * 2)
  const zoom = clamp(
    Math.min(availableW / Math.max(rect.width, 1), availableH / Math.max(rect.height, 1)),
    MIN_ZOOM,
    maxZoom,
  )
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  return {
    zoom,
    x: stage.width / 2 - cx * zoom,
    y: stage.height / 2 - cy * zoom,
  }
}

/** Snaps the vector from the origin to (dx, dy) to the nearest 45 degree step. */
export function snapAngle(dx: number, dy: number): Point {
  const length = Math.hypot(dx, dy)
  if (length === 0) return { x: 0, y: 0 }
  const step = Math.PI / 4
  const angle = Math.round(Math.atan2(dy, dx) / step) * step
  return { x: Math.cos(angle) * length, y: Math.sin(angle) * length }
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
