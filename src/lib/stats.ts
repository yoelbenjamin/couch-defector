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

export function streakWeeks(sessions: Session[], now = new Date()) {
  // Count consecutive calendar weeks (ending this week) with at least one session.
  const weekKey = (d: Date) => {
    const t = new Date(d)
    const day = (t.getDay() + 6) % 7 // Monday = 0
    t.setDate(t.getDate() - day)
    return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
  }
  const weeks = new Set(sessions.filter((s) => s.kind !== 'mobility').map((s) => weekKey(new Date(s.date))))
  let n = 0
  let cursor = weekKey(now)
  while (weeks.has(cursor)) {
    n++
    cursor -= 7 * 86400000
  }
  return n
}
