export type ProgressionId =
  | 'pushup'
  | 'squat'
  | 'pullup'
  | 'legraise'
  | 'bridge'
  | 'handstand'

export type Unit = 'reps' | 'seconds'

/** The three Trifecta holds from Convict Conditioning 2. */
export type HoldId = 'bridgehold' | 'lhold' | 'twist'

export interface Standard {
  sets: number
  reps: number
}

export interface Step {
  n: number
  name: string
  unit: Unit
  /** Beginner standard: where you start on this step. One set, or a short hold. */
  beginner: Standard
  /** Intermediate standard: solid at the step. */
  intermediate: Standard
  /** Progression standard. Reach this to move to the next step. */
  goal: Standard
  /** Reps of the beginner standard, kept for callers that want a single starting number. */
  start: number
  cue?: string
  /** Reps are counted per side (steps 7 to 10 of the one-limb ladders). */
  perSide?: boolean
  /** Performance paragraphs from the book. */
  how?: string[]
  /** Perfecting Your Technique note from the book. */
  technique?: string
  /** Demonstration photographs, start and finish. */
  images?: string[]
  captions?: string[]
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
  /** Set for Trifecta entries; `step` then indexes that hold's ladder. */
  hold?: HoldId
  step?: number
  sets: SetEntry[]
}

export interface Session {
  id: string
  date: string // ISO
  programId: string
  dayIndex: number
  dayName: string
  /** Missing means a strength workout. Mobility sessions never count as training. */
  kind?: 'workout' | 'mobility'
  entries: Entry[]
  note?: string
}

export interface Profile {
  programId: string | null
  steps: Partial<Record<ProgressionId, number>>
  /** Current step on each Trifecta hold. */
  holdSteps?: Partial<Record<HoldId, number>>
  customNames: Record<string, string>
  createdAt: string
}

export interface UserData extends Profile {
  sessions: Session[]
}
