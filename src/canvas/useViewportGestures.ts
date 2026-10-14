import { useEffect, type RefObject } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { clampZoom, zoomViewportAt } from '@/utils/geometry'
import { gestureState } from './gestureState'
import { setViewportImmediate } from './viewport'

const LINE_HEIGHT_PX = 16

/**
 * Wheel and touch gestures for moving around the board.
 *  - Wheel / two-finger scroll pans.
 *  - Ctrl/Cmd + wheel and trackpad pinch zoom around the pointer.
 *  - Two-finger pinch on touch screens zooms and pans.
 *
 * These are native listeners (non-passive) because Konva's synthetic events
 * cannot reliably `preventDefault` browser scrolling and page zoom.
 */
export function useViewportGestures(containerRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const localPoint = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const { viewport } = useEditorStore.getState()
      const unit = event.deltaMode === 1 ? LINE_HEIGHT_PX : event.deltaMode === 2 ? 400 : 1
      const deltaX = event.deltaX * unit
      const deltaY = event.deltaY * unit

      if (event.ctrlKey || event.metaKey) {
        const anchor = localPoint(event.clientX, event.clientY)
        setViewportImmediate(zoomViewportAt(viewport, anchor, viewport.zoom * Math.exp(-deltaY * 0.0025)))
        return
      }

      // Shift + wheel scrolls horizontally, matching most design tools.
      const horizontal = event.shiftKey && deltaX === 0 ? deltaY : deltaX
      const vertical = event.shiftKey && deltaX === 0 ? 0 : deltaY
      setViewportImmediate({ ...viewport, x: viewport.x - horizontal, y: viewport.y - vertical })
    }

    // ---- pinch zoom ----
    interface PinchStart {
      distance: number
      zoom: number
      center: { x: number; y: number }
      viewportX: number
      viewportY: number
    }
    let pinch: PinchStart | null = null
    let releaseTimer = 0

    const readTouches = (event: TouchEvent) => {
      const a = event.touches[0]
      const b = event.touches[1]
      if (!a || !b) return null
      const pa = localPoint(a.clientX, a.clientY)
      const pb = localPoint(b.clientX, b.clientY)
      return {
        distance: Math.hypot(pa.x - pb.x, pa.y - pb.y),
        center: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 },
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return
      const reading = readTouches(event)
      if (!reading || reading.distance < 1) return
      window.clearTimeout(releaseTimer)
      gestureState.pinching = true
      gestureState.cancelPointerGesture?.()
      const { viewport } = useEditorStore.getState()
      pinch = {
        distance: reading.distance,
        zoom: viewport.zoom,
        center: reading.center,
        viewportX: viewport.x,
        viewportY: viewport.y,
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!pinch || event.touches.length !== 2) return
      const reading = readTouches(event)
      if (!reading) return
      event.preventDefault()

      const zoom = clampZoom(pinch.zoom * (reading.distance / pinch.distance))
      // World point that was under the initial midpoint stays under the current midpoint.
      const worldX = (pinch.center.x - pinch.viewportX) / pinch.zoom
      const worldY = (pinch.center.y - pinch.viewportY) / pinch.zoom
      setViewportImmediate({
        zoom,
        x: reading.center.x - worldX * zoom,
        y: reading.center.y - worldY * zoom,
      })
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length >= 2) return
      pinch = null
      // Keep ignoring pointer input briefly so the lifted finger does not trigger a click.
      window.clearTimeout(releaseTimer)
      releaseTimer = window.setTimeout(() => {
        gestureState.pinching = false
      }, 120)
    }

    // Safari fires proprietary gesture events that would zoom the whole page.
    const blockGesture = (event: Event) => event.preventDefault()

    element.addEventListener('wheel', onWheel, { passive: false })
    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('touchend', onTouchEnd, { passive: true })
    element.addEventListener('touchcancel', onTouchEnd, { passive: true })
    element.addEventListener('gesturestart', blockGesture)
    element.addEventListener('gesturechange', blockGesture)

    return () => {
      window.clearTimeout(releaseTimer)
      gestureState.pinching = false
      element.removeEventListener('wheel', onWheel)
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
      element.removeEventListener('touchcancel', onTouchEnd)
      element.removeEventListener('gesturestart', blockGesture)
      element.removeEventListener('gesturechange', blockGesture)
    }
  }, [containerRef])
}
