import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from 'react'

export interface DaySwiperHandle {
  /** Animate to the previous (-1) or next (+1) day, as a swipe would. */
  go: (dir: 1 | -1) => void
}

interface Props {
  current: number
  /** Key of the day before `current`, always available. */
  prev: number
  /** Key of the day after `current`, or null when `current` is the last day you may view. */
  next: number | null
  render: (key: number) => ReactNode
  /** Neighbour of any day, so back-to-back commits never read a stale prev/next. */
  neighbor: (key: number, dir: 1 | -1) => number | null
  onChange: (key: number) => void
  className?: string
  /** How much of each neighbouring day shows at the screen edge, in px. */
  peek?: number
  /** Space between days, in px. */
  gap?: number
}

const STIFFNESS = 260
const DAMPING = 30
const COMMIT_FRACTION = 0.3
const COMMIT_VELOCITY = 0.45 // px per ms
const DRAG_SLOP = 6

/**
 * Three days side by side on one track: yesterday, today, tomorrow. The track follows the pointer
 * one to one, so dragging slowly shows both days at once. On release the finger's velocity feeds a
 * spring: a flick commits and carries through, a hesitant drag settles back or forward on distance.
 */
const DaySwiper = forwardRef<DaySwiperHandle, Props>(function DaySwiper(
  { current, prev, next, render, neighbor, onChange, className, peek = 22, gap = 12 },
  ref,
) {
  const container = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const panes = useRef<(HTMLDivElement | null)[]>([])
  const cur = useRef(current) // the committed day, ahead of the next render
  const x = useRef(0) // px offset of the track, 0 = current day centred
  const v = useRef(0) // px per second, spring velocity
  const raf = useRef<number | null>(null)
  const drag = useRef<{ id: number; x0: number; y0: number; decided: boolean; active: boolean; samples: { t: number; x: number }[] } | null>(null)
  const suppressClick = useRef(false)

  const width = () => container.current?.clientWidth ?? 1
  /** Distance the track moves to bring a neighbour to the centre. */
  const step = () => width() - 2 * peek + gap

  // Track follows x; each pane scales toward 1 as it approaches the centre, like albums in Cover Flow.
  const apply = useCallback(() => {
    if (track.current) track.current.style.transform = `translate3d(${x.current}px, 0, 0)`
    const st = step()
    panes.current.forEach((el, i) => {
      if (!el) return
      const offset = (i - 1) * st + x.current // 0 = centred
      const t = Math.min(1, Math.abs(offset) / st)
      el.style.transform = `scale(${1 - 0.06 * t})`
      el.style.opacity = String(1 - 0.35 * t)
    })
  }, [peek, gap])

  // rAF stops in hidden documents (backgrounded app, hidden preview); fall back to a timer so a
  // flick that started before the switch still lands on a day.
  const frame = (fn: (now: number) => void) =>
    document.visibilityState === 'hidden' ? (window.setTimeout(() => fn(performance.now()), 16) as unknown as number) : requestAnimationFrame(fn)
  const cancelFrame = (id: number) => {
    cancelAnimationFrame(id)
    window.clearTimeout(id)
  }

  const stop = () => {
    if (raf.current !== null) cancelFrame(raf.current)
    raf.current = null
  }

  /** Spring x toward target, then hand over to the parent when a day was committed. */
  const settle = useCallback(
    (target: number, done?: () => void) => {
      stop()
      let last = performance.now()
      const tick = (now: number) => {
        // Integrate the real elapsed time in small steps, so throttled timers and dropped frames
        // move the spring by how long they took rather than by one frame.
        let remaining = Math.min(0.5, (now - last) / 1000)
        last = now
        while (remaining > 0) {
          const h = Math.min(1 / 120, remaining)
          const a = -STIFFNESS * (x.current - target) - DAMPING * v.current
          v.current += a * h
          x.current += v.current * h
          remaining -= h
        }
        if (Math.abs(x.current - target) < 0.5 && Math.abs(v.current) < 20) {
          x.current = target
          v.current = 0
          apply()
          raf.current = null
          done?.()
          return
        }
        apply()
        raf.current = frame(tick)
      }
      raf.current = frame(tick)
    },
    [apply],
  )

  // Commit the day the moment the direction is decided: swap `current` right away and shift the
  // track by one step so nothing moves on screen, then let the spring close the remaining gap.
  // The header and the card change together, and back-to-back swipes each start from a settled state.
  const commit = useCallback(
    (dir: 1 | -1) => {
      const key = neighbor(cur.current, dir)
      if (key === null) return settle(0)
      cur.current = key
      x.current += dir * step()
      onChange(key)
      settle(0)
    },
    [neighbor, onChange, settle],
  )

  // After a commit the panes re-render around the new day; repaint transforms at the shifted x.
  useLayoutEffect(() => {
    cur.current = current
    apply()
  }, [current, next, apply])

  useImperativeHandle(ref, () => ({ go: (dir) => commit(dir) }), [commit])

  useEffect(() => () => stop(), [])

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    stop()
    drag.current = { id: e.pointerId, x0: e.clientX - x.current, y0: e.clientY, decided: false, active: false, samples: [{ t: e.timeStamp, x: e.clientX }] }
  }

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x0
    if (!d.decided) {
      const ax = Math.abs(e.clientX - (d.x0 + x.current))
      const ay = Math.abs(e.clientY - d.y0)
      if (ax < DRAG_SLOP && ay < DRAG_SLOP) return
      d.decided = true
      if (ay > ax) {
        drag.current = null // vertical: let the page scroll
        return
      }
      d.active = true
      suppressClick.current = true
      try {
        container.current?.setPointerCapture(e.pointerId)
      } catch {
        /* pointer already gone; the drag still works without capture */
      }
    }
    if (!d.active) return
    let nx = dx
    if (neighbor(cur.current, 1) === null && nx < 0) nx = nx * 0.25 // rubber band: nothing lives past today
    x.current = nx
    d.samples.push({ t: e.timeStamp, x: e.clientX })
    if (d.samples.length > 6) d.samples.shift()
    apply()
  }

  const finish = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.active) return
    const w = step()
    const first = d.samples[0]
    const lastS = d.samples[d.samples.length - 1]
    const dt = Math.max(1, lastS.t - first.t)
    const vel = (lastS.x - first.x) / dt // px per ms
    v.current = vel * 1000
    const dx = x.current
    if ((dx < -w * COMMIT_FRACTION || vel < -COMMIT_VELOCITY) && neighbor(cur.current, 1) !== null) commit(1)
    else if (dx > w * COMMIT_FRACTION || vel > COMMIT_VELOCITY) commit(-1)
    else settle(0)
    setTimeout(() => (suppressClick.current = false), 0)
  }

  const paneW = `calc(100% - ${2 * peek}px)`
  const paneStyle = (slot: -1 | 0 | 1): React.CSSProperties => ({
    position: slot === 0 ? 'relative' : 'absolute',
    top: 0,
    left: slot === 0 ? peek : `calc(${peek}px + ${slot} * (100% - ${2 * peek}px + ${gap}px))`,
    width: paneW,
    transformOrigin: 'center center',
    willChange: 'transform, opacity',
  })

  return (
    <div
      ref={container}
      data-day-swiper=""
      className={className}
      style={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <div ref={track} style={{ position: 'relative', willChange: 'transform' }}>
        <div
          aria-hidden
          ref={(el) => {
            panes.current[0] = el
          }}
          style={paneStyle(-1)}
        >
          {render(prev)}
        </div>
        <div
          ref={(el) => {
            panes.current[1] = el
          }}
          style={paneStyle(0)}
        >
          {render(current)}
        </div>
        {next !== null && (
          <div
            aria-hidden
            ref={(el) => {
              panes.current[2] = el
            }}
            style={paneStyle(1)}
          >
            {render(next)}
          </div>
        )}
      </div>
    </div>
  )
})

export default DaySwiper
