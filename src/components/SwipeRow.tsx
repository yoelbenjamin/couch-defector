import { useRef, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

const ACTION_W = 56
/** Release past this and the row stays open on the action. */
const OPEN_AT = 30
/** Carry it this far and the row goes without a second tap. */
const DELETE_AT = 150
const SLOP = 8
const EASE = 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)'

interface Props {
  onDelete: () => void
  /** Spoken name for the action, e.g. "Remove set 2". */
  label: string
  children: ReactNode
}

/**
 * A row you drag left to uncover a delete action, the way a mail list works. A short pull parks it
 * open so the action can be tapped; a long pull deletes on release.
 *
 * The row is marked so the day carousel leaves gestures that start here alone, otherwise a swipe
 * over a set would be claimed by whichever handler decided first.
 */
export default function SwipeRow({ onDelete, label, children }: Props) {
  const sled = useRef<HTMLDivElement>(null)
  const open = useRef(false)
  const drag = useRef<{ id: number; x0: number; y0: number; base: number; decided: boolean; active: boolean } | null>(null)
  const suppressClick = useRef(false)

  const place = (x: number, animate: boolean) => {
    const el = sled.current
    if (!el) return
    el.style.transition = animate ? EASE : 'none'
    el.style.transform = `translate3d(${x}px, 0, 0)`
  }
  const settle = (x: number) => {
    open.current = x !== 0
    place(x, true)
  }

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: open.current ? -ACTION_W : 0, decided: false, active: false }
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
    const x = d.base + dx
    place(x > 0 ? x * 0.25 : x, false) // rubber band: nothing lives to the right
  }

  const finish = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.active) return
    const x = d.base + (e.clientX - d.x0)
    if (x < -DELETE_AT) {
      place(-(sled.current?.clientWidth ?? 400), true)
      window.setTimeout(onDelete, 180)
      return
    }
    settle(x < -OPEN_AT ? -ACTION_W : 0)
    window.setTimeout(() => (suppressClick.current = false), 0)
  }

  return (
    <div
      className="relative overflow-hidden"
      data-no-day-swipe=""
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onClickCapture={(e) => {
        // A drag must not land as a tap, and while the action is showing a tap anywhere else closes it.
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
      <button
        data-swipe-action=""
        type="button"
        aria-label={label}
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex items-center justify-center"
        style={{ width: ACTION_W }}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
          <Trash2 className="size-4" />
        </span>
      </button>
      <div ref={sled} className="relative bg-white" style={{ willChange: 'transform' }}>
        {children}
      </div>
    </div>
  )
}
