import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Stepper from '@/components/Stepper'
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
  onDoneChange: (done: boolean[]) => void
  /** Word for one row: "Set" for reps, "Hold" for timed work. */
  noun?: string
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

/**
 * The sets of one exercise as a checklist: remove on the left, label, last time, the reps, and a tick on the right.
 * Tap the number to adjust just that set. Ticks are a mid-workout aid kept in the draft, not saved with the session.
 */
export default function SetEditor({ sets, previous, suffix, onChange, done, onDoneChange, noun = 'Set' }: Props) {
  const setReps = (k: number, v: number) => onChange(sets.map((y, j) => (j === k ? { ...y, reps: Math.max(0, v) } : y)))
  const toggleWarmup = (k: number) => onChange(sets.map((y, j) => (j === k ? { ...y, warmup: !y.warmup } : y)))
  const remove = (k: number) => {
    onChange(sets.filter((_, j) => j !== k))
    onDoneChange(done.filter((_, j) => j !== k))
  }
  const [open, setOpen] = useState<number | null>(null)
  const toggleDone = (k: number) => {
    const n = [...done]
    n[k] = !n[k]
    onDoneChange(n)
  }

  return (
    <div className="divide-y">
      {sets.map((s, k) => (
        <div key={k} className="flex items-center gap-3 py-1.5">
          <Button type="button" variant="ghost" size="icon-sm" className="-ml-2 text-muted-foreground" onClick={() => remove(k)} aria-label="remove set">
            <X />
          </Button>
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
            onClick={() => toggleDone(k)}
            className={cn(
              'ml-auto flex size-7 shrink-0 items-center justify-center rounded-full border',
              done[k] && 'border-foreground bg-foreground text-background',
            )}
          >
            {done[k] && <Check className="size-4" />}
          </button>
        </div>
      ))}
    </div>
  )
}
