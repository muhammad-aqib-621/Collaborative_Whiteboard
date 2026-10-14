import { useLayoutEffect, useState, type RefObject } from 'react'
import type { Size } from '@/types/board'

/** Tracks the content box size of an element using ResizeObserver. */
export function useElementSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => {
      const width = Math.round(element.clientWidth)
      const height = Math.round(element.clientHeight)
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}
