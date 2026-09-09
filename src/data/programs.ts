import type { Program, ProgressionId, Slot, Unit } from '../types'

/**
 * The five routines from Convict Conditioning, chapter 12, as weekday schedules (Monday first).
 * Transcribed from the printed tables.
 */
const P = (progression: ProgressionId): Slot => ({ key: progression, kind: 'progression', progression })
const C = (key: string, label: string, unit: Unit = 'reps'): Slot => ({ key, kind: 'custom', label, unit })
const REST = { rest: true } as const
const day = (name: string, ...slots: Slot[]) => ({ day: { name, slots } })

const PUSH_CORE = day('Push-ups & Leg Raises', P('pushup'), P('legraise'))
const PULL_LEGS = day('Pull-ups & Squats', P('pullup'), P('squat'))
const HS_BRIDGE = day('Handstand Push-ups & Bridges', P('handstand'), P('bridge'))

export const PROGRAMS: Program[] = [
  {
    id: 'new-blood',
    name: 'New Blood',
    tagline: 'Two short sessions a week. Where everyone should start.',
    level: 1,
    note: 'Two to three work sets per exercise.',
    workSets: 2,
    cycle: [PUSH_CORE, REST, REST, REST, PULL_LEGS, REST, REST],
  },
  {
    id: 'good-behavior',
    name: 'Good Behavior',
    tagline: 'All six movements over three sessions a week. The best basic program there is.',
    level: 2,
    note: 'Two work sets per exercise. Worth returning to no matter how advanced you get.',
    workSets: 2,
    cycle: [PUSH_CORE, REST, PULL_LEGS, REST, HS_BRIDGE, REST, REST],
  },
  {
    id: 'veterano',
    name: 'Veterano',
    tagline: 'One movement a day, six days a week.',
    level: 3,
    note: 'Two to three work sets. Each movement gets a full week to recover.',
    workSets: 2,
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
    tagline: 'Six days a week, every movement twice, with grip, calf, and neck work.',
    level: 4,
    note: 'Three to five work sets. Only after more than a year of hard training, and not all year round.',
    workSets: 3,
    cycle: [
      day('Pull-ups, Squats & Grip', P('pullup'), P('squat'), C('grip', 'Grip work')),
      day('Push-ups, Leg Raises & Calves', P('pushup'), P('legraise'), C('calf', 'Calf work')),
      day('Handstand Push-ups, Bridges & Neck', P('handstand'), P('bridge'), C('neck', 'Neck work')),
      day('Pull-ups, Squats & Grip', P('pullup'), P('squat'), C('grip', 'Grip work')),
      day('Push-ups, Leg Raises & Calves', P('pushup'), P('legraise'), C('calf', 'Calf work')),
      day('Handstand Push-ups, Bridges & Neck', P('handstand'), P('bridge'), C('neck', 'Neck work')),
      REST,
    ],
  },
  {
    id: 'supermax',
    name: 'Supermax',
    tagline: 'Two movements a day, six days a week, at very high volume. Endurance, not strength.',
    level: 5,
    note: 'Ten to fifty work sets per exercise. Only after working through the ten steps and years of hard training.',
    workSets: 10,
    cycle: [PULL_LEGS, PUSH_CORE, HS_BRIDGE, PULL_LEGS, PUSH_CORE, HS_BRIDGE, REST],
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
