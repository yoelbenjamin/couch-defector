import { useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react'

/** How far the row must be dragged for the action to be fully shown. */
const TRAVEL = 56
/** Release past this fraction of the travel and the action stays put. */
const OPEN_AT = 0.5
/** Carry it this far in px and the row goes without a second tap. */
const DELETE_AT = 150
const SLOP = 8
const EASE = 'opacity 200ms ease, transform 200ms ease'
/** How far the two circles slide as they trade places. Enough to feel, not enough to jump. */
const SLIDE = 10

export interface SwipeRowState {
  /** 0 closed, 1 fully open on the action. */
  p: number
  /** For the control the action replaces: fades out and steps aside. */
  hide: CSSProperties
  /** For the action itself: fades in and settles into the same slot. */
  show: CSSProperties
  /** Run the deletion. */
  remove: () => void
}

interface Props {
  onDelete: () => void
  children: (state: SwipeRowState) => ReactNode
}

/**
 * A row you drag left to trade one control for a delete, the way a mail list works. Also wraps the
 * note card, where there is nothing to trade and the delete simply appears. A short pull
 * parks the delete in place so it can be tapped, a long pull deletes on release, and a tap anywhere
 * else on the row puts things back. Nothing in the row moves, so the label and the reps stay put and
 * only the control on the right changes hands.
 *
 * The row is marked so the day carousel leaves gestures that start here alone, otherwise a swipe
 * over a set would be claimed by whichever handler decided first.
 */
export default function SwipeRow({ onDelete, children }: Props) {
  const [p, setP] = useState(0)
  const [animate, setAnimate] = useState(true)
  const open = useRef(false)
  const drag = useRef<{ id: number; x0: number; y0: number; base: number; decided: boolean; active: boolean } | null>(null)
  const suppressClick = useRef(false)

  const settle = (next: 0 | 1) => {
    open.current = next === 1
    setAnimate(true)
    setP(next)
  }

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Dragging inside a text field is selecting text, not swiping the row.
    if ((e.target as HTMLElement).closest('textarea, input, select, [contenteditable]')) return
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: open.current ? TRAVEL : 0, decided: false, active: false }
  }

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (!d.decided) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
      d.decided = true
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.current = null // vertical: let the page scroll
        return
      }
      d.active = true
      suppressClick.current = true
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* pointer already gone; the drag still works without capture */
      }
    }
    if (!d.active) return
    setAnimate(false)
    setP(Math.max(0, Math.min(1, (d.base - dx) / TRAVEL)))
  }

  const finish = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.active) return
    const pulled = d.base - (e.clientX - d.x0)
    if (pulled > DELETE_AT) {
      onDelete()
      return
    }
    settle(pulled / TRAVEL > OPEN_AT ? 1 : 0)
    window.setTimeout(() => (suppressClick.current = false), 0)
  }

  const transition = animate ? EASE : 'none'
  const state: SwipeRowState = {
    p,
    hide: { opacity: 1 - p, transform: `translateX(${p * SLIDE}px)`, pointerEvents: p > 0.5 ? 'none' : 'auto', transition },
    show: { opacity: p, transform: `translateX(${(1 - p) * SLIDE}px)`, pointerEvents: p > 0.5 ? 'auto' : 'none', transition },
    remove: onDelete,
  }

  return (
    <div
      data-no-day-swipe=""
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onClickCapture={(e) => {
        // A drag must not land as a tap, and while the delete is showing a tap anywhere else puts it away.
        if (suppressClick.current) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        if (open.current && !(e.target as HTMLElement).closest('[data-swipe-action]')) {
          e.preventDefault()
          e.stopPropagation()
          settle(0)
        }
      }}
    >
      {children(state)}
    </div>
  )
}
