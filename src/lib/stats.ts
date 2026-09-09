import { getStep, REP_BAND } from '../data/progressions'
import type { Entry, ProgressionId, Session, Standard, Step, Unit } from '../types'

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

function weekKey(d: Date) {
  const t = new Date(d)
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7)) // Monday
  return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
}

/** Consecutive calendar weeks with at least one workout, ending this week. The current week may still be pending. */
export function streakWeeks(sessions: Session[], now = new Date()) {
  const weeks = new Set(sessions.filter((s) => s.kind !== 'mobility').map((s) => weekKey(new Date(s.date))))
  let cursor = weekKey(now)
  if (!weeks.has(cursor)) cursor -= 7 * 86400000 // this week is not over yet; last week keeps the streak alive
  let n = 0
  while (weeks.has(cursor)) {
    n++
    cursor -= 7 * 86400000
  }
  return n
}

export type StreakTier = 'graphite' | 'steel' | 'silver' | 'gold'

export interface StreakInfo {
  /** Days since the first workout of the current unbroken run of weeks, inclusive. 0 when there is no streak. */
  days: number
  /** "3 days", "2 weeks", "4 months" */
  label: string
  /** Graphite in days, Steel in weeks, Silver in months, Gold from six months. */
  tier: StreakTier
}

/** The streak as a run of days, labelled in the unit that fits, with its metal. */
export function streakInfo(sessions: Session[], now = new Date()): StreakInfo | null {
  const weeks = streakWeeks(sessions, now)
  if (weeks === 0) return null
  const startWeek = weekKey(now) - (weeks - 1 + (sessions.some((s) => s.kind !== 'mobility' && weekKey(new Date(s.date)) === weekKey(now)) ? 0 : 1)) * 7 * 86400000
  const first = sessions
    .filter((s) => s.kind !== 'mobility' && weekKey(new Date(s.date)) === startWeek)
    .map((s) => new Date(s.date))
    .sort((a, b) => a.getTime() - b.getTime())[0]
  if (!first) return null
  const days = Math.max(1, Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime()) / 86400000) + 1)
  const months = Math.floor(days / 30.44)
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  if (days < 7) return { days, label: plural(days, 'day'), tier: 'graphite' }
  if (months < 1) return { days, label: plural(Math.floor(days / 7), 'week'), tier: 'steel' }
  if (months < 6) return { days, label: plural(months, 'month'), tier: 'silver' }
  return { days, label: plural(months, 'month'), tier: 'gold' }
}
