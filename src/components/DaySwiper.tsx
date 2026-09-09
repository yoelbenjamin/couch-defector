import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type PointerEvent as RPointerEvent, type ReactNode } from 'react'

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
  onChange: (key: number) => void
  className?: string
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
const DaySwiper = forwardRef<DaySwiperHandle, Props>(function DaySwiper({ current, prev, next, render, onChange, className }, ref) {
  const container = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const x = useRef(0) // px offset of the track, 0 = current day centred
  const v = useRef(0) // px per second, spring velocity
  const raf = useRef<number | null>(null)
  const drag = useRef<{ id: number; x0: number; y0: number; decided: boolean; active: boolean; samples: { t: number; x: number }[] } | null>(null)
  const suppressClick = useRef(false)
  const pending = useRef<number | null>(null)

  const width = () => container.current?.clientWidth ?? 1

  const apply = useCallback(() => {
    if (track.current) track.current.style.transform = `translate3d(${x.current}px, 0, 0)`
  }, [])

  const stop = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current)
    raf.current = null
  }

  /** Spring x toward target, then hand over to the parent when a day was committed. */
  const settle = useCallback(
    (target: number, done?: () => void) => {
      stop()
      let last = performance.now()
      const tick = (now: number) => {
        const dt = Math.min(1 / 30, (now - last) / 1000)
        last = now
        const a = -STIFFNESS * (x.current - target) - DAMPING * v.current
        v.current += a * dt
        x.current += v.current * dt
        if (Math.abs(x.current - target) < 0.5 && Math.abs(v.current) < 20) {
          x.current = target
          v.current = 0
          apply()
          raf.current = null
          done?.()
          return
        }
        apply()
        raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    },
    [apply],
  )

  const commit = useCallback(
    (dir: 1 | -1) => {
      const key = dir === 1 ? next : prev
      if (key === null) return settle(0)
      pending.current = key
      settle(-dir * width(), () => {
        onChange(key)
      })
    },
    [next, prev, onChange, settle],
  )

  // A committed day arrives as the new `current`: recentre instantly, before paint.
  useLayoutEffect(() => {
    if (pending.current === current) {
      pending.current = null
      x.current = 0
      v.current = 0
      apply()
    }
  }, [current, apply])

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
      container.current?.setPointerCapture(e.pointerId)
    }
    if (!d.active) return
    let nx = dx
    if (next === null && nx < 0) nx = nx * 0.25 // rubber band: nothing lives past today
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
    const w = width()
    const first = d.samples[0]
    const lastS = d.samples[d.samples.length - 1]
    const dt = Math.max(1, lastS.t - first.t)
    const vel = (lastS.x - first.x) / dt // px per ms
    v.current = vel * 1000
    const dx = x.current
    if ((dx < -w * COMMIT_FRACTION || vel < -COMMIT_VELOCITY) && next !== null) commit(1)
    else if (dx > w * COMMIT_FRACTION || vel > COMMIT_VELOCITY) commit(-1)
    else settle(0)
    setTimeout(() => (suppressClick.current = false), 0)
  }

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
        <div aria-hidden style={{ position: 'absolute', top: 0, left: '-100%', width: '100%' }}>
          {render(prev)}
        </div>
        <div>{render(current)}</div>
        {next !== null && (
          <div aria-hidden style={{ position: 'absolute', top: 0, left: '100%', width: '100%' }}>
            {render(next)}
          </div>
        )}
      </div>
    </div>
  )
})

export default DaySwiper
