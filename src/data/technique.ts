import type { ProgressionId } from '../types'

/**
 * How to perform each movement well. Drawn from C-Mass: chapter 3 (bodypart tactics)
 * and the Ten Commandments of calisthenics mass. Step-by-step detail per rung of the
 * ladder lives on Step.how once a source for it is shared.
 */
export interface Technique {
  /** What the movement is for, in a sentence. */
  why: string
  /** Form and loading points. */
  points: string[]
}

export const TECHNIQUE: Record<ProgressionId, Technique> = {
  pushup: {
    why: 'The pushup family is the foundation of chest, front-shoulder, and triceps work.',
    points: [
      'Full range. Lower until the chest is about a fist from the floor, then press to a soft lockout.',
      'Hand width steers the load. Shoulder width is strongest. Closer turns it into a triceps exercise. Wider brings in the shoulders and chest.',
      'Lower under control and press back up without bouncing off the bottom.',
      'If your arms always take over and your chest never feels it, dips are the fix later on. Not a reason to skip the ladder.',
    ],
  },
  squat: {
    why: 'Squatting is the foundation of all leg training and of human movement. The one-leg squat is the end goal.',
    points: [
      'All the way down, slowly, until the calves and hamstrings press together. Then push the piston back up.',
      'No bouncing, no rocking. Heels stay flat.',
      'Full range protects the knees. Short-stroke squats build muscle but do nothing for the joints and tendons.',
      'Squats already work the hamstrings alongside the quads, so there is no need for extra leg-curl style work.',
    ],
  },
  pullup: {
    why: 'The vertical pull-up is the mainstay of back training and the best lat builder there is.',
    points: [
      'Dead hang at the bottom, chin over the bar at the top, and lower under control.',
      'A medium, shoulder-width grip works the lats best. Wide grip shifts work to the rear shoulders. Close grip hits the biceps.',
      'The early horizontal steps fix the forward-reaching posture most people carry. Do them strictly and for high reps.',
      'Pull-ups work the triceps too, so do not be surprised when your arms feel it.',
    ],
  },
  legraise: {
    why: 'Leg raises are a compound midsection exercise: abs, hip flexors, and the front of the thighs working as one chain.',
    points: [
      'Treat this like pull-ups or squats, not a light finisher. Work hard and progressively and count reps.',
      'Slow and controlled. No swinging or kipping to get the legs up.',
      'Never swap it for crunches or other isolation work. A chain with one strong link breaks.',
      'Hanging versions later on also load the grip, arms, lats, and ribcage muscles. That is the point.',
    ],
  },
  bridge: {
    why: 'Bridging works the entire posterior chain and is the only way to work the whole length of the spinal muscles.',
    points: [
      'Push through the heels, not the toes. Toes shift the load to the quads. Heels light up the hamstrings and the whole back of the body.',
      'Arching back closes the spinal joints, which is the safe direction to load them. Rise and lower slowly anyway.',
      'For the straight bridge, sit back down and press up through the heels. Slow, strict, high reps.',
      'Bridging also trains the triceps and the traps, so it earns its place in a push-heavy week.',
    ],
  },
  handstand: {
    why: 'Handstand work is the best builder of the side deltoids, the head that makes shoulders wide.',
    points: [
      'Use the wall for muscle work. Lower skill means more effort goes into the muscles, not into balancing.',
      'Hand width again. Close hands make it an elbow and triceps feat. Wide hands make the side deltoids scream.',
      'Move up and down with control. Do not drop into the bottom position.',
      'The static holds in the early steps build the shoulder well on their own. Do not rush past them.',
    ],
  },
}

/** The rules that apply to every exercise, from the Ten Commandments. */
export const RULES = [
  'Dynamic, full-range reps. Six to twenty per set, with about ten the sweet spot for muscle.',
  'Push hard, but leave a rep or two in the tank. Muscle is built by draining it, not by failing.',
  'Warm up, then two hard sets. More sets is not more progress.',
  'Beat last time by at least one rep. When you hit the goal for your step, move up.',
]
