import { useState } from 'react'
import { Check, Play, Square, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { elapsedSec, fmtShort, useNow } from '@/lib/timer'
import Stepper from '@/components/Stepper'
import SwipeRow from '@/components/SwipeRow'
import { Button } from '@/components/ui/button'
import type { SetEntry } from '@/types'

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
  if (prev === undefined) return null
  return <span className={cn('text-xs text-muted-foreground tabular-nums', className)}>{prev}</span>
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
export default function SetEditor({ sets, previous, suffix, onChange, done, onToggle, onRemove, noun = 'Set', gaps, resting }: Props) {
  const setReps = (k: number, v: number) => onChange(sets.map((y, j) => (j === k ? { ...y, reps: Math.max(0, v) } : y)))
  const toggleWarmup = (k: number) => onChange(sets.map((y, j) => (j === k ? { ...y, warmup: !y.warmup } : y)))
  const [open, setOpen] = useState<number | null>(null)

  const timed = suffix === 's'
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

  return (
    <div className="divide-y">
      {sets.map((s, k) => {
        const gap = gaps?.[k]
        const live = resting?.index === k
        const holding = hold?.index === k
        return (
          <SwipeRow key={k} onDelete={() => onRemove(k)}>
            {({ hide, show, remove }) => (
              <>
                <div className="flex items-center gap-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => toggleWarmup(k)}
                    className={cn('w-14 text-left text-xs font-semibold', s.warmup && 'text-muted-foreground')}
                  >
                    {label(sets, k, noun)}
                  </button>
                  <Prev prev={prevFor(sets, k, previous)} className="w-6 text-right" />
                  {open === k ? (
                    <Stepper value={s.reps} suffix={suffix} onChange={(v) => setReps(k, v)} />
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
                      {suffix}
                    </button>
                  )}
                  {open === k && (
                    <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setOpen(null)}>
                      Done
                    </Button>
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
