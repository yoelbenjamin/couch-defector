import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { getProgram, progressionsIn } from '@/data/programs'
import { getStep, PROGRESSION_IDS, PROGRESSIONS } from '@/data/progressions'
import { fmtDate } from '@/lib/schedule'
import { bestSet, checkGoal, entriesForProgression, fmtSets, totalReps } from '@/lib/stats'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import Chart from '@/components/Chart'
import PageHeader from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress as ProgressBar } from '@/components/ui/progress'
import type { ProgressionId } from '@/types'

export default function Progress() {
  const { data, setStep } = useStore()
  const program = getProgram(data.programId)
  const ids = useMemo(() => {
    const inProgram = progressionsIn(program)
    const withHistory = PROGRESSION_IDS.filter((id) => data.sessions.some((s) => s.entries.some((e) => e.progression === id)))
    return [...new Set([...inProgram, ...withHistory])]
  }, [program, data.sessions])
  const [sel, setSel] = useState<ProgressionId>(ids[0] ?? 'pushup')
  const p = PROGRESSIONS[sel]
  const curN = data.steps[sel] ?? 1
  const cur = getStep(sel, curN)
  const history = entriesForProgression(data.sessions, sel)
  const atStep = history.filter((h) => h.entry.step === curN)
  const latest = atStep.at(-1) ?? null
  const goal = latest ? checkGoal(latest.entry) : null
  const best = atStep.reduce((m, h) => Math.max(m, bestSet(h.entry)), 0)
  const pct = Math.min(100, Math.round((best / cur.goal.reps) * 100))
  const unit = cur.unit === 'seconds' ? 's' : ''

  const points = history.map((h, i) => ({
    x: i,
    y: bestSet(h.entry),
    label: fmtDate(h.session.date, { month: 'short', day: 'numeric' }),
    step: h.entry.step,
  }))

  return (
    <div>
      <PageHeader title="Progress" sub="Small wins, every session." />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {ids.map((id) => (
          <Button key={id} size="sm" variant={sel === id ? 'default' : 'outline'} className="shrink-0 rounded-full" onClick={() => setSel(id)}>
            {PROGRESSIONS[id].name}
          </Button>
        ))}
      </div>

      <Card className="py-4">
        <CardContent className="px-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs tracking-wide text-muted-foreground uppercase">Current step</div>
              <div className="text-lg font-bold">
                {curN}. {cur.name}
              </div>
            </div>
            {goal?.reached && <Badge className="bg-emerald-500/15 text-emerald-300">Ready</Badge>}
          </div>
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>
                Best set at this step: <span className="font-semibold text-foreground">{best}{unit}</span>
              </span>
              <span>
                Goal {cur.goal.sets} × {cur.goal.reps}
                {unit}
              </span>
            </div>
            <ProgressBar value={pct} />
            <div className="mt-2 text-xs text-muted-foreground">
              {latest
                ? goal?.reached
                  ? 'You hit the standard. Move up a step next session.'
                  : `${goal?.setsAtGoal ?? 0} of ${cur.goal.sets} hard sets reached ${cur.goal.reps}${unit} last time.`
                : 'No sessions at this step yet.'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-3 py-4">
        <CardContent className="px-4">
          <div className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">Best hard set per session</div>
          <Chart points={points} unit={unit} />
        </CardContent>
      </Card>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ladder</h2>
        <Card className="gap-0 overflow-hidden py-0">
          {p.steps.map((s) => {
            const done = s.n < curN
            const active = s.n === curN
            return (
              <button
                key={s.n}
                onClick={() => setStep(sel, s.n)}
                className={cn('flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0', active && 'bg-primary/10')}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    done ? 'bg-emerald-500/20 text-emerald-300' : active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-4" /> : s.n}
                </span>
                <span className={cn('flex-1 text-sm', active ? 'font-semibold' : 'text-muted-foreground')}>{s.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {s.goal.sets} × {s.goal.reps}
                  {s.unit === 'seconds' ? 's' : ''}
                </span>
              </button>
            )
          })}
        </Card>
        <p className="mt-2 text-xs text-muted-foreground/70">Tap a step to make it your current one.</p>
      </section>

      {history.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Recent</h2>
          <div className="space-y-1.5">
            {[...history].reverse().slice(0, 8).map((h) => (
              <div key={h.session.id + h.entry.slotKey} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm">
                <div>
                  <div>{h.entry.name}</div>
                  <div className="text-[11px] text-muted-foreground">{fmtDate(h.session.date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{fmtSets(h.entry)}</div>
                  <div className="text-[11px] text-muted-foreground">{totalReps(h.entry)} total</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
