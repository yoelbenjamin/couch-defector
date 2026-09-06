import type { Program, ProgressionId, Slot } from '../types'

/**
 * The five routines from Convict Conditioning, as weekday schedules (Monday first).
 * Rebuilt from memory of the book at Yoel's request; Supermax's exact layout is the one to double-check.
 */
const P = (progression: ProgressionId): Slot => ({ key: progression, kind: 'progression', progression })
const REST = { rest: true } as const
const day = (name: string, ...slots: Slot[]) => ({ day: { name, slots } })

const PUSH_CORE = day('Push-ups & Leg Raises', P('pushup'), P('legraise'))
const PULL_LEGS = day('Pull-ups & Squats', P('pullup'), P('squat'))
const HS_BRIDGE = day('Handstand Push-ups & Bridges', P('handstand'), P('bridge'))
const ALL_SIX = day('All Six', P('pullup'), P('squat'), P('pushup'), P('legraise'), P('handstand'), P('bridge'))

export const PROGRAMS: Program[] = [
  {
    id: 'new-blood',
    name: 'New Blood',
    tagline: 'Two short sessions a week. Where everyone should start.',
    level: 1,
    note: 'Two to three work sets per exercise. Handstands and bridges wait until the first four movements feel easy.',
    workSets: 2,
    cycle: [PUSH_CORE, REST, REST, REST, PULL_LEGS, REST, REST],
  },
  {
    id: 'good-behavior',
    name: 'Good Behavior',
    tagline: 'Three sessions a week covering all six movements.',
    level: 2,
    note: 'Two to three work sets per exercise.',
    workSets: 2,
    cycle: [PUSH_CORE, PULL_LEGS, REST, REST, HS_BRIDGE, REST, REST],
  },
  {
    id: 'veterano',
    name: 'Veterano',
    tagline: 'One movement a day, six days a week, with more sets.',
    level: 3,
    note: 'Three to five work sets. Each movement gets a full week to recover.',
    workSets: 3,
    cycle: [
      day('Pull-ups', P('pullup')),
      day('Bridges', P('bridge')),
      day('Handstand Push-ups', P('handstand')),
      day('Leg Raises', P('legraise')),
      day('Squats', P('squat')),
      day('Push-ups', P('pushup')),
      REST,
    ],
  },
  {
    id: 'solitary-confinement',
    name: 'Solitary Confinement',
    tagline: 'Six days a week, every movement twice.',
    level: 4,
    note: 'Two to three work sets. Only once you recover quickly from Veterano.',
    workSets: 2,
    cycle: [PULL_LEGS, PUSH_CORE, HS_BRIDGE, PULL_LEGS, PUSH_CORE, HS_BRIDGE, REST],
  },
  {
    id: 'supermax',
    name: 'Supermax',
    tagline: 'All six movements, six days a week. For exceptional recovery only.',
    level: 5,
    note: 'Two work sets per exercise. Check this layout against the book before trusting it.',
    workSets: 2,
    cycle: [ALL_SIX, ALL_SIX, ALL_SIX, ALL_SIX, ALL_SIX, ALL_SIX, REST],
  },
]

export const DEFAULT_PROGRAM_ID = 'new-blood'

export function isProgramId(id: string | null | undefined): id is string {
  return !!id && PROGRAMS.some((p) => p.id === id)
}

export function getProgram(id: string | null | undefined): Program {
  return PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0]
}

export function workoutDays(program: Program) {
  return program.cycle
    .map((c, index) => ({ c, index }))
    .filter((x): x is { c: { day: { name: string; slots: Slot[] } }; index: number } => !('rest' in x.c && x.c.rest))
    .map((x) => ({ index: x.index, day: x.c.day }))
}

export function progressionsIn(program: Program): ProgressionId[] {
  const set = new Set<ProgressionId>()
  for (const c of program.cycle) {
    if ('rest' in c && c.rest) continue
    for (const s of (c as { day: { slots: Slot[] } }).day.slots) if (s.kind === 'progression') set.add(s.progression)
  }
  return [...set]
}
