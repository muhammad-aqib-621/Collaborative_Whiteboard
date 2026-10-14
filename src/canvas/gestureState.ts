/**
 * Small mutable bridge between the viewport gesture hook (wheel / pinch) and
 * the pointer interaction hook (drawing, selecting). It is deliberately not
 * reactive: it only coordinates in-flight gestures.
 */
export const gestureState: {
  /** True while a two-finger pinch is active; single-pointer tools must ignore input. */
  pinching: boolean
  /** Registered by the pointer interaction hook so a pinch can abort a drawing in progress. */
  cancelPointerGesture: (() => void) | null
} = {
  pinching: false,
  cancelPointerGesture: null,
}
