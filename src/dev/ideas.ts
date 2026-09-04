/**
 * Idea flags: UI variants you can flip live from the prototype controller.
 * Add a flag here, read it with useIdea('key') in a component, and it shows up in the panel.
 */
export type IdeaDef =
  | { kind: 'toggle'; area: string; label: string; description: string; default: boolean }
  | { kind: 'choice'; area: string; label: string; description: string; options: readonly string[]; default: string }

export const IDEAS = {
  todayHero: {
    kind: 'choice',
    area: 'Today',
    label: 'Up-next block',
    description: 'Card keeps it contained. Bold makes the day name the headline.',
    options: ['card', 'bold'],
    default: 'card',
  },
  lastTime: {
    kind: 'choice',
    area: 'Today',
    label: 'Last time detail',
    description: 'Show every hard set, or only the best set.',
    options: ['sets', 'best'],
    default: 'sets',
  },
  trendArrows: {
    kind: 'toggle',
    area: 'Today',
    label: 'Trend arrows',
    description: 'Arrow next to last time when reps moved vs. the session before.',
    default: false,
  },
  coachCopy: {
    kind: 'toggle',
    area: 'Today',
    label: 'Coach one-liners',
    description: 'Short motivational sentences under the headline.',
    default: true,
  },
  statsRow: {
    kind: 'toggle',
    area: 'Today',
    label: 'Stats row',
    description: 'Sessions / streak / program tiles at the bottom.',
    default: true,
  },
} as const satisfies Record<string, IdeaDef>

export type IdeaKey = keyof typeof IDEAS
export type IdeaValue<K extends IdeaKey = IdeaKey> = (typeof IDEAS)[K] extends { options: readonly (infer O)[] }
  ? O
  : boolean
export type IdeaValues = { [K in IdeaKey]: IdeaValue<K> }

export function ideaDefaults(): IdeaValues {
  return Object.fromEntries(Object.entries(IDEAS).map(([k, v]) => [k, v.default])) as IdeaValues
}
export const IDEA_KEYS = Object.keys(IDEAS) as IdeaKey[]
