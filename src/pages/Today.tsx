import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getProgram, workoutDays } from '@/data/programs'
import { dayKey, planToday, relativeDay } from '@/lib/schedule'
import { bestSet, fmtSets, streakWeeks } from '@/lib/stats'
import { useStore } from '@/lib/store'
import { useIdea } from '@/dev/proto'
import PageHeader from '@/components/PageHeader'
import ProgressPanel from '@/components/ProgressPanel'
import ActivityHeatmap, { heatmapRange } from '@/components/ActivityHeatmap'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { Entry, Session } from '@/types'

export default function Today() {
  const { data, cloud, deleteSession } = useStore()
  const nav = useNavigate()
  const program = getProgram(data.programId)
  const plan = planToday(program, data.sessions)
  const streak = streakWeeks(data.sessions)
  const range = heatmapRange()
  const sessionsInRange = data.sessions.filter((x) => {
    const k = dayKey(new Date(x.date))
    return k >= range.start && k <= range.today
  }).length
  const now = new Date()
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' })
  const monthDay = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })

  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const selectedSessions = selectedDay === null ? [] : data.sessions.filter((x) => dayKey(new Date(x.date)) === selectedDay)
  const heatRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  // Tapping anywhere outside the grid, the day view, or a dialog leaves the historical view.
  useEffect(() => {
    if (selectedDay === null) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t) return
      if (heatRef.current?.contains(t) || detailRef.current?.contains(t)) return
      if (t.closest?.('[data-slot^="alert-dialog"]')) return
      setSelectedDay(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [selectedDay])
  // Nothing left on that day (last session deleted): back to today.
  useEffect(() => {
    if (selectedDay !== null && selectedSessions.length === 0) setSelectedDay(null)
  }, [selectedDay, selectedSessions.length])

  const hero = useIdea('todayHero')
  const lastTime = useIdea('lastTime')
  const coachCopy = useIdea('coachCopy')
  const statsRow = useIdea('statsRow')

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
        title={
          <>
            <span className="block">{weekday},</span>
            <span className="block">{monthDay}</span>
          </>
        }
        sub={
          streak > 0 ? (
            <Badge variant="secondary" className="mt-1">
              {streak} week streak
            </Badge>
          ) : undefined
        }
      />

      <div ref={heatRef}>
        <ActivityHeatmap sessions={data.sessions} selected={selectedDay} onSelect={setSelectedDay} className="mb-1.5" />
      </div>
      {statsRow ? (
        <p className="mb-5 text-xs text-muted-foreground tabular-nums">
          {sessionsInRange} session{sessionsInRange === 1 ? '' : 's'} in the last {range.days} days
        </p>
      ) : (
        <div className="mb-3.5" />
      )}

      {selectedDay !== null ? (
        <div ref={detailRef}>
          <DayDetail
            dateKey={selectedDay}
            sessions={selectedSessions}
            onEdit={(x) => nav(`/log/${x.dayIndex}?session=${x.id}`)}
            onDelete={async (x) => {
              await deleteSession(x.id)
              toast('Session deleted')
            }}
          />
        </div>
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
        <Card className="py-3">
          <CardContent className="px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Up next</div>
                <div className="truncate text-lg font-bold">{plan.day.name}</div>
              </div>
              <Button size="sm" className="h-9 shrink-0 px-4" onClick={() => nav(`/log/${plan.dayIndex}`)}>
                Start workout
              </Button>
            </div>
            {coachCopy && <p className="mt-2 text-sm text-muted-foreground">{upNextCopy}</p>}
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <ProgressPanel />
      </div>

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

function DayDetail({
  dateKey,
  sessions,
  onEdit,
  onDelete,
}: {
  dateKey: number
  sessions: Session[]
  onEdit: (s: Session) => void
  onDelete: (s: Session) => void | Promise<void>
}) {
  const d = new Date(dateKey)
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{relativeDay(d.toISOString())}</div>
          <div className="truncate text-xl font-bold">{d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
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
              <div className="mt-3 flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(s)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {s.dayName} on {new Date(s.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} will be removed from your log. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void onDelete(s)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
