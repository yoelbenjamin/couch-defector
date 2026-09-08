import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * Horizontal swipe detection on a block that still scrolls vertically.
 * Spread the returned handlers onto the element and pair with `style={{ touchAction: 'pan-y' }}`.
 * The release is tracked on the window, so a swipe that ends outside the element still counts.
 */
export function useSwipe(onSwipe: (dir: 'left' | 'right') => void, threshold = 56) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const cb = useRef(onSwipe)
  cb.current = onSwipe

  useEffect(() => {
    const up = (e: PointerEvent) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      start.current = null
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return
      cb.current(dx < 0 ? 'left' : 'right')
    }
    const cancel = () => {
      start.current = null
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [threshold])

  return {
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    },
  }
}
