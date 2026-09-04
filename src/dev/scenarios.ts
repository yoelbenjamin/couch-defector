import { getProgram } from '@/data/programs'
import { getStep } from '@/data/progressions'
import type { Entry, ProgressionId, Session, Slot, UserData } from '@/types'
import type { AuthMode } from './proto'

export interface Scenario {
  id: string
  group: string
  name: string
  description: string
  auth?: AuthMode
  build: () => UserData
}

const DAY = 86400000
function iso(daysAgo: number, hour = 18) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return new Date(d.getTime() - daysAgo * DAY).toISOString()
}
function empty(programId: string | null, steps: Partial<Record<ProgressionId, number>> = {}): UserData {
  return { programId, steps, customNames: {}, createdAt: iso(30), sessions: [] }
}
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

interface HistoryOpts {
  programId: string
  /** Weeks of training history to generate. */
  weeks: number
  /** Days since the most recent session. 0 = trained today. */
  daysSinceLast: number
  /** Cycle index of the most recent session. Defaults to the last workout day in the cycle. */
  lastDayIndex?: number
  startSteps?: Partial<Record<ProgressionId, number>>
  /** Make the last session hit the goal on every progression without stepping up. */
  peakLast?: boolean
  seed?: number
}

/** Deterministic, plausible training history: reps creep up, steps advance, the odd session skipped. */
export function history(o: HistoryOpts): UserData {
  const program = getProgram(o.programId)
  const cycle = program.cycle
  const rand = rng(o.seed ?? 7)
  const isRest = (i: number) => 'rest' in cycle[i] && (cycle[i] as { rest?: boolean }).rest === true
  const workoutIdx = cycle.map((_, i) => i).filter((i) => !isRest(i))
  const lastIdx = o.lastDayIndex ?? workoutIdx[workoutIdx.length - 1]

  // Walk the cycle backwards from the last session to build the schedule.
  const schedule: { daysAgo: number; dayIndex: number }[] = []
  let idx = lastIdx
  let daysAgo = o.daysSinceLast
  const horizon = o.weeks * 7 + o.daysSinceLast
  while (daysAgo <= horizon) {
    if (!isRest(idx)) schedule.push({ daysAgo, dayIndex: idx })
    idx = (idx - 1 + cycle.length) % cycle.length
    daysAgo++
  }
  schedule.reverse()

  const state: Partial<Record<ProgressionId, { step: number; reps: number }>> = {}
  const custom: Record<string, number> = {}
  const sessions: Session[] = []

  schedule.forEach((slotDay, i) => {
    const isLast = i === schedule.length - 1
    if (!isLast && rand() < 0.08) return // skipped a day
    const day = (cycle[slotDay.dayIndex] as { day: { name: string; slots: Slot[] } }).day
    const entries: Entry[] = day.slots.map((s): Entry => {
      if (s.kind === 'progression') {
        const st = (state[s.progression] ??= { step: o.startSteps?.[s.progression] ?? 1, reps: getStep(s.progression, o.startSteps?.[s.progression] ?? 1).start })
        const step = getStep(s.progression, st.step)
        let reps = st.reps
        if (isLast && o.peakLast) reps = step.goal.reps
        const hard = Array.from({ length: step.goal.sets }, (_, k) => ({ reps: Math.max(1, reps - (k > 0 && rand() < 0.5 ? 1 : 0)) }))
        const entry: Entry = {
          slotKey: s.key,
          name: step.name,
          unit: step.unit,
          progression: s.progression,
          step: st.step,
          sets: [{ reps: Math.max(1, Math.round(reps / 2)), warmup: true }, ...hard],
        }
        // Advance for next time.
        if (!(isLast && o.peakLast)) {
          if (reps >= step.goal.reps && st.step < 10) {
            st.step++
            st.reps = getStep(s.progression, st.step).start
          } else {
            st.reps = Math.min(step.goal.reps, reps + (rand() < 0.3 ? 2 : 1))
          }
        }
        return entry
      }
      const unit = s.unit ?? 'reps'
      const cur = (custom[s.key] ??= unit === 'seconds' ? 20 : 8)
      custom[s.key] = unit === 'seconds' ? cur + 5 : cur >= 20 ? 10 : cur + 1
      return { slotKey: s.key, name: s.label, unit, sets: [{ reps: cur }, { reps: Math.max(1, cur - 1) }] }
    })
    sessions.push({
      id: `proto-${sessions.length.toString().padStart(3, '0')}`,
      date: iso(slotDay.daysAgo, 7 + Math.floor(rand() * 12)),
      programId: program.id,
      dayIndex: slotDay.dayIndex,
      dayName: day.name,
      entries,
    })
  })

  const steps: Partial<Record<ProgressionId, number>> = {}
  for (const [k, v] of Object.entries(state)) steps[k as ProgressionId] = v!.step
  return { programId: program.id, steps, customNames: {}, createdAt: iso(horizon + 2), sessions }
}

export const SCENARIOS: Scenario[] = [
  { id: 'signed-out', group: 'Account', name: 'Signed out', description: 'The sign-in screen.', auth: 'signed-out', build: () => empty(null) },
  { id: 'new-account', group: 'Account', name: 'New account', description: 'Signed in, no program picked. Onboarding.', build: () => empty(null) },
  { id: 'day-one', group: 'Lifecycle', name: 'Day one', description: 'Program picked, nothing logged yet.', build: () => empty('full-body-basics', { squat: 2, pullup: 1, pushup: 3 }) },
  { id: 'due-today', group: 'Lifecycle', name: 'Workout due', description: 'Three weeks in, rested two days, a session is due.', build: () => history({ programId: 'full-body-basics', weeks: 3, daysSinceLast: 2 }) },
  { id: 'rest-day', group: 'Lifecycle', name: 'Rest day', description: 'Trained yesterday on a train / rest program.', build: () => history({ programId: 'full-body-basics', weeks: 3, daysSinceLast: 1 }) },
  { id: 'done-today', group: 'Lifecycle', name: 'Done today', description: 'Already logged this morning.', build: () => history({ programId: 'full-body-basics', weeks: 3, daysSinceLast: 0 }) },
  { id: 'ready-up', group: 'Lifecycle', name: 'Ready to move up', description: 'Last session hit the goal on every exercise.', build: () => history({ programId: 'full-body-basics', weeks: 5, daysSinceLast: 2, peakLast: true }) },
  { id: 'back-to-back', group: 'Lifecycle', name: 'Back-to-back day', description: 'Upper / Lower split. Upper was yesterday, Lower is due.', build: () => history({ programId: 'upper-lower', weeks: 4, daysSinceLast: 1, lastDayIndex: 0 }) },
  { id: 'long-break', group: 'Lifecycle', name: 'Long break', description: 'Sixteen days off. What does coming back feel like?', build: () => history({ programId: 'full-body-complete', weeks: 6, daysSinceLast: 16 }) },
  {
    id: 'veteran',
    group: 'Volume',
    name: 'Veteran',
    description: 'Twenty weeks on Push / Legs / Pull. Stress-test History and Progress.',
    build: () => history({ programId: 'push-legs-pull', weeks: 20, daysSinceLast: 2, startSteps: { pushup: 4, squat: 4, pullup: 3, legraise: 3, bridge: 2, handstand: 1 } }),
  },
  {
    id: 'advanced',
    group: 'Volume',
    name: 'Advanced athlete',
    description: 'Four-day split, high steps, long lists per day.',
    build: () => history({ programId: 'four-day-a', weeks: 8, daysSinceLast: 1, startSteps: { pushup: 7, squat: 7, pullup: 6, legraise: 6, bridge: 5, handstand: 4 } }),
  },
]

export const SCENARIO_GROUPS = [...new Set(SCENARIOS.map((s) => s.group))]
