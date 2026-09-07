import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Stepper from '@/components/Stepper'
import { Button } from '@/components/ui/button'
import type { SetEntry } from '@/types'

export type PrevMode = 'off' | 'beside' | 'diff'

interface Props {
  sets: SetEntry[]
  /** Last time's hard-set reps, in order. Aligned to this exercise's hard sets by position. */
  previous?: number[]
  prevMode?: PrevMode
  suffix?: string
  onChange: (sets: SetEntry[]) => void
}

function label(sets: SetEntry[], k: number) {
  return sets[k].warmup ? 'Warm-up' : `Set ${sets.slice(0, k).filter((y) => !y.warmup).length + 1}`
}
function prevFor(sets: SetEntry[], k: number, previous?: number[]) {
  if (!previous || sets[k].warmup) return undefined
  return previous[sets.slice(0, k).filter((y) => !y.warmup).length]
}

/** Last time's number, or the difference against it, as a small muted token. */
function Prev({ prev, cur, mode, className }: { prev?: number; cur: number; mode: PrevMode; className?: string }) {
  if (mode === 'off' || prev === undefined) return null
  if (mode === 'beside') return <span className={cn('text-xs text-muted-foreground tabular-nums', className)}>{prev}</span>
  const d = cur - prev
  return (
    <span className={cn('text-xs tabular-nums', d > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground', className)}>
      {d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '='}
    </span>
  )
}

/**
 * The sets of one exercise as a checklist: remove on the left, label, last time, the reps, and a tick on the right.
 * Tap the number to adjust just that set. Ticks are session-only, a mid-workout aid, not saved data.
 */
export default function SetEditor({ sets, previous, prevMode = 'beside', suffix, onChange }: Props) {
  const setReps = (k: number, v: number) => onChange(sets.map((y, j) => (j === k ? { ...y, reps: Math.max(0, v) } : y)))
  const toggleWarmup = (k: number) => onChange(sets.map((y, j) => (j === k ? { ...y, warmup: !y.warmup } : y)))
  const remove = (k: number) => onChange(sets.filter((_, j) => j !== k))
  const [done, setDone] = useState<boolean[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const toggleDone = (k: number) =>
    setDone((d) => {
      const n = [...d]
      n[k] = !n[k]
      return n
    })

  return (
    <div className="divide-y">
      {sets.map((s, k) => (
        <div key={k} className="flex items-center gap-3 py-1.5">
          <Button type="button" variant="ghost" size="icon-sm" className="-ml-2 text-muted-foreground" onClick={() => remove(k)} aria-label="remove set">
            <X />
          </Button>
          <button type="button" onClick={() => toggleWarmup(k)} className={cn('w-14 text-left text-[11px] font-semibold', s.warmup && 'text-muted-foreground')}>
            {label(sets, k)}
          </button>
          {prevMode === 'beside' && <Prev prev={prevFor(sets, k, previous)} cur={s.reps} mode={prevMode} className="w-6 text-right" />}
          {open === k ? (
            <Stepper value={s.reps} suffix={suffix} onChange={(v) => setReps(k, v)} />
          ) : (
            <button type="button" onClick={() => setOpen(k)} className={cn('text-lg font-semibold tabular-nums', done[k] && 'text-muted-foreground line-through')}>
              {s.reps}
              {suffix}
            </button>
          )}
          {prevMode === 'diff' && <Prev prev={prevFor(sets, k, previous)} cur={s.reps} mode={prevMode} />}
          {open === k && (
            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setOpen(null)}>
              Done
            </Button>
          )}
          <button
            type="button"
            aria-label={done[k] ? 'mark not done' : 'mark done'}
            onClick={() => toggleDone(k)}
            className={cn('ml-auto flex size-7 shrink-0 items-center justify-center rounded-full border', done[k] && 'border-foreground bg-foreground text-background')}
          >
            {done[k] && <Check className="size-4" />}
          </button>
        </div>
      ))}
    </div>
  )
}
