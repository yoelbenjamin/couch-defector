import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getProgram } from '@/data/programs'
import { dayKey, isRest, planToday, weekdayIndex } from '@/lib/schedule'
import { fmtSets, streakInfo } from '@/lib/stats'
import { fmtDuration } from '@/lib/timer'
import { useStore } from '@/lib/store'
import PageHeader from '@/components/PageHeader'
import ActivityHeatmap from '@/components/ActivityHeatmap'
import DaySwiper, { type DaySwiperHandle } from '@/components/DaySwiper'
import WorkoutForm from '@/components/WorkoutForm'
import TrifectaForm from '@/components/TrifectaForm'
import StreakBadge from '@/components/StreakBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, Tray } from '@/components/ui/card'
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
  const program = getProgram(data.programId)
  const plan = planToday(program, data.sessions)
  const streak = streakInfo(data.sessions)
  const now = new Date()
  const today = dayKey(now)
  const tomorrow = scheduled(program, addDays(today, 1))

  /** Day under the grid. null = today. */
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [trainAnyway, setTrainAnyway] = useState(false)
  const [editMobility, setEditMobility] = useState(false)
  /** Session being edited in place, under the day it belongs to. */
  const [editingId, setEditingId] = useState<string | null>(null)
  const viewing = selectedDay ?? today
  const viewDate = new Date(viewing)
  const weekday = viewDate.toLocaleDateString(undefined, { weekday: 'long' })
  const monthDay = viewDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
  const swiper = useRef<DaySwiperHandle>(null)

  const shift = (n: 1 | -1) => {
    if (n === 1 && viewing >= today) return
    swiper.current?.go(n)
  }

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

  const showForm = !plan.doneToday && (!plan.restSuggested || trainAnyway)

  const editSession = (x: Session) => {
    if (x.kind === 'mobility') setEditMobility(true)
    else setEditingId(x.id)
  }
  const removeSession = async (x: Session) => {
    await deleteSession(x.id)
    toast('Session deleted')
  }

  /** A logged workout, or the form open over it while it is being edited. */
  const detailOrEdit = (sessions: Session[]) => {
    const editing = sessions.find((x) => x.id === editingId && x.kind !== 'mobility')
    if (editing) {
      return (
        <WorkoutForm
          key={`edit:${editing.id}`}
          dayIndex={editing.dayIndex}
          editing={editing}
          onSaved={() => setEditingId(null)}
          onCancel={() => setEditingId(null)}
        />
      )
    }
    return <DayDetail sessions={sessions} onEdit={editSession} onDelete={removeSession} />
  }

  const renderDay = (key: number) => {
    if (key !== today) {
      const sessions = data.sessions.filter((x) => dayKey(new Date(x.date)) === key)
      return sessions.length > 0 ? detailOrEdit(sessions) : <DayEmpty day={scheduled(program, key)} />
    }
    return (
      <>
        {!cloud && (
          <div className="mb-3 rounded-[20px] bg-[#ebebeb] px-4 py-2.5 text-xs text-muted-foreground">
            Device-only mode. Your log lives in this browser until sign-in is set up.
          </div>
        )}

        {plan.doneToday ? (
          detailOrEdit([plan.doneToday])
        ) : (
          <>
            {plan.restSuggested && !trainAnyway ? (
              <>
                <Card variant="flat">
                  <CardContent>
                    <div className="text-xs text-muted-foreground">Rest day</div>
                    <div className="mt-0.5 text-xl font-bold">Recover</div>
                    <p className="mt-2 text-sm">
                      {plan.daysSince === null ? 'Nothing logged yet.' : `You trained ${plan.daysSince === 1 ? 'yesterday' : `${plan.daysSince} days ago`}.`}{' '}
                      Next up is <span className="font-semibold">{plan.day.name}</span> on {plan.weekday}.
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
                  <DayDetail sessions={[plan.mobilityToday]} onEdit={editSession} onDelete={removeSession} />
                ) : (
                  <TrifectaForm
                    key={plan.mobilityToday?.id ?? 'new'}
                    editing={editMobility ? plan.mobilityToday : null}
                    onSaved={() => setEditMobility(false)}
                    onCancel={() => setEditMobility(false)}
                  />
                )}
              </>
            ) : null}
            {showForm && <WorkoutForm key={`${program.id}:${plan.dayIndex}`} dayIndex={plan.dayIndex} onSaved={() => setTrainAnyway(false)} />}
          </>
        )}

        {/* What is next only matters once the day is finished; until then it is a distraction. */}
        {(plan.doneToday || plan.mobilityToday) && (
          <Card variant="flat" className="mt-3">
            <CardContent>
              <div className="text-xs text-muted-foreground">Upcoming workout</div>
              <div className="mt-0.5 text-lg font-bold">{tomorrow ? tomorrow.name : 'Rest day'}</div>
            </CardContent>
          </Card>
        )}
      </>
    )
  }

  return (
    <div>
      <PageHeader
        title={
          <>
            <span className="block">{weekday},</span>
            <span className="block">{monthDay}</span>
          </>
        }
      />

      {streak && (
        <div className="-mt-2.5 mb-3">
          <StreakBadge streak={streak} />
        </div>
      )}
      <div>
        <ActivityHeatmap sessions={data.sessions} selected={selectedDay} onSelect={setSelectedDay} className="mb-5" />
      </div>

      <DaySwiper
        ref={swiper}
        current={viewing}
        prev={addDays(viewing, -1)}
        next={viewing < today ? addDays(viewing, 1) : null}
        neighbor={(k, d) => (d === 1 ? (k < today ? addDays(k, 1) : null) : addDays(k, -1))}
        render={renderDay}
        onChange={(k) => setSelectedDay(k === today ? null : k)}
        className="-mx-4 min-h-[40vh]"
        peek={16}
        gap={12}
      />
    </div>
  )
}

/* ---------- other days ---------- */

function DayEmpty({ day }: { day: WorkoutDay | null }) {
  return (
    <Tray>
      <Card variant="inset">
        <CardContent>
          <div className="text-xs text-muted-foreground">{day ? 'Scheduled' : 'Rest day'}</div>
          <div className="mt-0.5 text-xl font-bold">{day ? day.name : 'Recover'}</div>
          <p className="mt-2 text-sm text-muted-foreground">{day ? 'Nothing logged.' : 'Nothing scheduled, nothing logged.'}</p>
        </CardContent>
      </Card>
    </Tray>
  )
}

function DayDetail({ sessions, onEdit, onDelete }: { sessions: Session[]; onEdit: (s: Session) => void; onDelete: (s: Session) => void | Promise<void> }) {
  return (
    <Tray>
      {sessions.map((s) => (
        <Card key={s.id} variant="inset">
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">{s.dayName}</div>
              <span className="text-xs text-muted-foreground">
                {s.durationSec ? `${fmtDuration(s.durationSec)} · ` : ''}
                {new Date(s.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
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
                      {s.dayName} on {new Date(s.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} will be removed from
                      your log. This cannot be undone.
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
    </Tray>
  )
}
