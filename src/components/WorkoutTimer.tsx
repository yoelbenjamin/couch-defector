import { Undo2 } from 'lucide-react'
import { elapsedSec, fmtClock, IDLE_TIMER, nextSet, runningOrder, totalSec, useNow, type SetRef, type TimerState } from '@/lib/timer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Entry } from '@/types'

interface Props {
  entries: Entry[]
  timer: TimerState
  onTimerChange: (t: TimerState) => void
  /** Rest taken before this set, in seconds. */
  onStartSet: (ref: SetRef, rest: number | undefined) => void
  /** Time spent performing this set, in seconds. */
  onEndSet: (ref: SetRef, work: number) => void
  /** Drop the times from the set that just finished and pick it back up. */
  onUndoSet: (ref: SetRef) => void
}

/** The set worked immediately before the cursor, which is the one an undo reaches back for. */
function previousSet(entries: Entry[], cursor: SetRef | null): SetRef | null {
  const order = runningOrder(entries)
  const timed = order.filter((r) => entries[r.entryIndex].sets[r.setIndex].work !== undefined)
  if (timed.length === 0) return null
  const last = timed[timed.length - 1]
  // Only offer the undo when the cursor really does sit just after it.
  if (cursor && (cursor.entryIndex < last.entryIndex || (cursor.entryIndex === last.entryIndex && cursor.setIndex < last.setIndex))) return null
  return last
}

/**
 * The workout clock: start it, and it runs a chain of stretches, one per set, with the rest between
 * them. Working shows the set's own time, resting shows how long you have been waiting and which set
 * is next. Every stretch is written onto the set it belongs to, so a finished workout carries how
 * long each set took and how long you rested before it.
 */
export default function WorkoutTimer({ entries, timer, onTimerChange, onStartSet, onEndSet, onUndoSet }: Props) {
  const cursor = nextSet(entries)
  const running = timer.phase !== 'idle' && !(timer.phase === 'rest' && cursor === null)
  const now = useNow(running)

  const phaseSec = elapsedSec(timer.phaseStartedAt, now)
  const total = totalSec(entries, timer, now)

  const start = () => {
    if (!cursor) return
    const at = Date.now()
    onStartSet(cursor, undefined)
    onTimerChange({ phase: 'work', startedAt: at, phaseStartedAt: at })
  }

  const endSet = () => {
    if (!cursor) return
    const at = Date.now()
    onEndSet(cursor, elapsedSec(timer.phaseStartedAt, at))
    onTimerChange({ ...timer, phase: 'rest', phaseStartedAt: at })
  }

  const startNext = () => {
    if (!cursor) return
    const at = Date.now()
    onStartSet(cursor, elapsedSec(timer.phaseStartedAt, at))
    onTimerChange({ ...timer, phase: 'work', phaseStartedAt: at })
  }

  const undo = () => {
    const prev = previousSet(entries, cursor)
    if (!prev) return
    const spent = entries[prev.entryIndex].sets[prev.setIndex].work ?? 0
    onUndoSet(prev)
    // Resume that set's clock where it left off, so the undo does not hand back a free restart.
    onTimerChange({ ...timer, phase: 'work', phaseStartedAt: Date.now() - spent * 1000 })
  }

  if (timer.phase === 'idle') {
    return (
      <Card variant="inset">
        <CardContent className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted-foreground">Workout timer</div>
            <p className="mt-0.5 text-sm text-muted-foreground">Times each set and the rest between.</p>
          </div>
          <Button className="h-10 shrink-0" variant="secondary" onClick={start} disabled={!cursor}>
            Start
          </Button>
        </CardContent>
      </Card>
    )
  }

  const finished = cursor === null
  const working = timer.phase === 'work'
  const undoable = !working && previousSet(entries, cursor) !== null

  return (
    <Card variant="inset">
      <CardContent>
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-xs font-semibold text-muted-foreground">{finished ? 'Every set timed' : working ? 'Working' : 'Resting'}</div>
          <div className="text-xs text-muted-foreground tabular-nums">{fmtClock(total)} total</div>
        </div>

        <div className="mt-0.5 text-2xl font-bold tabular-nums">{fmtClock(finished ? total : phaseSec)}</div>

        {cursor && (
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            {working ? '' : 'Next: '}
            {cursor.name} · {cursor.label}
          </div>
        )}
        {finished && <p className="mt-0.5 text-sm text-muted-foreground">Add a set to keep going, or finish below.</p>}

        {!finished && (
          <div className="mt-3 flex items-center gap-2">
            <Button className="h-11 flex-1" onClick={working ? endSet : startNext}>
              {working ? 'Done set' : `Start ${cursor?.label.toLowerCase()}`}
            </Button>
            {undoable && (
              <Button variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground" aria-label="Undo the last set" onClick={undo}>
                <Undo2 className="size-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { IDLE_TIMER }
