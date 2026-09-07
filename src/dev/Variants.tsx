import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import SetEditor, { type SetLayout } from '@/components/SetEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { SetEntry } from '@/types'

const LAYOUTS: { id: SetLayout; name: string; pitch: string }[] = [
  { id: 'rows', name: 'Rows', pitch: 'One stepper per set. Everything editable, most vertical space.' },
  { id: 'tiles', name: 'Tiles', pitch: 'Cards with big numbers and their own −/+. Whole exercise at a glance.' },
  { id: 'focus', name: 'Focus', pitch: 'Sets as chips, one stepper for the selected chip. Least clutter.' },
  { id: 'checklist', name: 'Checklist', pitch: 'Tick sets off as you do them. Tap a number to adjust just that one.' },
]

const SAMPLE: SetEntry[] = [{ reps: 6, warmup: true }, { reps: 12 }, { reps: 11 }, { reps: 11 }]

/** Dev-only side-by-side of the set-logging layouts, all bound to the same sample data. */
export default function Variants() {
  const [sets, setSets] = useState<Record<SetLayout, SetEntry[]>>({ rows: SAMPLE, tiles: SAMPLE, focus: SAMPLE, checklist: SAMPLE })
  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top,0px)+24px)] pb-16">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3">
        <Link to="/">
          <ChevronLeft /> Back
        </Link>
      </Button>
      <h1 className="text-2xl font-bold">Set logging layouts</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">Same exercise, four ways to log it. Pick one in the flask panel under Ideas to use it everywhere.</p>
      <div className="space-y-4">
        {LAYOUTS.map((l) => (
          <section key={l.id}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">{l.name}</h2>
              <span className="text-xs text-muted-foreground">{l.pitch}</span>
            </div>
            <Card className="py-4">
              <CardContent className="px-4">
                <div className="font-semibold">5. Full Pull-ups</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Last time <span className="text-foreground">12 / 11 / 11</span> · 4 days ago
                </div>
                <SetEditor sets={sets[l.id]} variant={l.id} onChange={(s) => setSets((x) => ({ ...x, [l.id]: s }))} />
                <div className="mt-3">
                  <Button type="button" variant="link" size="sm" className="px-0" onClick={() => setSets((x) => ({ ...x, [l.id]: [...x[l.id], { reps: 11 }] }))}>
                    + Add set
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        ))}
      </div>
    </div>
  )
}
