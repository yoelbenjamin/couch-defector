import { useEffect, useRef, useState } from 'react'
import { Check, Play, Square, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { elapsedSec, fmtShort, useNow } from '@/lib/timer'
import Stepper from '@/components/Stepper'
import SwipeRow from '@/components/SwipeRow'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SetEntry, Step } from '@/types'

/** Lead-in before a hold starts counting: time to get into position after you tap. */
const COUNTDOWN_MS = 3000

interface Props {
  sets: SetEntry[]
  /** Last time's hard-set reps, in order. Aligned to this exercise's hard sets by position. */
  previous?: number[]
  /** "s" marks a hold: the number is seconds, and each row gets a stopwatch. */
  suffix?: string
  onChange: (sets: SetEntry[]) => void
  /** Ticked sets by index. Owned by the parent so it can be persisted with the draft. */
  done: boolean[]
  /** Tick or untick one set. */
  onToggle: (index: number) => void
  /** Remove one set. The parent drops whatever it was tracking for it. */
  onRemove: (index: number) => void
  /** Word for one row: "Set" for reps, "Hold" for timed work. */
  noun?: string
  /** Seconds since the previous set, by index, for sets already ticked off. */
  gaps?: Record<number, number>
  /** The set the rest clock is counting for, and the timestamp it counts from. */
  resting?: { index: number; from: number }
  /** The exercise's ladder, when it has one. Each row's label is then a picker for the rung it was done on. */
  ladder?: Step[]
  /** The working step on that ladder: the rung for any row that does not name its own. */
  step?: number
}

function label(sets: SetEntry[], k: number, noun = 'Set') {
  return sets[k].warmup ? 'Warm-up' : `${noun} ${sets.slice(0, k).filter((y) => !y.warmup).length + 1}`
}
function prevFor(sets: SetEntry[], k: number, previous?: number[]) {
  if (!previous || sets[k].warmup) return undefined
  return previous[sets.slice(0, k).filter((y) => !y.warmup).length]
}

/** Last time's reps for this set, as a small muted number beside the current one. */
function Prev({ prev, className }: { prev?: number; className?: string }) {
  // Always takes its column, empty or not, so the reps line up across every row.
  return <span className={cn('shrink-0 text-xs text-muted-foreground tabular-nums', className)}>{prev ?? ''}</span>
}

/** The rest running right now, counting up from the last set you ticked off. */
function RestClock({ from }: { from: number }) {
  const now = useNow(true)
  return <span className="tabular-nums">Resting {fmtShort(elapsedSec(from, now))}</span>
}

/**
 * The sets of one exercise as a checklist: label, last time, the reps, and a tick on the right.
 * Tap the number to adjust just that set, and drag a row left to uncover its delete. Ticking a set off is also what drives the clock, so under each row sits
 * the gap since the set before it, live while you are resting and fixed once the next set is ticked.
 *
 * Hold rows (seconds) carry a stopwatch. Tap play, get a three-second lead-in to set up, then the number
 * counts up live. Tap stop and the seconds held become the set's value and the set is ticked. Tapping
 * during the lead-in cancels. The stopwatch runs on timestamps, so a throttled tab still reads true.
 */
export default function SetEditor({ sets, previous, suffix, onChange, done, onToggle, onRemove, noun = 'Set', gaps, resting, ladder, step }: Props) {
  const setReps = (k: number, v: number) => onChange(sets.map((y, j) => (j === k ? { ...y, reps: Math.max(0, v) } : y)))
  // A working set always sits on the working step, so turning a warm-up back into one drops its rung.
  const toggleWarmup = (k: number) =>
    onChange(
      sets.map((y, j) => {
        if (j !== k) return y
        const next: SetEntry = { ...y }
        if (next.warmup) {
          delete next.warmup
          delete next.step
        } else next.warmup = true
        return next
      }),
    )
  const [open, setOpen] = useState<number | null>(null)
  // The open stepper closes on a tap anywhere outside it, so it needs no Done button taking up the row.
  const openEl = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (open === null) return
    const onDown = (e: PointerEvent) => {
      if (openEl.current && !openEl.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open])

  /** The rung a row was done on: its own when it names one, otherwise the working step. */
  const rowStep = (s: SetEntry) => s.step ?? step
  /** A row's unit follows its rung, so a rep warm-up and a hold can share one exercise. */
  const rowSuffix = (s: SetEntry) => {
    const n = rowStep(s)
    const st = ladder && n ? ladder[n - 1] : undefined
    return st ? (st.unit === 'seconds' ? 's' : undefined) : suffix
  }
  /**
   * Move a row to another rung. The amount resets to that rung's beginner standard, since the unit may change.
   * Moving a working set carries the working sets after it that were on the same rung, so changing the first
   * set moves the whole exercise up, and changing only the last is a drop back. Warm-ups move alone.
   * The parent works out the working step from the result.
   */
  const setRowStep = (k: number, n: number) => {
    const st = ladder?.[n - 1]
    if (!st) return
    const from = rowStep(sets[k])
    const warm = !!sets[k].warmup
    onChange(
      sets.map((y, j) => {
        const moves = j === k || (!warm && j > k && !y.warmup && rowStep(y) === from)
        return moves ? { ...y, reps: st.beginner.reps, step: n } : y
      }),
    )
  }

  const [hold, setHold] = useState<{ index: number; startedAt: number } | null>(null)
  const now = useNow(hold !== null)
  const holdMs = hold ? now - hold.startedAt : 0
  const countingDown = hold !== null && holdMs < COUNTDOWN_MS
  const countdown = Math.max(1, Math.ceil((COUNTDOWN_MS - holdMs) / 1000))
  const heldSec = Math.max(0, Math.round((holdMs - COUNTDOWN_MS) / 1000))

  const startHold = (k: number) => setHold({ index: k, startedAt: Date.now() })
  const stopHold = () => {
    if (!hold) return
    const ran = Date.now() - hold.startedAt
    setHold(null)
    if (ran < COUNTDOWN_MS) return // tapped during the lead-in: a change of mind, nothing recorded
    setReps(hold.index, Math.round((ran - COUNTDOWN_MS) / 1000))
    if (!done[hold.index]) onToggle(hold.index)
  }

  // The last-time column only exists when some row has a last time; otherwise its width goes to the labels.
  // Either way it is decided per exercise, so the reps line up down the card.
  const hasPrev = sets.some((_, k) => prevFor(sets, k, previous) !== undefined)

  return (
    <div className="divide-y">
      {sets.map((s, k) => {
        const gap = gaps?.[k]
        const live = resting?.index === k
        const holding = hold?.index === k
        const rs = rowSuffix(s)
        const timed = rs === 's'
        const pick = ladder && step ? rowStep(s) : undefined
        return (
          <SwipeRow key={k} onDelete={() => onRemove(k)}>
            {({ hide, show, remove }) => (
              <>
                <div className="flex items-center gap-2 py-1.5">
                  {pick !== undefined && ladder ? (
                    // The rung the set was done on, as its label. A fixed column that truncates, so the reps line
                    // up down the card. Warm-ups read muted; the last item turns a row into the other kind.
                    <Select value={String(pick)} onValueChange={(v) => (v === 'toggle' ? toggleWarmup(k) : setRowStep(k, Number(v)))}>
                      <SelectTrigger
                        variant="bare"
                        aria-label={`${label(sets, k, noun)} exercise`}
                        className={cn(
                          // The open row's label gives up width to the stepper; every other row keeps the fixed column.
                          open === k ? 'min-w-0 shrink' : 'shrink-0',
                          'text-xs font-semibold [&_svg]:size-3',
                          hasPrev ? 'w-32' : 'w-[10rem]',
                          s.warmup && 'font-medium text-muted-foreground',
                        )}
                      >
                        <SelectValue>{ladder[pick - 1]?.name}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ladder.map((st) => (
                          <SelectItem key={st.n} value={String(st.n)}>
                            {st.n}. {st.name}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
                        <SelectItem value="toggle">{s.warmup ? 'Make it a working set' : 'Make it a warm-up'}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleWarmup(k)}
                      className={cn('w-14 shrink-0 text-left text-xs font-semibold', s.warmup && 'text-muted-foreground')}
                    >
                      {label(sets, k, noun)}
                    </button>
                  )}
                  {hasPrev && <Prev prev={prevFor(sets, k, previous)} className="w-6 text-right" />}
                  {open === k ? (
                    <span ref={openEl} className="shrink-0">
                      <Stepper value={s.reps} suffix={rs} onChange={(v) => setReps(k, v)} />
                    </span>
                  ) : holding ? (
                    // The lead-in counts 3, 2, 1 in the number's place, then the seconds held count up.
                    <span className={cn('text-lg font-semibold tabular-nums', countingDown && 'text-muted-foreground')} aria-live="polite">
                      {countingDown ? countdown : `${heldSec}s`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpen(k)}
                      className={cn('text-lg font-semibold tabular-nums', done[k] && 'text-muted-foreground line-through')}
                    >
                      {s.reps}
                      {rs}
                    </button>
                  )}
                  {timed && open !== k && (
                    <button
                      type="button"
                      aria-label={holding ? (countingDown ? 'cancel' : 'stop and record the hold') : 'start the hold'}
                      onClick={() => (holding ? stopHold() : startHold(k))}
                      disabled={hold !== null && !holding}
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full border disabled:opacity-40',
                        holding && 'border-foreground bg-foreground text-background',
                      )}
                    >
                      {holding ? <Square className="size-3 fill-current" /> : <Play className="size-3.5 fill-current" />}
                    </button>
                  )}
                  {/* The tick and the delete share one slot: swiping trades one for the other. */}
                  <div className="relative ml-auto size-7 shrink-0">
                    <button
                      type="button"
                      aria-label={done[k] ? 'mark not done' : 'mark done'}
                      onClick={() => onToggle(k)}
                      style={hide}
                      className={cn(
                        'absolute inset-0 flex items-center justify-center rounded-full border',
                        done[k] && 'border-foreground bg-foreground text-background',
                      )}
                    >
                      {done[k] && <Check className="size-4" />}
                    </button>
                    <button
                      data-swipe-action=""
                      type="button"
                      aria-label={`Remove ${label(sets, k, noun).toLowerCase()}`}
                      onClick={remove}
                      style={show}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground text-background"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                {(live || gap !== undefined) && (
                  <div className="-mt-0.5 pb-1 text-xs text-muted-foreground">
                    {live ? <RestClock from={resting.from} /> : <span className="tabular-nums">Rested {fmtShort(gap!)}</span>}
                  </div>
                )}
              </>
            )}
          </SwipeRow>
        )
      })}
    </div>
  )
}
