import { getStep, PROGRESSIONS } from '@/data/progressions'
import { TECHNIQUE } from '@/data/technique'
import { fmtStandard } from '@/lib/stats'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Entry } from '@/types'

/** Full-screen "how to do it" for one exercise: the step, the movement, and the rules for every set. */
export default function TechniqueSheet({ entry, open, onOpenChange }: { entry: Entry | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const step = entry?.progression && entry.step ? getStep(entry.progression, entry.step) : null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] gap-0 overflow-y-auto rounded-none p-0">
        {entry && entry.progression && step && (
          <div className="mx-auto max-w-md px-5 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+32px)]">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-2xl font-bold">{step.name}</SheetTitle>
              <SheetDescription>
                {PROGRESSIONS[entry.progression].name} · step {step.n} of 10
              </SheetDescription>
            </SheetHeader>
            {step.images && step.images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {step.images.map((src, i) => (
                  <figure key={src}>
                    <img src={src} alt={step.captions?.[i] ?? step.name} className="w-full rounded-lg" />
                    {step.captions?.[i] && <figcaption className="mt-1 text-xs text-muted-foreground">{step.captions[i]}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-3 divide-x rounded-lg border text-center">
              {(
                [
                  ['Beginner', step.beginner],
                  ['Intermediate', step.intermediate],
                  [step.n === 10 ? 'Elite' : 'Progression', step.goal],
                ] as const
              ).map(([label, std]) => (
                <div key={label} className="px-2 py-2.5">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-semibold tabular-nums">{fmtStandard(std, step.unit)}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {step.perSide ? 'Both sides. ' : ''}Start at the beginner standard.{' '}
              {step.n === 10 ? 'The elite standard is the end of the ladder.' : 'Hit the progression standard and move up a step.'}
            </p>
            <div className="mt-5 space-y-6 text-base">
              <section>
                <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">This step</h3>
                {step.how ? (
                  <div className="space-y-3">
                    {step.how.map((h) => (
                      <p key={h}>{h}</p>
                    ))}
                  </div>
                ) : (
                  step.cue && <p>{step.cue}</p>
                )}
              </section>
              {step.technique && (
                <section>
                  <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">Perfecting your technique</h3>
                  <p>{step.technique}</p>
                </section>
              )}
              <section>
                <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">{PROGRESSIONS[entry.progression].name}</h3>
                <p className="text-muted-foreground">{TECHNIQUE[entry.progression].why}</p>
              </section>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
