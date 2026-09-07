export type ProgressionId =
  | 'pushup'
  | 'squat'
  | 'pullup'
  | 'legraise'
  | 'bridge'
  | 'handstand'

export type Unit = 'reps' | 'seconds'

export interface Standard {
  sets: number
  reps: number
}

export interface Step {
  n: number
  name: string
  unit: Unit
  /** Reach this to move to the next step. */
  goal: Standard
  /** A reasonable first-session target. */
  start: number
  cue?: string
  /** Step-by-step performance notes, when a shared source provides them. */
  how?: string[]
  /** Path under /public to a demonstration image, when available. */
  image?: string
}

export interface Progression {
  id: ProgressionId
  name: string
  short: string
  steps: Step[]
}

export type Slot =
  | { key: string; kind: 'progression'; progression: ProgressionId }
  | { key: string; kind: 'custom'; label: string; unit?: Unit }

export interface WorkoutDay {
  name: string
  slots: Slot[]
}

export type CycleDay = { rest: true } | { rest?: false; day: WorkoutDay }

export interface Program {
  id: string
  name: string
  tagline: string
  level: 1 | 2 | 3 | 4 | 5
  note?: string
  /** Default number of hard (non warm-up) sets when there is no previous session to copy. */
  workSets: number
  /** One entry per weekday, Monday first. */
  cycle: CycleDay[]
}

export interface SetEntry {
  reps: number
  warmup?: boolean
}

export interface Entry {
  slotKey: string
  name: string
  unit: Unit
  progression?: ProgressionId
  step?: number
  sets: SetEntry[]
}

export interface Session {
  id: string
  date: string // ISO
  programId: string
  dayIndex: number
  dayName: string
  entries: Entry[]
  note?: string
}

export interface Profile {
  programId: string | null
  steps: Partial<Record<ProgressionId, number>>
  customNames: Record<string, string>
  createdAt: string
}

export interface UserData extends Profile {
  sessions: Session[]
}
