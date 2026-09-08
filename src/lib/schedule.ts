import type { Program, Session, WorkoutDay } from '../types'

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Index into a Monday-first week for a date. */
export function weekdayIndex(d: Date) {
  return (d.getDay() + 6) % 7
}

export interface TodayPlan {
  /** Index into program.cycle (Monday = 0) of the workout to show. Today's, or the next one on a rest day. */
  dayIndex: number
  day: WorkoutDay
  /** Weekday name of `day`. */
  weekday: string
  /** True when the schedule says to rest today. */
  restSuggested: boolean
  /** Days since the last logged session, or null when none. */
  daysSince: number | null
  /** Strength session already logged today for this program, if any. */
  doneToday: Session | null
  /** Trifecta logged today, if any. */
  mobilityToday: Session | null
  /** Warn when the last session was yesterday. */
  trainedYesterday: boolean
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function dayKey(d: Date) {
  return startOfDay(d)
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000)
}

export function isRest(c: Program['cycle'][number]): c is { rest: true } {
  return 'rest' in c && c.rest === true
}

/** The programs are weekday schedules: today's slot decides, and a rest day points at the next workout. */
export function planToday(program: Program, sessions: Session[], now = new Date()): TodayPlan {
  const todayIdx = weekdayIndex(now)
  const workouts = sessions.filter((s) => s.kind !== 'mobility')
  const lastAny = [...workouts].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  const daysSince = lastAny ? daysBetween(new Date(lastAny.date), now) : null
  const doneToday = workouts.find((s) => s.programId === program.id && daysBetween(new Date(s.date), now) === 0) ?? null
  const mobilityToday = sessions.find((s) => s.kind === 'mobility' && daysBetween(new Date(s.date), now) === 0) ?? null

  let idx = todayIdx
  const restToday = isRest(program.cycle[idx])
  if (restToday) {
    for (let k = 1; k <= 7; k++) {
      const j = (todayIdx + k) % 7
      if (!isRest(program.cycle[j])) {
        idx = j
        break
      }
    }
  }
  return {
    dayIndex: idx,
    day: (program.cycle[idx] as { day: WorkoutDay }).day,
    weekday: WEEKDAY_LONG[idx],
    restSuggested: restToday && !doneToday,
    daysSince,
    doneToday,
    mobilityToday,
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
  if (d === -1) return 'Tomorrow'
  if (d < 0 && d > -7) return `In ${-d} days`
  if (d > 0 && d < 7) return `${d} days ago`
  return fmtDate(iso)
}
