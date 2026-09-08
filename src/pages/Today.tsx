import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getProgram } from '@/data/programs'
import { dayKey, isRest, planToday, relativeDay, weekdayIndex } from '@/lib/schedule'
import { fmtSets, streakWeeks } from '@/lib/stats'
import { useStore } from '@/lib/store'
import { useSwipe } from '@/lib/useSwipe'
import { cn } from '@/lib/utils'
import { useIdea } from '@/dev/proto'
import PageHeader, { ProfileButton } from '@/components/PageHeader'
import ActivityHeatmap, { heatmapRange } from '@/components/ActivityHeatmap'
import WorkoutForm from '@/components/WorkoutForm'
import TrifectaForm from '@/components/TrifectaForm'
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
import type { Program, Session, WorkoutDay } from '@/types'


function addDays(key: number, n: number) {
  const d = new Date(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}
function scheduled(program: Program, key: number): WorkoutDay | null {
  const slot = program.cycle[weekdayIndex(new Date(key))]
  return isRest(slot) ? null : slot.day
}

/**
 * Today: the activity grid, then the workout that is due with logging inline.
 * Everything under the grid is one day; swipe right (or press the left arrow) to step back through
 * past days, and left to come forward again, never past today. Tapping a grid cell jumps straight to that day.
 */
export default function Today() {
  const { data, cloud, deleteSession } = useStore()
  const nav = useNavigate()
  const program = getProgram(data.programId)
  const plan = planToday(program, data.sessions)
  const streak = streakWeeks(data.sessions)
  const range = heatmapRange()
  const sessionsInRange = data.sessions.filter((x) => {
    const k = dayKey(new Date(x.date))
    return x.kind !== 'mobility' && k >= range.start && k <= range.today
  }).length
  const now = new Date()
  const today = dayKey(now)
  const tomorrow = scheduled(program, addDays(today, 1))

  /** Day under the grid. null = today. */
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [dir, setDir] = useState<'left' | 'right'>('left')
  const [trainAnyway, setTrainAnyway] = useState(false)
  const [editMobility, setEditMobility] = useState(false)
  const viewing = selectedDay ?? today
  const viewDate = new Date(viewing)
  const weekday = viewDate.toLocaleDateString(undefined, { weekday: 'long' })
  const monthDay = viewDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
  const selectedSessions = selectedDay === null ? [] : data.sessions.filter((x) => dayKey(new Date(x.date)) === selectedDay)
  const heatRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const shift = (n: number) => {
    const next = addDays(viewing, n)
    if (next > today) return // history only; the future is not for swiping into
    setDir(n > 0 ? 'left' : 'right')
    setSelectedDay(next === today ? null : next)
  }
  const swipe = useSwipe((d) => shift(d === 'left' ? 1 : -1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') shift(1)
      if (e.key === 'ArrowLeft') shift(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Tapping the header or grid margins (not a cell, the day view, or a dialog) returns to today.
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

  const coachCopy = useIdea('coachCopy')
  const statsRow = useIdea('statsRow')
  const showForm = !plan.doneToday && (!plan.restSuggested || trainAnyway)

  return (
    <div>
      <PageHeader
        title={
          <>
            <span className="block">{weekday},</span>
            <span className="block">{monthDay}</span>
          </>
        }
        sub={selectedDay !== null ? relativeDay(viewDate.toISOString()) : undefined}
        action={
          selectedDay !== null ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDay(null)}>
                Today
              </Button>
              <ProfileButton />
            </div>
          ) : undefined
        }
      />

      {(streak > 0 || statsRow) && (
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          {streak > 0 && <Badge variant="secondary">{streak} week streak</Badge>}
          {statsRow && (
            <span>
              {sessionsInRange} session{sessionsInRange === 1 ? '' : 's'} · {range.days} days
            </span>
          )}
        </div>
      )}
      <div ref={heatRef}>
        <ActivityHeatmap
          sessions={data.sessions}
          selected={selectedDay}
          onSelect={(k) => {
            setDir(k !== null && k > viewing ? 'left' : 'right')
            setSelectedDay(k)
          }}
          className="mb-5"
        />
      </div>

      <div ref={detailRef} {...swipe} style={{ touchAction: 'pan-y' }} className="min-h-[40vh]">
        <div key={viewing} className={cn('animate-in fade-in duration-200', dir === 'left' ? 'slide-in-from-right-3' : 'slide-in-from-left-3')}>
          {selectedDay !== null ? (
            selectedSessions.length > 0 ? (
              <DayDetail
                sessions={selectedSessions}
                onEdit={(x) => nav(`/log/${x.dayIndex}?session=${x.id}`)}
                onDelete={async (x) => {
                  await deleteSession(x.id)
                  toast('Session deleted')
                }}
              />
            ) : (
              <DayEmpty day={scheduled(program, selectedDay)} />
            )
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
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Done today</div>
                        <div className="mt-0.5 text-xl font-bold">{plan.doneToday.dayName}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => nav(`/log/${plan.doneToday!.dayIndex}?session=${plan.doneToday!.id}`)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm">
                      {plan.doneToday.entries.map((e) => (
                        <li key={e.slotKey} className="flex justify-between">
                          <span>{e.name}</span>
                          <span className="text-muted-foreground tabular-nums">{fmtSets(e)}</span>
                        </li>
                      ))}
                    </ul>
                    {coachCopy && <div className="mt-4 text-xs text-muted-foreground">Rest up. Muscle is built between sessions, not during them.</div>}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {plan.restSuggested && !trainAnyway ? (
                    <>
                      <Card className="py-4">
                        <CardContent className="px-4">
                          <div className="text-xs text-muted-foreground">Rest day</div>
                          <div className="mt-0.5 text-xl font-bold">Recover</div>
                          <p className="mt-2 text-sm">
                            {plan.daysSince === null ? 'Nothing logged yet.' : `You trained ${plan.daysSince === 1 ? 'yesterday' : `${plan.daysSince} days ago`}.`} Next up is{' '}
                            <span className="font-semibold">{plan.day.name}</span> on {plan.weekday}.
                          </p>
                          <Button variant="ghost" size="sm" className="-ml-2 mt-3 text-muted-foreground" onClick={() => setTrainAnyway(true)}>
                            Train anyway
                          </Button>
                        </CardContent>
                      </Card>

                      <div className="mt-6 mb-3">
                        <h2 className="text-lg font-bold">Trifecta</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">Three easy holds to keep the joints moving. About twenty seconds each.</p>
                      </div>
                      {plan.mobilityToday && !editMobility ? (
                        <Card className="py-4">
                          <CardContent className="px-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">Done today</div>
                              <Button variant="outline" size="sm" onClick={() => setEditMobility(true)}>
                                <Pencil className="size-3.5" /> Edit
                              </Button>
                            </div>
                            <ul className="mt-3 space-y-1 text-sm">
                              {plan.mobilityToday.entries.map((e) => (
                                <li key={e.slotKey} className="flex justify-between">
                                  <span>{e.name}</span>
                                  <span className="text-muted-foreground tabular-nums">{fmtSets(e)}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ) : (
                        <TrifectaForm key={plan.mobilityToday?.id ?? 'new'} editing={editMobility ? plan.mobilityToday : null} onSaved={() => setEditMobility(false)} />
                      )}
                    </>
                  ) : null}
                  {showForm && <WorkoutForm key={`${program.id}:${plan.dayIndex}`} dayIndex={plan.dayIndex} onSaved={() => setTrainAnyway(false)} />}
                </>
              )}

              <p className="mt-8 text-sm text-muted-foreground">
                Tomorrow: <span className="font-medium text-foreground">{tomorrow ? tomorrow.name : 'Rest day'}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- other days ---------- */

function DayEmpty({ day }: { day: WorkoutDay | null }) {
  return (
    <div>
      <Card className="py-4">
        <CardContent className="px-4">
          <div className="text-xs text-muted-foreground">{day ? 'Scheduled' : 'Rest day'}</div>
          <div className="mt-0.5 text-xl font-bold">{day ? day.name : 'Recover'}</div>
          <p className="mt-2 text-sm text-muted-foreground">{day ? 'Nothing logged.' : 'Nothing scheduled, nothing logged.'}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function DayDetail({
  sessions,
  onEdit,
  onDelete,
}: {
  sessions: Session[]
  onEdit: (s: Session) => void
  onDelete: (s: Session) => void | Promise<void>
}) {
  return (
    <div>
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
