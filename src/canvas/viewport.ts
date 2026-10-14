import type { BoardObject, Viewport } from '@/types/board'
import { useEditorStore } from '@/store/editorStore'
import { clampZoom, fitRectViewport, getObjectsBounds, zoomViewportAt } from '@/utils/geometry'

let animationFrame = 0

export function cancelViewportAnimation(): void {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }
}

export function setViewportImmediate(viewport: Viewport): void {
  cancelViewportAnimation()
  useEditorStore.getState().setViewport(viewport)
}

/** Smoothly moves the viewport to `target` (ease-out cubic). */
export function animateViewportTo(target: Viewport, duration = 220): void {
  cancelViewportAnimation()
  const store = useEditorStore.getState()
  const from = store.viewport
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    store.setViewport(target)
    return
  }
  const startedAt = performance.now()

  const step = (now: number) => {
    const t = Math.min(1, (now - startedAt) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    useEditorStore.getState().setViewport({
      x: from.x + (target.x - from.x) * eased,
      y: from.y + (target.y - from.y) * eased,
      zoom: from.zoom + (target.zoom - from.zoom) * eased,
    })
    animationFrame = t < 1 ? requestAnimationFrame(step) : 0
  }
  animationFrame = requestAnimationFrame(step)
}

/** Zoom around the center of the stage by a multiplicative factor. */
export function zoomBy(factor: number): void {
  const { viewport, stageSize } = useEditorStore.getState()
  animateViewportTo(
    zoomViewportAt(
      viewport,
      { x: stageSize.width / 2, y: stageSize.height / 2 },
      clampZoom(viewport.zoom * factor),
    ),
    160,
  )
}

/** Zoom around the center of the stage to an absolute zoom level. */
export function zoomTo(zoom: number): void {
  const { viewport, stageSize } = useEditorStore.getState()
  animateViewportTo(
    zoomViewportAt(viewport, { x: stageSize.width / 2, y: stageSize.height / 2 }, zoom),
    160,
  )
}

/** Fits the given objects (or the whole board if none) into the view. */
export function fitToObjects(objects: readonly BoardObject[]): void {
  const { stageSize } = useEditorStore.getState()
  if (stageSize.width === 0 || stageSize.height === 0) return
  const bounds = getObjectsBounds(objects)
  if (!bounds) {
    animateViewportTo({ x: stageSize.width / 2, y: stageSize.height / 2, zoom: 1 })
    return
  }
  animateViewportTo(fitRectViewport(bounds, stageSize, 96, 1.5))
}
