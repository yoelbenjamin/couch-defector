import { getStep, PROGRESSIONS } from '@/data/progressions'
import { RULES, TECHNIQUE } from '@/data/technique'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Entry } from '@/types'

/** Full-screen "how to do it" for one exercise: the step, the movement, and the rules for every set. */
export default function TechniqueSheet({ entry, open, onOpenChange }: { entry: Entry | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const step = entry?.progression && entry.step ? getStep(entry.progression, entry.step) : null
  const suffix = entry?.unit === 'seconds' ? 's' : ''
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] gap-0 overflow-y-auto rounded-none p-0">
        {entry && entry.progression && step && (
          <div className="mx-auto max-w-md px-5 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+32px)]">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-2xl font-bold">{step.name}</SheetTitle>
              <SheetDescription>
                {PROGRESSIONS[entry.progression].name} · step {step.n} of 10 · move up at {step.goal.sets} × {step.goal.reps}
                {suffix}
              </SheetDescription>
            </SheetHeader>
            {step.image && <img src={step.image} alt={step.name} className="mt-4 w-full rounded-lg" />}
            <div className="mt-5 space-y-6 text-[15px] leading-relaxed">
              <section>
                <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">This step</h3>
                {step.cue && <p>{step.cue}</p>}
                {step.how && (
                  <ul className="mt-2 list-disc space-y-1.5 pl-5">
                    {step.how.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">{PROGRESSIONS[entry.progression].name}</h3>
                <p>{TECHNIQUE[entry.progression].why}</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5">
                  {TECHNIQUE[entry.progression].points.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">Every set</h3>
                <ul className="list-disc space-y-1.5 pl-5">
                  {RULES.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
