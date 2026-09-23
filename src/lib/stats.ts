import { getStep, REP_BAND } from '../data/progressions'
import { dayKey, isRest, weekdayIndex } from './schedule'
import type { Entry, Program, ProgressionId, Session, Standard, Step, Unit } from '../types'

export function hardSets(e: Entry) {
  return e.sets.filter((s) => !s.warmup && s.reps > 0)
}
export function bestSet(e: Entry) {
  return hardSets(e).reduce((m, s) => Math.max(m, s.reps), 0)
}
export function totalReps(e: Entry) {
  return hardSets(e).reduce((t, s) => t + s.reps, 0)
}

/** Most recent entry for a slot (same program), with the session it came from. */
export function lastEntryForSlot(sessions: Session[], programId: string, slotKey: string) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  for (const s of sorted) {
    if (s.programId !== programId) continue
    const e = s.entries.find((x) => x.slotKey === slotKey)
    if (e) return { entry: e, session: s }
  }
  return null
}

/** Up to n most recent entries for a slot (same program), newest first. */
export function recentEntriesForSlot(sessions: Session[], programId: string, slotKey: string, n = 2) {
  const out: { entry: Entry; session: Session }[] = []
  for (const s of [...sessions].sort((a, b) => b.date.localeCompare(a.date))) {
    if (s.programId !== programId) continue
    const e = s.entries.find((x) => x.slotKey === slotKey)
    if (e) out.push({ entry: e, session: s })
    if (out.length >= n) break
  }
  return out
}

/** Most recent entry for a progression at a given step, across programs. */
export function lastEntryForStep(sessions: Session[], progression: ProgressionId, step: number) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  for (const s of sorted) {
    const e = s.entries.find((x) => x.progression === progression && x.step === step)
    if (e) return { entry: e, session: s }
  }
  return null
}

export function entriesForProgression(sessions: Session[], progression: ProgressionId) {
  const out: { session: Session; entry: Entry }[] = []
  for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const e of s.entries) if (e.progression === progression) out.push({ session: s, entry: e })
  }
  return out
}

export type StandardLevel = 'none' | 'beginner' | 'intermediate' | 'progression'

export interface GoalCheck {
  step: Step
  /** Number of hard sets that reached the progression standard's reps. */
  setsAtGoal: number
  /** Progression standard met: move up. */
  reached: boolean
  /** Highest of the three standards met in this entry. */
  level: StandardLevel
  /** Hard sets over the hypertrophy band's top. */
  overBand: boolean
}

function meets(sets: { reps: number }[], std: Standard) {
  return sets.filter((s) => s.reps >= std.reps).length >= std.sets
}

export function fmtStandard(std: Standard, unit: Unit) {
  const u = unit === 'seconds' ? 's' : ''
  return std.sets === 1 && unit === 'seconds' ? `${std.reps}${u}` : `${std.sets} × ${std.reps}${u}`
}

export function checkGoal(entry: Entry): GoalCheck | null {
  if (!entry.progression || !entry.step) return null
  const step = getStep(entry.progression, entry.step)
  const hs = hardSets(entry)
  const setsAtGoal = hs.filter((s) => s.reps >= step.goal.reps).length
  const reached = setsAtGoal >= step.goal.sets
  const level: StandardLevel = reached ? 'progression' : meets(hs, step.intermediate) ? 'intermediate' : meets(hs, step.beginner) ? 'beginner' : 'none'
  // Only meaningful when the step itself lives inside the muscle-building band; early rungs ask for far more reps by design.
  const overBand = step.unit === 'reps' && step.goal.reps <= REP_BAND.max && hs.length > 0 && hs.every((s) => s.reps > REP_BAND.max)
  return { step, setsAtGoal, reached, level, overBand }
}

export function fmtSets(e: Entry) {
  const hs = hardSets(e)
  if (hs.length === 0) return '—'
  const unit = e.unit === 'seconds' ? 's' : ''
  const all = hs.map((s) => s.reps)
  if (all.every((r) => r === all[0])) return `${all.length} × ${all[0]}${unit}`
  return all.map((r) => `${r}${unit}`).join(' / ')
}

export type StreakTier = 'graphite' | 'steel' | 'silver' | 'gold'

export interface StreakInfo {
  /** Calendar days in the current unbroken run, from its first workout through the last day that is safely in it. */
  days: number
  /** "3 days", "2 weeks", "4 months" */
  label: string
  /** Graphite in days, Steel in weeks, Silver in months, Gold from six months. */
  tier: StreakTier
}

/** The day before a day key, stepped through Date so a DST change does not shift it. */
function prevDay(k: number) {
  const d = new Date(k)
  d.setDate(d.getDate() - 1)
  return dayKey(d)
}

/**
 * The streak: every scheduled training day worked, in a row. A scheduled day that passes with nothing
 * logged breaks it, so the badge goes away the day after a miss. Rest days on the program never count
 * against you, and a workout on a rest day still counts for you. The Trifecta is mobility and does
 * not keep a streak alive.
 *
 * Today only counts once today's workout is logged. Until then the run is measured through yesterday,
 * so the badge shows what you have banked, and ticks up when you finish, not when you wake up.
 */
export function streakInfo(sessions: Session[], program: Program, now = new Date()): StreakInfo | null {
  const trained = new Set(sessions.filter((s) => s.kind !== 'mobility').map((s) => dayKey(new Date(s.date))))
  if (trained.size === 0) return null
  const earliest = Math.min(...trained)
  const scheduled = (k: number) => !isRest(program.cycle[weekdayIndex(new Date(k))])

  const today = dayKey(now)
  const pendingToday = scheduled(today) && !trained.has(today)
  const end = pendingToday ? prevDay(today) : today

  let first: number | null = null
  for (let cursor = end; cursor >= earliest; cursor = prevDay(cursor)) {
    if (trained.has(cursor)) first = cursor
    else if (scheduled(cursor)) break // a training day with nothing logged: the run ends here
  }
  if (first === null) return null

  const days = Math.max(1, Math.round((end - first) / 86400000) + 1)
  const months = Math.floor(days / 30.44)
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  if (days < 7) return { days, label: plural(days, 'day'), tier: 'graphite' }
  if (months < 1) return { days, label: plural(Math.floor(days / 7), 'week'), tier: 'steel' }
  if (months < 6) return { days, label: plural(months, 'month'), tier: 'silver' }
  return { days, label: plural(months, 'month'), tier: 'gold' }
}
