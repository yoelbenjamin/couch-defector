import { useState } from 'react'
import { Check, Minus, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Stepper from '@/components/Stepper'
import { Button } from '@/components/ui/button'
import type { SetEntry } from '@/types'

export type SetLayout = 'rows' | 'tiles' | 'focus' | 'checklist'
export type PrevMode = 'off' | 'beside' | 'diff'

interface Props {
  sets: SetEntry[]
  /** Last time's hard-set reps, in order. Aligned to this exercise's hard sets by position. */
  previous?: number[]
  prevMode?: PrevMode
  suffix?: string
  variant: SetLayout
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

/** Four ways to log the sets of one exercise. Switch with the `setLayout` idea flag. */
export default function SetEditor({ sets, previous, prevMode = 'beside', suffix, variant, onChange }: Props) {
  const setReps = (k: number, v: number) => onChange(sets.map((y, j) => (j === k ? { ...y, reps: Math.max(0, v) } : y)))
  const toggleWarmup = (k: number) => onChange(sets.map((y, j) => (j === k ? { ...y, warmup: !y.warmup } : y)))
  const remove = (k: number) => onChange(sets.filter((_, j) => j !== k))
  const ops = {
    sets,
    suffix,
    previous,
    prevMode,
    setReps,
    toggleWarmup,
    remove,
  }

  if (variant === 'tiles') return <Tiles {...ops} />
  if (variant === 'focus') return <Focus {...ops} />
  if (variant === 'checklist') return <Checklist {...ops} />
  return <Rows {...ops} />
}

type Ops = {
  sets: SetEntry[]
  suffix?: string
  previous?: number[]
  prevMode: PrevMode
  setReps: (k: number, v: number) => void
  toggleWarmup: (k: number) => void
  remove: (k: number) => void
}

/* A. One row per set: label pill, last time, stepper, remove. */
function Rows({ sets, suffix, previous, prevMode, setReps, toggleWarmup, remove }: Ops) {
  const showPrev = prevMode !== 'off' && !!previous
  return (
    <div className="space-y-2">
      {showPrev && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="w-14" />
          <span className="w-8 text-right">{prevMode === 'beside' ? 'last' : 'vs last'}</span>
        </div>
      )}
      {sets.map((s, k) => (
        <div key={k} className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleWarmup(k)}
            className={cn(
              'w-14 shrink-0 rounded-lg py-1 text-center text-[11px] font-semibold',
              s.warmup ? 'bg-secondary text-muted-foreground' : 'bg-foreground text-background',
            )}
            title="Tap to toggle warm-up"
          >
            {label(sets, k)}
          </button>
          {showPrev && (
            <span className="w-8 text-right">
              <Prev prev={prevFor(sets, k, previous)} cur={s.reps} mode={prevMode} />
            </span>
          )}
          <Stepper value={s.reps} suffix={suffix} onChange={(v) => setReps(k, v)} />
          <Button type="button" variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground" onClick={() => remove(k)} aria-label="remove set">
            <X />
          </Button>
        </div>
      ))}
    </div>
  )
}

/* B. Tiles: every set is a card with a big number and its own −/+. */
function Tiles({ sets, suffix, previous, prevMode, setReps, toggleWarmup, remove }: Ops) {
  return (
    <div className="flex flex-wrap gap-2">
      {sets.map((s, k) => {
        const prev = prevFor(sets, k, previous)
        return (
          <div key={k} className={cn('relative w-[76px] rounded-lg border px-1.5 pt-1.5 pb-1 text-center', s.warmup && 'bg-secondary/60')}>
            <button type="button" onClick={() => toggleWarmup(k)} className="text-[10px] font-semibold text-muted-foreground">
              {s.warmup ? 'Warm-up' : label(sets, k)}
            </button>
            <div className="text-2xl leading-tight font-bold tabular-nums">
              {s.reps}
              {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
            </div>
            <div className="h-4 text-[10px] leading-4">
              {prev !== undefined && prevMode !== 'off' && (
                <>
                  {prevMode === 'beside' && <span className="text-muted-foreground">last </span>}
                  <Prev prev={prev} cur={s.reps} mode={prevMode} className="text-[10px]" />
                </>
              )}
            </div>
            <div className="mt-0.5 flex justify-between">
              <button
                type="button"
                aria-label="minus"
                onClick={() => setReps(k, s.reps - 1)}
                className="flex size-7 items-center justify-center rounded-md bg-secondary"
              >
                <Minus className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="plus"
                onClick={() => setReps(k, s.reps + 1)}
                className="flex size-7 items-center justify-center rounded-md bg-foreground text-background"
              >
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
        )
      })}
    </div>
  )
}

/* C. Focus: the sets as a row of chips, one stepper for whichever chip is selected. */
function Focus({ sets, suffix, previous, prevMode, setReps, toggleWarmup, remove }: Ops) {
  const firstHard = Math.max(
    0,
    sets.findIndex((s) => !s.warmup),
  )
  const [selRaw, setSel] = useState(firstHard)
  const sel = Math.min(selRaw, sets.length - 1)
  const cur = sets[sel]
  const prev = cur ? prevFor(sets, sel, previous) : undefined
  return (
    <div className="">
      <div className="flex flex-wrap gap-1.5">
        {sets.map((s, k) => {
          const p = prevFor(sets, k, previous)
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSel(k)}
              className={cn(
                'min-w-11 rounded-md border px-2.5 py-1 text-sm font-semibold tabular-nums',
                sel === k ? 'border-foreground bg-foreground text-background' : s.warmup ? 'text-muted-foreground' : '',
              )}
            >
              {s.warmup && <span className="mr-1 text-[10px] font-normal opacity-70">W</span>}
              {s.reps}
              {suffix}
              {p !== undefined && prevMode !== 'off' && (
                <span className={cn('block text-[10px] font-normal leading-3', sel === k ? 'opacity-70' : 'text-muted-foreground')}>
                  {prevMode === 'beside' ? `last ${p}` : s.reps - p > 0 ? `+${s.reps - p}` : s.reps - p < 0 ? `−${p - s.reps}` : '='}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {cur && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="w-14 text-[11px] font-semibold text-muted-foreground">{label(sets, sel)}</span>
          <Stepper value={cur.reps} suffix={suffix} onChange={(v) => setReps(sel, v)} />
          {prev !== undefined && prevMode !== 'off' && (
            <span className="text-xs text-muted-foreground">
              {prevMode === 'beside' ? 'last ' : ''}
              <Prev prev={prev} cur={cur.reps} mode={prevMode} />
            </span>
          )}
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

/* D. Checklist: tick sets off as you do them; tap the number to adjust just that one. */
function Checklist({ sets, suffix, previous, prevMode, setReps, toggleWarmup, remove }: Ops) {
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
          <button
            type="button"
            onClick={() => toggleWarmup(k)}
            className={cn('w-14 text-left text-[11px] font-semibold', s.warmup ? 'text-muted-foreground' : '')}
          >
            {label(sets, k)}
          </button>
          {prevMode === 'beside' && <Prev prev={prevFor(sets, k, previous)} cur={s.reps} mode={prevMode} className="w-6 text-right" />}
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
