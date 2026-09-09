/**
 * Idea flags: UI variants you can flip live from the prototype controller.
 * Add a flag here, read it with useIdea('key') in a component, and it shows up in the panel.
 */
export type IdeaDef =
  | { kind: 'toggle'; area: string; label: string; description: string; default: boolean }
  | { kind: 'choice'; area: string; label: string; description: string; options: readonly string[]; default: string }

/** Empty for now: every idea so far has been decided and folded into the app. */
export const IDEAS: Record<string, IdeaDef> = {}

export type IdeaKey = string
export type IdeaValue = boolean | string
export type IdeaValues = Record<IdeaKey, IdeaValue>

export function ideaDefaults(): IdeaValues {
  return Object.fromEntries(Object.entries(IDEAS).map(([k, v]) => [k, v.default]))
}
export const IDEA_KEYS = Object.keys(IDEAS)
