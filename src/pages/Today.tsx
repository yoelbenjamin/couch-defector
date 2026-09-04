import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react'
import { getProgram, workoutDays } from '@/data/programs'
import { getStep, PROGRESSIONS } from '@/data/progressions'
import { dayKey, planToday, relativeDay } from '@/lib/schedule'
import { bestSet, checkGoal, fmtSets, recentEntriesForSlot, streakWeeks, totalReps } from '@/lib/stats'
import { useStore } from '@/lib/store'
import { useIdea } from '@/dev/proto'
import PageHeader from '@/components/PageHeader'
import ActivityHeatmap, { heatmapRange } from '@/components/ActivityHeatmap'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Entry, Session, Slot } from '@/types'

export default function Today() {
  const { data, cloud } = useStore()
  const nav = useNavigate()
  const program = getProgram(data.programId)
  const plan = planToday(program, data.sessions)
  const streak = streakWeeks(data.sessions)
  const range = heatmapRange()
  const sessionsInRange = data.sessions.filter((x) => {
    const k = dayKey(new Date(x.date))
    return k >= range.start && k <= range.today
  }).length
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const selectedSessions = selectedDay === null ? [] : data.sessions.filter((x) => dayKey(new Date(x.date)) === selectedDay)

  const hero = useIdea('todayHero')
  const lastTime = useIdea('lastTime')
  const trendArrows = useIdea('trendArrows')
  const coachCopy = useIdea('coachCopy')
  const statsRow = useIdea('statsRow')

  const slotTitle = (s: Slot) => {
    if (s.kind === 'progression') {
      const step = getStep(s.progression, data.steps[s.progression] ?? 1)
      return { title: step.name, sub: `${PROGRESSIONS[s.progression].name} · step ${step.n}` }
    }
    return { title: data.customNames[s.key] || s.label, sub: 'Your pick' }
  }
  const fmtLast = (e: Entry) => (lastTime === 'best' ? `${bestSet(e)}${e.unit === 'seconds' ? 's' : ''} best` : fmtSets(e))

  const upNextCopy =
    plan.daysSince === null
      ? 'First session. Warm up, then two hard sets per exercise.'
      : plan.trainedYesterday
        ? 'You trained yesterday. Only go if you feel fresh.'
        : `Last session ${plan.daysSince} days ago. Beat it by a rep.`

  return (
    <div>
      <PageHeader
        title="Today"
        sub={
          <div>
            <div>{today}</div>
            {streak > 0 && (
              <Badge variant="secondary" className="mt-1.5">
                {streak} week streak
              </Badge>
            )}
          </div>
        }
      />

      <ActivityHeatmap sessions={data.sessions} selected={selectedDay} onSelect={setSelectedDay} className="mb-1.5" />
      {statsRow ? (
        <p className="mb-5 text-xs text-muted-foreground tabular-nums">
          {sessionsInRange} session{sessionsInRange === 1 ? '' : 's'} in the last {range.days} days
        </p>
      ) : (
        <div className="mb-3.5" />
      )}

      {selectedDay !== null ? (
        <DayDetail dateKey={selectedDay} sessions={selectedSessions} onClose={() => setSelectedDay(null)} />
      ) : (
        <>
      {!cloud && (
        <div className="mb-3 rounded-xl border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
          Device-only mode. Your log lives in this browser until sign-in is set up.
        </div>
      )}

      {plan.doneToday ? (
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Done today</div>
                <div className="mt-0.5 text-xl font-bold">{plan.doneToday.dayName}</div>
              </div>
              <Badge variant="secondary">{plan.doneToday.entries.length} exercises</Badge>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {plan.doneToday.entries.map((e) => (
                <li key={e.slotKey} className="flex justify-between">
                  <span>{e.name}</span>
                  <span className="text-muted-foreground tabular-nums">{fmtLast(e)}</span>
                </li>
              ))}
            </ul>
            {coachCopy && <div className="mt-4 text-xs text-muted-foreground">Rest up. Muscle is built between sessions, not during them.</div>}
          </CardContent>
        </Card>
      ) : plan.restSuggested ? (
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="text-xs text-muted-foreground">Rest day</div>
            <div className="mt-0.5 text-xl font-bold">Recover</div>
            <p className="mt-2 text-sm">
              You trained {plan.daysSince === 1 ? 'yesterday' : `${plan.daysSince} days ago`}. Next up is <span className="font-semibold">{plan.day.name}</span>.
            </p>
            <Button variant="secondary" size="lg" className="mt-4 h-12 w-full" onClick={() => nav(`/log/${plan.dayIndex}`)}>
              Train anyway
            </Button>
          </CardContent>
        </Card>
      ) : hero === 'bold' ? (
        <div className="py-2">
          <div className="text-xs font-semibold text-primary">Up next</div>
          <div className="mt-1 text-4xl leading-tight font-black tracking-tight">{plan.day.name}</div>
          {coachCopy && <p className="mt-2 text-sm text-muted-foreground">{upNextCopy}</p>}
          <Button size="lg" className="mt-5 h-14 w-full text-base" onClick={() => nav(`/log/${plan.dayIndex}`)}>
            Start workout
          </Button>
        </div>
      ) : (
        <Card className="border-primary/40 bg-primary/10 py-4">
          <CardContent className="px-4">
            <div className="text-xs text-primary">Up next</div>
            <div className="mt-0.5 text-xl font-bold">{plan.day.name}</div>
            {coachCopy && <p className="mt-1 text-sm text-muted-foreground">{upNextCopy}</p>}
            <Button size="lg" className="mt-4 h-12 w-full" onClick={() => nav(`/log/${plan.dayIndex}`)}>
              Start workout
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">{plan.day.name}</h2>
          <span className="text-xs text-muted-foreground">last time</span>
        </div>
        <div className="space-y-2">
          {plan.day.slots.map((s) => {
            const { title, sub } = slotTitle(s)
            const recent = recentEntriesForSlot(data.sessions, program.id, s.key, 2)
            const last = recent[0] ?? null
            const prev = recent[1] ?? null
            const goal = last ? checkGoal(last.entry) : null
            const step = s.kind === 'progression' ? getStep(s.progression, data.steps[s.progression] ?? 1) : null
            const sameStep = last && s.kind === 'progression' ? last.entry.step === (data.steps[s.progression] ?? 1) : true
            const trend =
              trendArrows && last && prev && prev.entry.step === last.entry.step ? Math.sign(totalReps(last.entry) - totalReps(prev.entry)) : 0
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
                          <div className="flex items-center justify-end gap-1 font-semibold tabular-nums">
                            {trend > 0 && <ArrowUpRight className="size-4 text-foreground" />}
                            {trend < 0 && <ArrowDownRight className="size-4 text-muted-foreground" />}
                            {fmtLast(last.entry)}
                          </div>
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
                      {goal?.reached && sameStep && <Badge variant="secondary">Ready to move up</Badge>}
                      {goal?.overBand && !goal.reached && sameStep && <Badge variant="secondary">Over 20 reps</Badge>}
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
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Other days</h2>
          <div className="flex flex-wrap gap-2">
            {workoutDays(program)
              .filter((d) => d.index !== plan.dayIndex)
              .map((d) => (
                <Button key={d.index} asChild variant="outline" size="sm">
                  <Link to={`/log/${d.index}`}>{d.day.name}</Link>
                </Button>
              ))}
          </div>
        </section>
      )}

        </>
      )}
    </div>
  )
}

function DayDetail({ dateKey, sessions, onClose }: { dateKey: number; sessions: Session[]; onClose: () => void }) {
  const d = new Date(dateKey)
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{relativeDay(d.toISOString())}</div>
          <div className="truncate text-xl font-bold">{d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={onClose}>
          <X className="size-4" /> Today
        </Button>
      </div>
      <div className="space-y-2">
        {sessions.map((s) => (
          <Card key={s.id} className="py-3">
            <CardContent className="px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{s.dayName}</div>
                <span className="text-xs text-muted-foreground">{new Date(s.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {s.entries.map((e) => (
                  <li key={e.slotKey} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {e.name}
                      {e.step ? <span className="text-muted-foreground"> · step {e.step}</span> : null}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{fmtSets(e)}</span>
                  </li>
                ))}
              </ul>
              {s.note && <p className="mt-2 text-sm text-muted-foreground">{s.note}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Button asChild variant="ghost" size="sm" className="mt-2">
        <Link to="/history">All sessions</Link>
      </Button>
    </div>
  )
}
