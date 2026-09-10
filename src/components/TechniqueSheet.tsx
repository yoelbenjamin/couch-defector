import { getStep, PROGRESSIONS } from '@/data/progressions'
import { TECHNIQUE } from '@/data/technique'
import { fmtStandard } from '@/lib/stats'
import HowToSheet, { type HowTo } from '@/components/HowToSheet'
import type { Entry } from '@/types'

/** "How to do it" for one ladder step: the photographs, the three standards, and the movement's purpose. */
export default function TechniqueSheet({ entry, open, onOpenChange }: { entry: Entry | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const step = entry?.progression && entry.step ? getStep(entry.progression, entry.step) : null
  const how: HowTo | null =
    entry?.progression && step
      ? {
          title: step.name,
          subtitle: `${PROGRESSIONS[entry.progression].name} · step ${step.n} of 10`,
          images: step.images,
          captions: step.captions,
          stats: [
            { label: 'Beginner', value: fmtStandard(step.beginner, step.unit) },
            { label: 'Intermediate', value: fmtStandard(step.intermediate, step.unit) },
            { label: step.n === 10 ? 'Elite' : 'Progression', value: fmtStandard(step.goal, step.unit) },
          ],
          statsNote: `${step.perSide ? 'Both sides. ' : ''}Start at the beginner standard. ${
            step.n === 10 ? 'The elite standard is the end of the ladder.' : 'Hit the progression standard and move up a step.'
          }`,
          sections: [
            { heading: 'This step', paragraphs: step.how ?? (step.cue ? [step.cue] : []) },
            ...(step.technique ? [{ heading: 'Perfecting your technique', paragraphs: [step.technique] }] : []),
            { heading: PROGRESSIONS[entry.progression].name, paragraphs: [TECHNIQUE[entry.progression].why], muted: true },
          ],
        }
      : null
  return <HowToSheet how={how} open={open} onOpenChange={onOpenChange} />
}
