import type { Progression, ProgressionId, Step } from '../types'
import { STEP_DETAILS } from './cc1-steps'

/**
 * The Big Six ladders with the three standards per step, transcribed from the Training Goals
 * tables in Convict Conditioning, chapters 5 to 10. The master step's third standard is the
 * book's "Elite standard".
 */
type Std = readonly [sets: number, reps: number]
const r = (n: number, name: string, b: Std, i: Std, p: Std, cue?: string, perSide?: boolean): Step => ({
  n,
  name,
  unit: 'reps',
  beginner: { sets: b[0], reps: b[1] },
  intermediate: { sets: i[0], reps: i[1] },
  goal: { sets: p[0], reps: p[1] },
  start: b[1],
  cue,
  perSide,
})
const hold = (n: number, name: string, b: number, i: number, p: number, cue?: string): Step => ({
  n,
  name,
  unit: 'seconds',
  beginner: { sets: 1, reps: b },
  intermediate: { sets: 1, reps: i },
  goal: { sets: 1, reps: p },
  start: b,
  cue,
})

export const PROGRESSIONS: Record<ProgressionId, Progression> = {
  pushup: {
    id: 'pushup',
    name: 'Push-up',
    short: 'Push',
    steps: [
      r(1, 'Wall Push-ups', [1, 10], [2, 25], [3, 50], 'Stand arm’s length from a wall, hands at chest height.'),
      r(2, 'Incline Push-ups', [1, 10], [2, 20], [3, 40], 'Hands on a surface about hip height.'),
      r(3, 'Kneeling Push-ups', [1, 10], [2, 15], [3, 30]),
      r(4, 'Half Push-ups', [1, 8], [2, 12], [2, 25], 'Lower until elbows are at 90°.'),
      r(5, 'Full Push-ups', [1, 5], [2, 10], [2, 20], 'Chest one fist from the floor.'),
      r(6, 'Close Push-ups', [1, 5], [2, 10], [2, 20], 'Hands touching under the chest.'),
      r(7, 'Uneven Push-ups', [1, 5], [2, 10], [2, 20], 'One hand on a ball or block. Reps per side.', true),
      r(8, 'Half One-Arm Push-ups', [1, 5], [2, 10], [2, 20], undefined, true),
      r(9, 'Lever Push-ups', [1, 5], [2, 10], [2, 20], 'One hand on a ball out to the side.', true),
      r(10, 'One-Arm Push-ups', [1, 5], [2, 10], [1, 100], undefined, true),
    ],
  },
  squat: {
    id: 'squat',
    name: 'Squat',
    short: 'Squat',
    steps: [
      r(1, 'Shoulderstand Squats', [1, 10], [2, 25], [3, 50], 'On your back, hips up, bend knees toward your face.'),
      r(2, 'Jackknife Squats', [1, 10], [2, 20], [3, 40], 'Hands on a knee-height surface for support.'),
      r(3, 'Supported Squats', [1, 10], [2, 15], [3, 30], 'Hold something sturdy in front of you.'),
      r(4, 'Half Squats', [1, 8], [2, 35], [2, 50], 'Thighs parallel to the floor.'),
      r(5, 'Full Squats', [1, 5], [2, 10], [2, 30], 'All the way down, heels flat.'),
      r(6, 'Close Squats', [1, 5], [2, 10], [2, 20], 'Feet together.'),
      r(7, 'Uneven Squats', [1, 5], [2, 10], [2, 20], 'One foot on a ball or block. Reps per side.', true),
      r(8, 'Half One-Leg Squats', [1, 5], [2, 10], [2, 20], undefined, true),
      r(9, 'Assisted One-Leg Squats', [1, 5], [2, 10], [2, 20], 'Hold a doorframe or bar lightly.', true),
      r(10, 'One-Leg Squats', [1, 5], [2, 10], [2, 50], undefined, true),
    ],
  },
  pullup: {
    id: 'pullup',
    name: 'Pull-up',
    short: 'Pull',
    steps: [
      r(1, 'Vertical Pulls', [1, 10], [2, 20], [3, 40], 'Hold a doorframe or pole, lean back, pull yourself in.'),
      r(2, 'Horizontal Pulls', [1, 10], [2, 20], [3, 30], 'Body straight under a low bar or table edge.'),
      r(3, 'Jackknife Pulls', [1, 10], [2, 15], [3, 20], 'Feet on a chair in front, legs assist.'),
      r(4, 'Half Pull-ups', [1, 8], [2, 11], [2, 15], 'Start with elbows at 90°.'),
      r(5, 'Full Pull-ups', [1, 5], [2, 8], [2, 10], 'Dead hang to chin over bar.'),
      r(6, 'Close Pull-ups', [1, 5], [2, 8], [2, 10], 'Hands touching.'),
      r(7, 'Uneven Pull-ups', [1, 5], [2, 7], [2, 9], 'One hand on the bar, the other on that wrist.', true),
      r(8, 'Half One-Arm Pull-ups', [1, 4], [2, 6], [2, 8], undefined, true),
      r(9, 'Assisted One-Arm Pull-ups', [1, 3], [2, 5], [2, 7], 'Free hand holds a towel over the bar.', true),
      r(10, 'One-Arm Pull-ups', [1, 1], [2, 3], [2, 6], undefined, true),
    ],
  },
  legraise: {
    id: 'legraise',
    name: 'Leg Raise',
    short: 'Core',
    steps: [
      r(1, 'Knee Tucks', [1, 10], [2, 25], [3, 40], 'Seated on the edge of a chair, pull knees to chest.'),
      r(2, 'Flat Knee Raises', [1, 10], [2, 20], [3, 35]),
      r(3, 'Flat Bent Leg Raises', [1, 10], [2, 15], [3, 30]),
      r(4, 'Flat Frog Raises', [1, 8], [2, 15], [3, 25], 'Raise bent, straighten at the top, lower straight.'),
      r(5, 'Flat Straight Leg Raises', [1, 5], [2, 10], [2, 20]),
      r(6, 'Hanging Knee Raises', [1, 5], [2, 10], [2, 15]),
      r(7, 'Hanging Bent Leg Raises', [1, 5], [2, 10], [2, 15]),
      r(8, 'Hanging Frog Raises', [1, 5], [2, 10], [2, 15]),
      r(9, 'Partial Straight Leg Raises', [1, 5], [2, 10], [2, 15]),
      r(10, 'Hanging Straight Leg Raises', [1, 5], [2, 10], [2, 30]),
    ],
  },
  bridge: {
    id: 'bridge',
    name: 'Bridge',
    short: 'Bridge',
    steps: [
      r(1, 'Short Bridges', [1, 10], [2, 25], [3, 50], 'On your back, feet flat, push the hips up. Squeeze at the top.'),
      r(2, 'Straight Bridges', [1, 10], [2, 20], [3, 40], 'Sit with legs straight, hands behind, lift the hips until the body is a line.'),
      r(3, 'Angled Bridges', [1, 8], [2, 15], [3, 30], 'Hands on a bed or bench behind you, feet on the floor.'),
      r(4, 'Head Bridges', [1, 8], [2, 15], [2, 25], 'Crown of the head rests lightly on the floor at the top.'),
      r(5, 'Half Bridges', [1, 8], [2, 15], [2, 20], 'A ball or block under the lower back marks the bottom.'),
      r(6, 'Full Bridges', [1, 6], [2, 10], [2, 15], 'Arms and legs as straight as you can, hips high.'),
      r(7, 'Wall Walking Bridges (Down)', [1, 3], [2, 6], [2, 10], 'Walk the hands down a wall into a bridge.'),
      r(8, 'Wall Walking Bridges (Up)', [1, 2], [2, 4], [2, 8], 'From the bridge, walk the hands back up the wall.'),
      r(9, 'Closing Bridges', [1, 1], [2, 3], [2, 6], 'Bend back from standing into a bridge, no wall.'),
      r(10, 'Stand-to-Stand Bridges', [1, 1], [2, 3], [2, 10], 'Standing to bridge and back to standing. Elite standard is 2 sets of 10 to 30.'),
    ],
  },
  handstand: {
    id: 'handstand',
    name: 'Handstand Push-up',
    short: 'Handstand',
    steps: [
      hold(1, 'Wall Headstands', 30, 60, 120, 'Head and hands in a tripod, feet against the wall.'),
      hold(2, 'Crow Stands', 10, 30, 60, 'Squat down, knees on the elbows, tip forward onto the hands.'),
      hold(3, 'Wall Handstands', 30, 60, 120, 'Kick up against the wall, arms locked, look at the floor between the hands.'),
      r(4, 'Half Handstand Push-ups', [1, 5], [2, 10], [2, 20], 'Against the wall, lower halfway.'),
      r(5, 'Handstand Push-ups', [1, 5], [2, 10], [2, 15], 'Against the wall, head to the floor and back up.'),
      r(6, 'Close Handstand Push-ups', [1, 5], [2, 9], [2, 12], 'Hands touching.'),
      r(7, 'Uneven Handstand Push-ups', [1, 5], [2, 8], [2, 10], 'One hand on a ball or block.', true),
      r(8, 'Half One-Arm Handstand Push-ups', [1, 4], [2, 6], [2, 8], undefined, true),
      r(9, 'Lever Handstand Push-ups', [1, 3], [2, 4], [2, 6], 'One hand on a ball out to the side.', true),
      r(10, 'One-Arm Handstand Push-ups', [1, 1], [2, 2], [1, 5], undefined, true),
    ],
  },
}

export const PROGRESSION_IDS = Object.keys(PROGRESSIONS) as ProgressionId[]

export function getStep(id: ProgressionId, n: number): Step {
  const steps = PROGRESSIONS[id].steps
  const k = Math.min(Math.max(1, n), steps.length) - 1
  return { ...steps[k], ...STEP_DETAILS[id][k] }
}

/** Muscle-building rep range from C-Mass. */
export const REP_BAND = { min: 6, max: 20, ideal: 10 }
