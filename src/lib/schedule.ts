import type { Program, Session, WorkoutDay } from '../types'

export interface TodayPlan {
  /** Index into program.cycle of the next workout to do. */
  dayIndex: number
  day: WorkoutDay
  /** True when the cycle says to rest today. */
  restSuggested: boolean
  /** Days since the last logged session, or null when none. */
  daysSince: number | null
  /** Session already logged today for this program, if any. */
  doneToday: Session | null
  /** Warn when the last session was yesterday. */
  trainedYesterday: boolean
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000)
}

export function isRest(c: Program['cycle'][number]): c is { rest: true } {
  return 'rest' in c && c.rest === true
}

export function firstWorkoutIndex(program: Program) {
  return program.cycle.findIndex((c) => !isRest(c))
}

export function planToday(program: Program, sessions: Session[], now = new Date()): TodayPlan {
  const mine = sessions.filter((s) => s.programId === program.id).sort((a, b) => b.date.localeCompare(a.date))
  const last = mine[0] ?? null
  const lastAny = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  const daysSince = lastAny ? daysBetween(new Date(lastAny.date), now) : null
  const doneToday = mine.find((s) => daysBetween(new Date(s.date), now) === 0) ?? null

  if (!last) {
    const idx = firstWorkoutIndex(program)
    return {
      dayIndex: idx,
      day: (program.cycle[idx] as { day: WorkoutDay }).day,
      restSuggested: false,
      daysSince,
      doneToday,
      trainedYesterday: daysSince === 1,
    }
  }

  // Walk the cycle after the last session; count rest days before the next workout.
  const len = program.cycle.length
  let i = (last.dayIndex + 1) % len
  let restDays = 0
  while (isRest(program.cycle[i])) {
    restDays++
    i = (i + 1) % len
    if (restDays > len) break
  }
  const sinceProgram = daysBetween(new Date(last.date), now)
  const restSuggested = !doneToday && sinceProgram <= restDays && sinceProgram >= 0

  return {
    dayIndex: i,
    day: (program.cycle[i] as { day: WorkoutDay }).day,
    restSuggested,
    daysSince,
    doneToday,
    trainedYesterday: daysSince === 1,
  }
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(iso).toLocaleDateString(undefined, opts)
}

export function relativeDay(iso: string, now = new Date()) {
  const d = daysBetween(new Date(iso), now)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return fmtDate(iso)
}
