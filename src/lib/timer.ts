import { useEffect, useState } from 'react'
import type { Entry } from '../types'

/**
 * The workout clock, driven entirely by ticking sets off.
 *
 * One tap per set is the whole interaction, which means one timestamp per set, which means the only
 * thing that can honestly be measured is the gap from finishing one set to finishing the next. That
 * gap is the rest plus the set that follows it; separating the two would need a second tap per set
 * to mark where rest ends and work begins. Rest is what matters here and it dominates the gap, so
 * the gap is what gets recorded, and the code says so rather than pretending to measure pure rest.
 *
 * Timestamps are absolute, so a backgrounded tab, a throttled timer or a reload all come back with
 * the right elapsed time instead of a clock that stopped while nobody was looking.
 */
export interface TimerState {
  /** When the workout began. Null until it is started or the first set is ticked. */
  startedAt: number | null
  /** When each set was ticked off, keyed by `slotKey:setIndex`. Lives in the draft, never saved. */
  ticks: Record<string, number>
}

export const IDLE_TIMER: TimerState = { startedAt: null, ticks: {} }

export const setKey = (slotKey: string, setIndex: number) => `${slotKey}:${setIndex}`

export function isTimerState(x: unknown): x is TimerState {
  if (!x || typeof x !== 'object') return false
  const t = x as TimerState
  return (t.startedAt === null || typeof t.startedAt === 'number') && !!t.ticks && typeof t.ticks === 'object'
}

/** One set in the workout's running order, with where it sits in `entries`. */
export interface SetRef {
  entryIndex: number
  setIndex: number
  key: string
  /** Exercise name. */
  name: string
  /** "Warm-up" or "Set 3", counted within its own exercise. */
  label: string
}

/** Every set across every exercise, in the order they are worked. */
export function runningOrder(entries: Entry[]): SetRef[] {
  return entries.flatMap((e, entryIndex) =>
    e.sets.map((s, setIndex) => ({
      entryIndex,
      setIndex,
      key: setKey(e.slotKey, setIndex),
      name: e.name,
      label: s.warmup ? 'Warm-up' : `Set ${e.sets.slice(0, setIndex).filter((y) => !y.warmup).length + 1}`,
    })),
  )
}

/**
 * Seconds between finishing each set and finishing the one before it, keyed by set.
 * The first set ticked has nothing to measure against, so it gets no interval.
 */
export function restsFromTicks(entries: Entry[], ticks: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  let prev: number | null = null
  for (const ref of runningOrder(entries)) {
    const at = ticks[ref.key]
    if (at === undefined) continue
    if (prev !== null) out[ref.key] = Math.max(0, Math.round((at - prev) / 1000))
    prev = at
  }
  return out
}

/** The most recent tick anywhere in the workout, which is where the live rest clock counts from. */
export function lastTickAt(ticks: Record<string, number>): number | null {
  const all = Object.values(ticks)
  return all.length === 0 ? null : Math.max(...all)
}

/**
 * The set the live rest clock belongs to: the next one not yet ticked, counting from the last tick.
 * Null before the first tick, or once every set is done.
 */
export function liveRest(entries: Entry[], ticks: Record<string, number>): { ref: SetRef; from: number } | null {
  const from = lastTickAt(ticks)
  if (from === null) return null
  const ref = runningOrder(entries).find((r) => ticks[r.key] === undefined)
  return ref ? { ref, from } : null
}

export function elapsedSec(from: number | null, now: number) {
  if (from === null) return 0
  return Math.max(0, Math.round((now - from) / 1000))
}

/** m:ss, or h:mm:ss once it runs past an hour. */
export function fmtClock(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/** A gap between sets: seconds while it is short, m:ss once it runs past a minute. */
export function fmtShort(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return s < 60 ? `${s}s` : fmtClock(s)
}

/** Compact duration for reading back a logged workout: "42s", "18m", "1h 04m". */
export function fmtDuration(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec))
  if (s < 60) return `${s}s`
  const hours = Math.floor(s / 3600)
  const minutes = Math.round((s % 3600) / 60)
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`
}

/**
 * A clock that re-renders about twice a second while it is running, and settles on a visibility
 * change so a tab that was throttled in the background corrects itself the moment it comes back.
 */
export function useNow(running: boolean) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 500)
    const sync = () => setNow(Date.now())
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [running])

  return now
}
