import type { Progression, ProgressionId, Step } from '../types'

const r = (n: number, name: string, start: number, sets: number, reps: number, cue?: string): Step => ({
  n,
  name,
  unit: 'reps',
  start,
  goal: { sets, reps },
  cue,
})
const hold = (n: number, name: string, start: number, seconds: number, cue?: string): Step => ({
  n,
  name,
  unit: 'seconds',
  start,
  goal: { sets: 1, reps: seconds },
  cue,
})

export const PROGRESSIONS: Record<ProgressionId, Progression> = {
  pushup: {
    id: 'pushup',
    name: 'Push-up',
    short: 'Push',
    steps: [
      r(1, 'Wall Push-ups', 10, 3, 50, 'Stand arm’s length from a wall, hands at chest height.'),
      r(2, 'Incline Push-ups', 10, 3, 40, 'Hands on a surface about hip height.'),
      r(3, 'Kneeling Push-ups', 10, 3, 30),
      r(4, 'Half Push-ups', 8, 2, 25, 'Lower until elbows are at 90°.'),
      r(5, 'Full Push-ups', 5, 2, 20, 'Chest one fist from the floor.'),
      r(6, 'Close Push-ups', 5, 2, 20, 'Hands touching under the chest.'),
      r(7, 'Uneven Push-ups', 5, 2, 20, 'One hand on a ball or block. Reps per side.'),
      r(8, 'Half One-Arm Push-ups', 5, 2, 20),
      r(9, 'Lever Push-ups', 5, 2, 20, 'One hand on a ball out to the side.'),
      r(10, 'One-Arm Push-ups', 5, 1, 100),
    ],
  },
  squat: {
    id: 'squat',
    name: 'Squat',
    short: 'Squat',
    steps: [
      r(1, 'Shoulderstand Squats', 10, 3, 50, 'On your back, hips up, bend knees toward your face.'),
      r(2, 'Jackknife Squats', 10, 3, 40, 'Hands on a knee-height surface for support.'),
      r(3, 'Supported Squats', 10, 3, 30, 'Hold something sturdy in front of you.'),
      r(4, 'Half Squats', 8, 2, 50, 'Thighs parallel to the floor.'),
      r(5, 'Full Squats', 5, 2, 30, 'All the way down, heels flat.'),
      r(6, 'Close Squats', 5, 2, 20, 'Feet together.'),
      r(7, 'Uneven Squats', 5, 2, 20, 'One foot on a ball or block. Reps per side.'),
      r(8, 'Half One-Leg Squats', 5, 2, 20),
      r(9, 'Assisted One-Leg Squats', 5, 2, 20, 'Hold a doorframe or bar lightly.'),
      r(10, 'One-Leg Squats', 5, 2, 50),
    ],
  },
  pullup: {
    id: 'pullup',
    name: 'Pull-up',
    short: 'Pull',
    steps: [
      r(1, 'Vertical Pulls', 10, 3, 40, 'Hold a doorframe or pole, lean back, pull yourself in.'),
      r(2, 'Horizontal Pulls', 10, 3, 30, 'Body straight under a low bar or table edge.'),
      r(3, 'Jackknife Pulls', 10, 3, 20, 'Feet on a chair in front, legs assist.'),
      r(4, 'Half Pull-ups', 8, 2, 15, 'Start with elbows at 90°.'),
      r(5, 'Full Pull-ups', 5, 2, 10, 'Dead hang to chin over bar.'),
      r(6, 'Close Pull-ups', 5, 2, 10, 'Hands touching.'),
      r(7, 'Uneven Pull-ups', 5, 2, 9, 'One hand on the bar, the other on that wrist.'),
      r(8, 'Half One-Arm Pull-ups', 4, 2, 8),
      r(9, 'Assisted One-Arm Pull-ups', 3, 2, 7, 'Free hand holds a towel over the bar.'),
      r(10, 'One-Arm Pull-ups', 1, 2, 6),
    ],
  },
  legraise: {
    id: 'legraise',
    name: 'Leg Raise',
    short: 'Core',
    steps: [
      r(1, 'Knee Tucks', 10, 3, 40, 'Seated on the edge of a chair, pull knees to chest.'),
      r(2, 'Flat Knee Raises', 10, 3, 35),
      r(3, 'Flat Bent Leg Raises', 10, 3, 30),
      r(4, 'Flat Frog Raises', 8, 3, 25, 'Raise bent, straighten at the top, lower straight.'),
      r(5, 'Flat Straight Leg Raises', 5, 2, 20),
      r(6, 'Hanging Knee Raises', 5, 2, 15),
      r(7, 'Hanging Bent Leg Raises', 5, 2, 15),
      r(8, 'Hanging Frog Raises', 5, 2, 15),
      r(9, 'Partial Straight Leg Raises', 5, 2, 15),
      r(10, 'Hanging Straight Leg Raises', 5, 2, 30),
    ],
  },
  bridge: {
    id: 'bridge',
    name: 'Bridge',
    short: 'Bridge',
    steps: [
      r(1, 'Short Bridges', 10, 3, 50, 'On your back, knees bent, drive hips up.'),
      r(2, 'Straight Bridges', 10, 3, 40, 'Seated, legs straight, hands behind, lift hips.'),
      r(3, 'Angled Bridges', 8, 3, 30, 'Head and hands on a bed or bench.'),
      r(4, 'Head Bridges', 8, 2, 25, 'Crown of the head lightly touching the floor.'),
      r(5, 'Half Bridges', 8, 2, 20, 'Ball or cushion under the lower back as a marker.'),
      r(6, 'Full Bridges', 6, 2, 15),
      r(7, 'Wall Walking Bridges (Down)', 3, 2, 10),
      r(8, 'Wall Walking Bridges (Up)', 2, 2, 8),
      r(9, 'Closing Bridges', 1, 2, 6, 'From standing, bend back and lower into a bridge.'),
      r(10, 'Stand-to-Stand Bridges', 1, 2, 30),
    ],
  },
  handstand: {
    id: 'handstand',
    name: 'Handstand Push-up',
    short: 'Inversion',
    steps: [
      hold(1, 'Wall Headstands', 30, 120, 'Timed hold. Build shoulder and neck tolerance.'),
      hold(2, 'Crow Stands', 10, 60, 'Timed hold. Knees on elbows, weight on hands.'),
      hold(3, 'Wall Handstands', 30, 120, 'Timed hold. Kick up, heels rest on the wall.'),
      r(4, 'Half Handstand Push-ups', 5, 2, 20, 'Lower halfway.'),
      r(5, 'Handstand Push-ups', 5, 2, 15, 'Head lightly touches the floor.'),
      r(6, 'Close Handstand Push-ups', 5, 2, 12),
      r(7, 'Uneven Handstand Push-ups', 5, 2, 10, 'One hand on a block.'),
      r(8, 'Half One-Arm Handstand Push-ups', 4, 2, 8),
      r(9, 'Lever Handstand Push-ups', 3, 2, 6),
      r(10, 'One-Arm Handstand Push-ups', 1, 1, 5),
    ],
  },
}

export const PROGRESSION_IDS = Object.keys(PROGRESSIONS) as ProgressionId[]

export function getStep(id: ProgressionId, n: number): Step {
  const p = PROGRESSIONS[id]
  return p.steps[Math.min(Math.max(n, 1), p.steps.length) - 1]
}

/** Hypertrophy-friendly rep band from the protocol: hard sets of 6–20, ideally ~10. */
export const REP_BAND = { min: 6, max: 20, ideal: 10 }
