import { Link, useNavigate } from 'react-router-dom'
import { getProgram, workoutDays } from '@/data/programs'
import { getStep, PROGRESSIONS } from '@/data/progressions'
import { planToday, relativeDay } from '@/lib/schedule'
import { checkGoal, fmtSets, lastEntryForSlot, streakWeeks } from '@/lib/stats'
import { useStore } from '@/lib/store'
import PageHeader from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Slot } from '@/types'

export default function Today() {
  const { data, cloud } = useStore()
  const nav = useNavigate()
  const program = getProgram(data.programId)
  const plan = planToday(program, data.sessions)
  const streak = streakWeeks(data.sessions)
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  const slotTitle = (s: Slot) => {
    if (s.kind === 'progression') {
      const step = getStep(s.progression, data.steps[s.progression] ?? 1)
      return { title: step.name, sub: `${PROGRESSIONS[s.progression].name} · step ${step.n}` }
    }
    return { title: data.customNames[s.key] || s.label, sub: 'Your pick' }
  }

  return (
    <div>
      <PageHeader title="Today" sub={today} />

      {!cloud && (
        <div className="mb-3 rounded-xl border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
          Device-only mode. Your log lives in this browser until sign-in is set up.
        </div>
      )}

      {plan.doneToday ? (
        <Card className="border-emerald-900/60 bg-emerald-950/30 py-4">
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs tracking-wide text-emerald-400 uppercase">Done today</div>
                <div className="mt-0.5 text-xl font-bold">{plan.doneToday.dayName}</div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-300">{plan.doneToday.entries.length} exercises</Badge>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {plan.doneToday.entries.map((e) => (
                <li key={e.slotKey} className="flex justify-between">
                  <span>{e.name}</span>
                  <span className="text-muted-foreground tabular-nums">{fmtSets(e)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-xs text-muted-foreground">Rest up. Muscle is built between sessions, not during them.</div>
          </CardContent>
        </Card>
      ) : plan.restSuggested ? (
        <Card className="border-sky-900/60 bg-sky-950/30 py-4">
          <CardContent className="px-4">
            <div className="text-xs tracking-wide text-sky-400 uppercase">Rest day</div>
            <div className="mt-0.5 text-xl font-bold">Recover</div>
            <p className="mt-2 text-sm">
              You trained {plan.daysSince === 1 ? 'yesterday' : `${plan.daysSince} days ago`}. Next up is <span className="font-semibold">{plan.day.name}</span>.
            </p>
            <Button variant="secondary" size="lg" className="mt-4 h-12 w-full" onClick={() => nav(`/log/${plan.dayIndex}`)}>
              Train anyway
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/40 bg-primary/10 py-4">
          <CardContent className="px-4">
            <div className="text-xs tracking-wide text-primary uppercase">Up next</div>
            <div className="mt-0.5 text-xl font-bold">{plan.day.name}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.daysSince === null
                ? 'First session. Warm up, then two hard sets per exercise.'
                : plan.trainedYesterday
                  ? 'You trained yesterday. Only go if you feel fresh.'
                  : `Last session ${plan.daysSince} days ago. Beat it by a rep.`}
            </p>
            <Button size="lg" className="mt-4 h-12 w-full" onClick={() => nav(`/log/${plan.dayIndex}`)}>
              Start workout
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{plan.day.name}</h2>
          <span className="text-xs text-muted-foreground">last time</span>
        </div>
        <div className="space-y-2">
          {plan.day.slots.map((s) => {
            const { title, sub } = slotTitle(s)
            const last = lastEntryForSlot(data.sessions, program.id, s.key)
            const goal = last ? checkGoal(last.entry) : null
            const step = s.kind === 'progression' ? getStep(s.progression, data.steps[s.progression] ?? 1) : null
            const sameStep = last && s.kind === 'progression' ? last.entry.step === (data.steps[s.progression] ?? 1) : true
            return (
              <Card key={s.key} className="py-3">
                <CardContent className="px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{title}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </div>
                    <div className="text-right">
                      {last && sameStep ? (
                        <>
                          <div className="font-semibold tabular-nums">{fmtSets(last.entry)}</div>
                          <div className="text-[11px] text-muted-foreground">{relativeDay(last.session.date)}</div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">{step ? `try ${step.goal.sets} × ${step.start}` : 'new'}</div>
                      )}
                    </div>
                  </div>
                  {step && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        Move up at {step.goal.sets} × {step.goal.reps}
                        {step.unit === 'seconds' ? 's' : ''}
                      </span>
                      {goal?.reached && sameStep && <Badge className="bg-emerald-500/15 text-emerald-300">Ready to move up</Badge>}
                      {goal?.overBand && !goal.reached && sameStep && <Badge className="bg-yellow-500/15 text-yellow-300">Over 20 reps</Badge>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {workoutDays(program).length > 1 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Other days</h2>
          <div className="flex flex-wrap gap-2">
            {workoutDays(program)
              .filter((d) => d.index !== plan.dayIndex)
              .map((d) => (
                <Button key={d.index} asChild variant="outline" size="sm" className="rounded-full">
                  <Link to={`/log/${d.index}`}>{d.day.name}</Link>
                </Button>
              ))}
          </div>
        </section>
      )}

      <section className="mt-6 grid grid-cols-3 gap-2">
        <Stat label="Sessions" value={data.sessions.length} />
        <Stat label="Week streak" value={streak} />
        <Stat label="Program" value={program.name.split(' ')[0]} small />
      </section>
    </div>
  )
}

function Stat({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <Card className="py-3">
      <CardContent className="px-2 text-center">
        <div className={`font-bold tabular-nums ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}
