import type { Program, ProgressionId, Slot, Unit } from '../types'

const P = (key: string, progression: ProgressionId): Slot => ({ key, kind: 'progression', progression })
const C = (key: string, label: string, unit: Unit = 'reps'): Slot => ({ key, kind: 'custom', label, unit })
const REST = { rest: true } as const
const day = (name: string, ...slots: Slot[]) => ({ day: { name, slots } })

export const PROGRAMS: Program[] = [
  {
    id: 'full-body-basics',
    name: 'Full Body Basics',
    tagline: 'Three big movements. The fastest way to get strong.',
    level: 1,
    note: 'Train, then rest a day. If that is too much, do this on Mon / Wed / Fri and rest weekends.',
    cycle: [day('Full Body', P('squat', 'squat'), P('pullup', 'pullup'), P('pushup', 'pushup')), REST],
  },
  {
    id: 'full-body-complete',
    name: 'Full Body Complete',
    tagline: 'All six movement patterns every session.',
    level: 2,
    cycle: [
      day(
        'Full Body',
        P('squat', 'squat'),
        P('pushup', 'pushup'),
        P('legraise', 'legraise'),
        P('pullup', 'pullup'),
        P('bridge', 'bridge'),
        P('handstand', 'handstand'),
      ),
      REST,
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    tagline: 'Two workouts, then a rest day.',
    level: 3,
    cycle: [
      day('Upper Body', P('pushup', 'pushup'), P('pullup', 'pullup'), P('handstand', 'handstand')),
      day('Lower Body', P('squat', 'squat'), P('bridge', 'bridge'), P('legraise', 'legraise')),
      REST,
    ],
  },
  {
    id: 'upper-lower-plus',
    name: 'Upper / Lower Plus',
    tagline: 'Upper / Lower with rows and calves. Rest between every workout.',
    level: 3,
    cycle: [
      day(
        'Upper Body',
        P('pushup', 'pushup'),
        P('pullup', 'pullup'),
        P('handstand', 'handstand'),
        C('row', 'Australian Pull-ups'),
      ),
      REST,
      day('Lower Body', C('calf', 'Calf Raises'), P('squat', 'squat'), P('bridge', 'bridge'), P('legraise', 'legraise')),
      REST,
    ],
  },
  {
    id: 'push-legs-pull',
    name: 'Push / Legs / Pull',
    tagline: 'Three-day split with arm and grip work.',
    level: 4,
    cycle: [
      day('Push', P('handstand', 'handstand'), P('pushup', 'pushup'), C('biceps', 'Biceps Exercise'), C('hang', 'Bar Hang', 'seconds')),
      day('Legs', P('squat', 'squat'), P('bridge', 'bridge'), P('legraise', 'legraise'), C('calf', 'Calf Raises')),
      day('Pull', P('pullup', 'pullup'), C('row', 'Australian Pull-ups'), C('triceps', 'Triceps Exercise'), C('fingertip', 'Fingertip Push-ups')),
      REST,
    ],
  },
  {
    id: 'push-pull-legs-plus',
    name: 'Push / Pull / Legs Plus',
    tagline: 'Five exercises a day with rest days built in.',
    level: 4,
    cycle: [
      day('Push', P('pushup', 'pushup'), P('handstand', 'handstand'), C('dips', 'Dips'), C('triceps', 'Triceps Exercise'), C('fingertip', 'Fingertip Push-ups')),
      REST,
      day('Pull', P('pullup', 'pullup'), C('row', 'Australian Pull-ups'), C('muscleup', 'Muscle-up Work'), C('biceps', 'Biceps Exercise'), C('hang', 'Bar Hang', 'seconds')),
      day('Legs', P('squat', 'squat'), P('bridge', 'bridge'), P('legraise', 'legraise'), C('jumps', 'Box Jumps or Sprints'), C('calf', 'Calf Raises')),
      REST,
    ],
  },
  {
    id: 'four-day-a',
    name: 'Four-Day Split A',
    tagline: 'Chest & shoulders, legs, back, arms.',
    level: 5,
    cycle: [
      day('Chest & Shoulders', C('push1', 'Push-up Variation 1'), P('handstand', 'handstand'), C('push2', 'Push-up Variation 2'), C('shoulder', 'Shoulder Exercise'), C('neck', 'Neck Work')),
      day('Legs', P('legraise', 'legraise'), C('calf', 'Calf Raises'), P('squat', 'squat'), C('quad', 'Quad Exercise'), C('ham', 'Hamstring Exercise'), C('jumps', 'Sprints or Jumps')),
      day('Back', P('pullup', 'pullup'), C('row', 'Horizontal Pull-ups'), P('bridge', 'bridge'), C('bar', 'Bar Exercise')),
      day('Arms', C('biceps', 'Biceps Work'), C('triceps', 'Triceps Work'), C('grip', 'Grip / Forearm Work')),
      REST,
    ],
  },
  {
    id: 'four-day-b',
    name: 'Four-Day Split B',
    tagline: 'Legs, chest, back, shoulders & grip.',
    level: 5,
    cycle: [
      day('Legs', C('calf', 'Calf Raises'), C('ham', 'Hamstring Exercise'), P('squat', 'squat'), C('quad', 'Quad Exercise'), P('legraise', 'legraise'), C('jumps', 'Sprints or Jumps')),
      day('Chest', C('push1', 'Push-up Variation 1'), C('push2', 'Push-up Variation 2'), C('dips', 'Dips'), C('triceps', 'Triceps Exercise'), C('fingertip', 'Fingertip Push-ups'), C('breathing', 'Deep Breathing')),
      day('Back', C('lever', 'Lever Training'), P('pullup', 'pullup'), C('pull2', 'Pull-up Variation 2'), C('row', 'Horizontal Pull-ups'), C('biceps', 'Biceps Exercise'), P('bridge', 'bridge')),
      day('Shoulders & Grip', P('handstand', 'handstand'), C('shoulder', 'Shoulder Exercise'), C('neck', 'Neck Work'), C('grip1', 'Grip Exercise 1'), C('grip2', 'Grip Exercise 2')),
      REST,
    ],
  },
]

export const DEFAULT_PROGRAM_ID = 'full-body-basics'

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
