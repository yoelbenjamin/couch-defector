import { useEffect, useState } from 'react'
import type { Entry } from '../types'

/**
 * The workout clock is a chain of alternating stretches: work a set, rest, work the next, rest again.
 * Every stretch is stored as an absolute timestamp rather than a running count, so a backgrounded tab,
 * a throttled timer or a reload all come back with the right elapsed time instead of a clock that
 * stopped while nobody was looking.
 */
export type Phase = 'idle' | 'work' | 'rest'

export interface TimerState {
  phase: Phase
  /** Start of the workout. Null before the first set begins. */
  startedAt: number | null
  /** Start of the current stretch of work or rest. */
  phaseStartedAt: number | null
}

export const IDLE_TIMER: TimerState = { phase: 'idle', startedAt: null, phaseStartedAt: null }

export function isTimerState(x: unknown): x is TimerState {
  if (!x || typeof x !== 'object') return false
  const t = x as TimerState
  return (t.phase === 'idle' || t.phase === 'work' || t.phase === 'rest') && (t.startedAt === null || typeof t.startedAt === 'number')
}

/** One set in the workout's running order, with where it sits in `entries`. */
export interface SetRef {
  entryIndex: number
  setIndex: number
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
      name: e.name,
      label: s.warmup ? 'Warm-up' : `Set ${e.sets.slice(0, setIndex).filter((y) => !y.warmup).length + 1}`,
    })),
  )
}

/** The next set to work: the first that has not been timed. Null once every set has a time on it. */
export function nextSet(entries: Entry[]): SetRef | null {
  return runningOrder(entries).find((r) => entries[r.entryIndex].sets[r.setIndex].work === undefined) ?? null
}

/** The set currently being worked, which is the same cursor: it gets its time only when it ends. */
export const currentSet = nextSet

export function elapsedSec(from: number | null, now: number) {
  if (from === null) return 0
  return Math.max(0, Math.round((now - from) / 1000))
}

/**
 * The workout's running time. Once the last set is done the clock freezes at that moment, so the
 * total measures the workout rather than however long it takes to tidy up and press Finish.
 */
export function totalSec(entries: Entry[], timer: TimerState, now: number) {
  if (timer.startedAt === null) return 0
  const finished = nextSet(entries) === null && timer.phase === 'rest'
  return elapsedSec(timer.startedAt, finished ? (timer.phaseStartedAt ?? now) : now)
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

/** A set's own time: seconds while it is short, m:ss once it runs past a minute. */
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
