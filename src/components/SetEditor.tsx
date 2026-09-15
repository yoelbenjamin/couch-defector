import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { elapsedSec, fmtShort, useNow } from '@/lib/timer'
import Stepper from '@/components/Stepper'
import SwipeRow from '@/components/SwipeRow'
import { Button } from '@/components/ui/button'
import type { SetEntry } from '@/types'

interface Props {
  sets: SetEntry[]
  /** Last time's hard-set reps, in order. Aligned to this exercise's hard sets by position. */
  previous?: number[]
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
 */
export default function SetEditor({ sets, previous, suffix, onChange, done, onToggle, onRemove, noun = 'Set', gaps, resting }: Props) {
  const setReps = (k: number, v: number) => onChange(sets.map((y, j) => (j === k ? { ...y, reps: Math.max(0, v) } : y)))
  const toggleWarmup = (k: number) => onChange(sets.map((y, j) => (j === k ? { ...y, warmup: !y.warmup } : y)))
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="divide-y">
      {sets.map((s, k) => {
        const gap = gaps?.[k]
        const live = resting?.index === k
        return (
          <SwipeRow key={k} label={`Remove ${label(sets, k, noun).toLowerCase()}`} onDelete={() => onRemove(k)}>
            <div className="flex items-center gap-3 py-1.5">
              <button type="button" onClick={() => toggleWarmup(k)} className={cn('w-14 text-left text-xs font-semibold', s.warmup && 'text-muted-foreground')}>
                {label(sets, k, noun)}
              </button>
              <Prev prev={prevFor(sets, k, previous)} className="w-6 text-right" />
              {open === k ? (
                <Stepper value={s.reps} suffix={suffix} onChange={(v) => setReps(k, v)} />
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
              <button
                type="button"
                aria-label={done[k] ? 'mark not done' : 'mark done'}
                onClick={() => onToggle(k)}
                className={cn(
                  'mr-0.5 ml-auto flex size-7 shrink-0 items-center justify-center rounded-full border',
                  done[k] && 'border-foreground bg-foreground text-background',
                )}
              >
                {done[k] && <Check className="size-4" />}
              </button>
            </div>
            {(live || gap !== undefined) && (
              <div className="-mt-0.5 pb-1 text-xs text-muted-foreground">
                {live ? <RestClock from={resting.from} /> : <span className="tabular-nums">Rested {fmtShort(gap!)}</span>}
              </div>
            )}
          </SwipeRow>
        )
      })}
    </div>
  )
}
