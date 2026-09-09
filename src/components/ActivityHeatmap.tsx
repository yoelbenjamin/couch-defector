import { useMemo, type CSSProperties } from 'react'
import { dayKey } from '@/lib/schedule'
import { cn } from '@/lib/utils'
import type { Session } from '@/types'

const DAY = 86400000

/** Monday of the week containing d. */
function weekStart(d: Date) {
  const t = new Date(dayKey(d))
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7))
  return t.getTime()
}

/** Day-key bounds of the grid: first Monday shown through today, plus the number of days elapsed. */
export function heatmapRange(weeks = 26, now = new Date()) {
  const today = dayKey(now)
  const start = weekStart(now) - (weeks - 1) * 7 * DAY
  return { start, today, days: Math.round((today - start) / DAY) + 1 }
}

interface Props {
  sessions: Session[]
  weeks?: number
  className?: string
  /** Day key of the selected cell, if any. */
  selected?: number | null
  /** Called with the day key when a trained day is tapped, or null when the selected day is tapped again. */
  onSelect?: (dayKey: number | null) => void
  /** Data not here yet: every cell is empty and the shimmer sweeps across in a loop. */
  loading?: boolean
}

/**
 * Tight activity grid: one column per week, one cell per day, filled dark when you trained.
 * Ends on the current week so the newest cells are on the right. Trained days are tappable.
 */
export default function ActivityHeatmap({ sessions, weeks = 26, className, selected = null, onSelect, loading = false }: Props) {
  const now = new Date()
  const today = dayKey(now)
  const start = weekStart(now) - (weeks - 1) * 7 * DAY

  const { counts, mobility } = useMemo(() => {
    const counts = new Map<number, number>()
    const mobility = new Set<number>()
    for (const s of sessions) {
      const k = dayKey(new Date(s.date))
      if (s.kind === 'mobility') mobility.add(k)
      else counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return { counts, mobility }
  }, [sessions])

  const cells: { key: number; count: number; mob: boolean; future: boolean; isToday: boolean; delay: number }[] = []
  // Random per-cell timing, fixed for the life of the component so re-renders don't replay the shimmer.
  // About 60% of tiles flash, each at a random moment within the first ~1.1s; the rest stay still.
  const timing = useMemo(() => Array.from({ length: weeks * 7 }, () => (Math.random() < 0.6 ? Math.random() * 1100 : -1)), [weeks])
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const key = start + (w * 7 + d) * DAY
      cells.push({ key, count: counts.get(key) ?? 0, mob: mobility.has(key), future: key > today, isToday: key === today, delay: timing[w * 7 + d] })
    }
  }

  return (
    <div
      className={cn('grid grid-flow-col gap-[3px]', className)}
      style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
      role="group"
      aria-label={`Training activity, last ${weeks} weeks`}
    >
      {cells.map((c) => {
        // Days ahead stay invisible even when they are the day being viewed.
        const isSelected = selected === c.key && !c.future
        const col = Math.floor(cells.indexOf(c) / 7)
        const style = { '--shimmer-delay': loading ? `${col * 45}ms` : `${Math.round(Math.max(0, c.delay))}ms` } as CSSProperties
        const cls = cn(
          'aspect-square rounded-[2px]',
          loading ? !c.future && 'heat-cell heat-cell--loop' : c.delay >= 0 && !c.future && 'heat-cell',
          c.future ? 'bg-transparent' : c.count > 0 ? 'bg-foreground/85' : c.mob ? 'bg-foreground/35' : 'bg-white/90 ring-1 ring-black/[0.06] ring-inset',
          c.isToday && c.count === 0 && !c.mob && 'ring-1 ring-foreground/40 ring-inset',
          // Selected: a focus ring around the cell. Only a trained day also fills solid.
          isSelected && 'ring-2 ring-foreground ring-offset-1 ring-offset-background',
          isSelected && c.count > 0 && 'bg-foreground',
        )
        if ((c.count === 0 && !c.mob && !c.isToday) || !onSelect) return <div key={c.key} className={cls} style={style} data-filled={c.count > 0 ? '' : undefined} />
        const label = new Date(c.key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
        const what = c.isToday && c.count === 0 && !c.mob ? 'today' : c.count > 0 ? `${c.count} session${c.count === 1 ? '' : 's'}` : 'Trifecta'
        return (
          <button
            key={c.key}
            type="button"
            style={{ ...style, appearance: 'none', padding: 0, margin: 0, border: 0, display: 'block', font: 'inherit' }}
            aria-label={`${label}, ${what}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(c.isToday || isSelected ? null : c.key)}
            className={cls}
                        data-filled=""
          />
        )
      })}
    </div>
  )
}
