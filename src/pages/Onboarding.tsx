import { useState } from 'react'
import { DEFAULT_PROGRAM_ID, PROGRAMS, progressionsIn } from '@/data/programs'
import { PROGRESSIONS } from '@/data/progressions'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ProgressionId } from '@/types'

function levelBadge(level: number) {
  if (level <= 2) return <Badge variant="secondary">Beginner</Badge>
  if (level <= 3) return <Badge variant="secondary">Intermediate</Badge>
  return <Badge variant="secondary">Advanced</Badge>
}

export default function Onboarding() {
  const { setProgram, setStep, data } = useStore()
  const [choice, setChoice] = useState(DEFAULT_PROGRAM_ID)
  const [phase, setPhase] = useState<'program' | 'steps'>('program')
  const [steps, setSteps] = useState<Partial<Record<ProgressionId, number>>>({})
  const program = PROGRAMS.find((p) => p.id === choice)!

  if (phase === 'steps') {
    return (
      <div className="safe-top safe-bottom mx-auto flex h-full max-w-md flex-col px-4 py-6">
        <h1 className="text-2xl font-bold">Where are you starting?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the hardest variation you can do for about 10 clean reps. When in doubt, start lower and move up fast.
        </p>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {progressionsIn(program).map((pid) => {
            const p = PROGRESSIONS[pid]
            const cur = steps[pid] ?? data.steps[pid] ?? 1
            return (
              <Card key={pid} className="py-4">
                <CardContent className="px-4">
                  <div className="mb-2 text-sm font-semibold">{p.name}</div>
                  <Select value={String(cur)} onValueChange={(v) => setSteps((s) => ({ ...s, [pid]: Number(v) }))}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {p.steps.map((s) => (
                        <SelectItem key={s.n} value={String(s.n)}>
                          Step {s.n} · {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="lg" className="h-12" onClick={() => setPhase('program')}>
            Back
          </Button>
          <Button
            size="lg"
            className="h-12 flex-1"
            onClick={async () => {
              for (const pid of progressionsIn(program)) await setStep(pid, steps[pid] ?? data.steps[pid] ?? 1)
              await setProgram(choice)
            }}
          >
            Start training
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="safe-top safe-bottom mx-auto flex h-full max-w-md flex-col px-4 py-6">
      <h1 className="text-2xl font-bold">Pick a program</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Simpler programs build muscle faster. Start low, move up only when the basics get too easy to recover from.
      </p>
      <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {PROGRAMS.map((p) => (
          <Card
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => setChoice(p.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setChoice(p.id)}
            className={cn('cursor-pointer py-4 transition', choice === p.id && 'border-primary bg-primary/10')}
          >
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.name}</span>
                {levelBadge(p.level)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{p.tagline}</div>
              <div className="mt-2 text-xs text-muted-foreground/70">
                {p.cycle.map((c) => ('rest' in c && c.rest ? 'Rest' : c.day.name)).join(' → ')} → repeat
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button size="lg" className="mt-4 h-12" onClick={() => setPhase('steps')}>
        Continue
      </Button>
    </div>
  )
}
