import type { HoldId } from '../types'

/**
 * The Trifecta from Convict Conditioning 2: three holds, each with a five-step ladder.
 * Done on rest days. Names and cues follow chapters 15 to 17; the rules follow "Programming the Trifecta".
 */
export interface HoldStep {
  n: number
  name: string
  cue: string
  /** Demonstration photo from Convict Conditioning 2. */
  image?: string
}
export interface Hold {
  id: HoldId
  name: string
  /** True when each hold is repeated on the other side. */
  perSide?: boolean
  why: string
  steps: HoldStep[]
}

const step = (n: number, name: string, cue: string, image?: string): HoldStep => ({ n, name, cue, image })

export const HOLDS: Record<HoldId, Hold> = {
  bridgehold: {
    id: 'bridgehold',
    name: 'Bridge hold',
    why: 'Contracts the whole back of the body and opens the hips and spine. Do it first: it warms the spine for the L-hold that follows.',
    steps: [
      step(
        1,
        'Short bridge hold',
        'On your back, feet flat near the hips. Push the hips up until knees, hips, and shoulders form a straight line. Hold and breathe.',
        '/holds/bridge-1.jpg',
      ),
      step(
        2,
        'Straight bridge hold',
        'Sit with legs straight, palms on the floor behind you. Lift the hips until the body is a straight line from heels to shoulders. Chin up, eyes on the ceiling.',
        '/holds/bridge-2.jpg',
      ),
      step(
        3,
        'Angled bridge hold',
        'Hands on the edge of a bed or bench behind you, feet on the floor. Push up into an arch with the hips clear. Look at the wall behind you.',
        '/holds/bridge-3.jpg',
      ),
      step(
        4,
        'Head bridge hold',
        'Set up for a full bridge but rest the crown of the head lightly on the floor. Push with the legs; the neck is along for the ride. Lower gently.',
        '/holds/bridge-4.jpg',
      ),
      step(
        5,
        'Bridge hold',
        'The full bridge: arms and legs as straight as you can, chest lifted. Brace the whole body and breathe smoothly. Optimum range; you never need more.',
        '/holds/bridge-5.jpg',
      ),
    ],
  },
  lhold: {
    id: 'lhold',
    name: 'L-hold',
    why: 'Stretches the back and the whole posterior chain under muscular tension, and tones the hips and deep midsection.',
    steps: [
      step(
        1,
        'Bent leg hold',
        'Sit in a sturdy chair with arms. Grip the arms and lift the bent knees off the seat. Over time pull the knees higher, toward the chest.',
        '/holds/lhold-1.jpg',
      ),
      step(
        2,
        'Straight leg hold',
        'Same chair. Lift the legs out straight so the thighs are at least parallel to the floor. Feet together, breathing normal.',
        '/holds/lhold-2.jpg',
      ),
      step(
        3,
        'N-hold',
        'On the floor, hands by the hips, knees bent, feet flat. Press down and lift so only the hands touch. The body makes a backwards N.',
        '/holds/lhold-3.jpg',
      ),
      step(
        4,
        'Uneven N-hold',
        'Take the N-hold and straighten one leg out in front. Swap sides between holds. A gradual bridge to the full L.',
        '/holds/lhold-4.jpg',
      ),
      step(
        5,
        'L-hold',
        'On the floor, legs together and locked, lift into an L. Push from books or the knuckles at first if you need the height. Gut tight, breathe.',
        '/holds/lhold-5.jpg',
      ),
    ],
  },
  twist: {
    id: 'twist',
    name: 'Twist hold',
    perSide: true,
    why: 'Rotates the spine under control and works the lateral chain. Do it last, when the spine and hips are already warm and loose.',
    steps: [
      step(
        1,
        'Straight leg twist hold',
        'Sit with legs straight. Reach one hand across to the opposite knee, plant the other palm behind you, and prop on that arm. Look back. Repeat on the other side.',
        '/holds/twist-1.jpg',
      ),
      step(
        2,
        'Easy twist hold',
        'As before, but bend the near leg and bring it in. Twist and look obliquely back. Same time on each side.',
        '/holds/twist-2.jpg',
      ),
      step(
        3,
        'Half twist hold',
        'Cross one foot over the other knee. Run the opposite arm along the shin to the instep, palm behind, and rotate the neck to look behind you. Twenty smooth seconds here is halfway to the full twist.',
        '/holds/twist-3.jpg',
      ),
      step(
        4,
        '3/4 twist hold',
        'Half twist with a towel. Push the shin-side hand back under the elbow, reach the other hand around the back, and grab the towel. Inch the fingers closer each time.',
        '/holds/twist-4.jpg',
      ),
      step(
        5,
        'Full twist hold',
        'As the 3/4, but the hands clasp behind you without the towel. Lift the chest, rotate to look behind. The advanced template for all twisting.',
        '/holds/twist-5.jpg',
      ),
    ],
  },
}

/** Book order: bridge, then L-hold, then twist. */
export const HOLD_IDS: HoldId[] = ['bridgehold', 'lhold', 'twist']

export function getHoldStep(id: HoldId, n: number): HoldStep {
  const steps = HOLDS[id].steps
  return steps[Math.min(Math.max(1, n), steps.length) - 1]
}

/** The book's target: about twenty seconds of holding per hold, per session. */
export const HOLD_TARGET_SECONDS = 20

/** Default chunking from the book's sample session: about 20 seconds per hold, split up. */
export const DEFAULT_HOLD_SETS = [{ reps: 5 }, { reps: 5 }, { reps: 5 }, { reps: 5 }]

export const TRIFECTA_RULES = [
  'About twenty seconds per hold per session, split into chunks. Under two seconds stops being a hold.',
  'Easy versions. It should energize you, not drain you. Never to failure: this is joint work, not strength training.',
  'Bridge first, then L-hold, then twist. One contracts what the next stretches, so the order keeps everything warm.',
  'Twist holds are done on both sides for the same time.',
  'Stop when you reach the bridge hold, the L-hold, and the full twist. More range than that adds nothing.',
]
