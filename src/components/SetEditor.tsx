import { useState } from 'react'
import { Check, Minus, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Stepper from '@/components/Stepper'
import { Button } from '@/components/ui/button'
import type { SetEntry } from '@/types'

export type SetLayout = 'rows' | 'tiles' | 'focus' | 'checklist'

interface Props {
  sets: SetEntry[]
  suffix?: string
  variant: SetLayout
  onChange: (sets: SetEntry[]) => void
}

function label(sets: SetEntry[], k: number) {
  return sets[k].warmup ? 'warm-up' : `set ${sets.slice(0, k).filter((y) => !y.warmup).length + 1}`
}

/** Four ways to log the sets of one exercise. Switch with the `setLayout` idea flag. */
export default function SetEditor({ sets, suffix, variant, onChange }: Props) {
  const setReps = (k: number, v: number) => onChange(sets.map((y, j) => (j === k ? { ...y, reps: Math.max(0, v) } : y)))
  const toggleWarmup = (k: number) => onChange(sets.map((y, j) => (j === k ? { ...y, warmup: !y.warmup } : y)))
  const remove = (k: number) => onChange(sets.filter((_, j) => j !== k))
  const ops = { setReps, toggleWarmup, remove }

  if (variant === 'tiles') return <Tiles sets={sets} suffix={suffix} {...ops} />
  if (variant === 'focus') return <Focus sets={sets} suffix={suffix} {...ops} />
  if (variant === 'checklist') return <Checklist sets={sets} suffix={suffix} {...ops} />
  return <Rows sets={sets} suffix={suffix} {...ops} />
}

type Ops = { sets: SetEntry[]; suffix?: string; setReps: (k: number, v: number) => void; toggleWarmup: (k: number) => void; remove: (k: number) => void }

/* A. One row per set: label pill, stepper, remove. The original. */
function Rows({ sets, suffix, setReps, toggleWarmup, remove }: Ops) {
  return (
    <div className="mt-3 space-y-2">
      {sets.map((s, k) => (
        <div key={k} className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleWarmup(k)}
            className={cn('w-14 shrink-0 rounded-lg py-1 text-center text-[11px] font-semibold', s.warmup ? 'bg-secondary text-muted-foreground' : 'bg-foreground text-background')}
            title="Tap to toggle warm-up"
          >
            {label(sets, k)}
          </button>
          <Stepper value={s.reps} suffix={suffix} onChange={(v) => setReps(k, v)} />
          <Button type="button" variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground" onClick={() => remove(k)} aria-label="remove set">
            <X />
          </Button>
        </div>
      ))}
    </div>
  )
}

/* B. Tiles: every set is a card with a big number and its own −/+. Reads at a glance, all sets editable at once. */
function Tiles({ sets, suffix, setReps, toggleWarmup, remove }: Ops) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sets.map((s, k) => (
        <div key={k} className={cn('relative w-[76px] rounded-lg border px-1.5 pt-1.5 pb-1 text-center', s.warmup && 'bg-secondary/60')}>
          <button type="button" onClick={() => toggleWarmup(k)} className="text-[10px] font-semibold text-muted-foreground">
            {s.warmup ? 'warm-up' : label(sets, k)}
          </button>
          <div className="text-2xl leading-tight font-bold tabular-nums">
            {s.reps}
            {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
          </div>
          <div className="mt-1 flex justify-between">
            <button type="button" aria-label="minus" onClick={() => setReps(k, s.reps - 1)} className="flex size-7 items-center justify-center rounded-md bg-secondary">
              <Minus className="size-3.5" />
            </button>
            <button type="button" aria-label="plus" onClick={() => setReps(k, s.reps + 1)} className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
              <Plus className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            aria-label="remove set"
            onClick={() => remove(k)}
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

/* C. Focus: the sets as a row of chips, one stepper for whichever chip is selected. Least clutter. */
function Focus({ sets, suffix, setReps, toggleWarmup, remove }: Ops) {
  const firstHard = Math.max(0, sets.findIndex((s) => !s.warmup))
  const [selRaw, setSel] = useState(firstHard)
  const sel = Math.min(selRaw, sets.length - 1)
  const cur = sets[sel]
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-1.5">
        {sets.map((s, k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSel(k)}
            className={cn(
              'min-w-11 rounded-md border px-2.5 py-1.5 text-sm font-semibold tabular-nums',
              sel === k ? 'border-foreground bg-foreground text-background' : s.warmup ? 'text-muted-foreground' : '',
            )}
          >
            {s.warmup && <span className="mr-1 text-[10px] font-normal opacity-70">W</span>}
            {s.reps}
            {suffix}
          </button>
        ))}
      </div>
      {cur && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="w-14 text-[11px] font-semibold text-muted-foreground">{label(sets, sel)}</span>
          <Stepper value={cur.reps} suffix={suffix} onChange={(v) => setReps(sel, v)} />
          <Button type="button" variant="ghost" size="sm" className="ml-auto text-xs text-muted-foreground" onClick={() => toggleWarmup(sel)}>
            {cur.warmup ? 'Hard set' : 'Warm-up'}
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => remove(sel)} aria-label="remove set">
            <X />
          </Button>
        </div>
      )}
    </div>
  )
}

/* D. Checklist: tick sets off as you do them; tap the number to adjust just that one. Built for logging mid-workout. */
function Checklist({ sets, suffix, setReps, toggleWarmup, remove }: Ops) {
  const [done, setDone] = useState<boolean[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const toggleDone = (k: number) => setDone((d) => { const n = [...d]; n[k] = !n[k]; return n })
  return (
    <div className="mt-3 divide-y">
      {sets.map((s, k) => (
        <div key={k} className="flex items-center gap-3 py-1.5">
          <button
            type="button"
            aria-label={done[k] ? 'mark not done' : 'mark done'}
            onClick={() => toggleDone(k)}
            className={cn('flex size-7 shrink-0 items-center justify-center rounded-full border', done[k] && 'border-foreground bg-foreground text-background')}
          >
            {done[k] && <Check className="size-4" />}
          </button>
          <button type="button" onClick={() => toggleWarmup(k)} className={cn('w-14 text-left text-[11px] font-semibold', s.warmup ? 'text-muted-foreground' : '')}>
            {label(sets, k)}
          </button>
          {open === k ? (
            <Stepper value={s.reps} suffix={suffix} onChange={(v) => setReps(k, v)} />
          ) : (
            <button type="button" onClick={() => setOpen(k)} className={cn('text-lg font-semibold tabular-nums', done[k] && 'text-muted-foreground line-through')}>
              {s.reps}
              {suffix}
            </button>
          )}
          {open === k && (
            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setOpen(null)}>
              Done
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground" onClick={() => remove(k)} aria-label="remove set">
            <X />
          </Button>
        </div>
      ))}
    </div>
  )
}
