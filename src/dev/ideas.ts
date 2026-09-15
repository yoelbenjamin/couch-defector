/**
 * Idea flags: UI variants you can flip live from the prototype controller.
 * Add a flag here, read it with useIdea('key') in a component, and it shows up in the panel.
 */
export type IdeaDef =
  | { kind: 'toggle'; area: string; label: string; description: string; default: boolean }
  | { kind: 'choice'; area: string; label: string; description: string; options: readonly string[]; default: string }

export const IDEAS: Record<string, IdeaDef> = {
  gridTray: {
    kind: 'toggle',
    area: 'Grid',
    label: 'Sit the grid in a tray',
    description: 'The same recessed well the cards live in, at a tighter radius. Empty cells read as tiles resting in it.',
    default: false,
  },
  gridCellMaterial: {
    kind: 'toggle',
    area: 'Grid',
    label: 'Trained cells borrow the button material',
    description: 'A one-pixel light edge along the top of each dark cell, the same top-light the primary button has.',
    default: false,
  },
  gridCellShadow: {
    kind: 'toggle',
    area: 'Grid',
    label: 'Lift every empty cell',
    description: "Each white cell gets the inset card's faint shadow, so it reads as a miniature raised tile.",
    default: false,
  },
}

export type IdeaKey = string
export type IdeaValue = boolean | string
export type IdeaValues = Record<IdeaKey, IdeaValue>

export function ideaDefaults(): IdeaValues {
  return Object.fromEntries(Object.entries(IDEAS).map(([k, v]) => [k, v.default]))
}
export const IDEA_KEYS = Object.keys(IDEAS)
