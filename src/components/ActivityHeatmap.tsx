import { useMemo } from 'react'
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
}

/**
 * Tight activity grid: one column per week, one cell per day, filled dark when you trained.
 * Ends on the current week so the newest cells are on the right. Trained days are tappable.
 */
export default function ActivityHeatmap({ sessions, weeks = 26, className, selected = null, onSelect }: Props) {
  const now = new Date()
  const today = dayKey(now)
  const start = weekStart(now) - (weeks - 1) * 7 * DAY

  const counts = useMemo(() => {
    const m = new Map<number, number>()
    for (const s of sessions) {
      const k = dayKey(new Date(s.date))
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [sessions])

  const cells: { key: number; count: number; future: boolean; isToday: boolean }[] = []
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const key = start + (w * 7 + d) * DAY
      cells.push({ key, count: counts.get(key) ?? 0, future: key > today, isToday: key === today })
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
        const isSelected = selected === c.key
        const cls = cn(
          'aspect-square rounded-[2px]',
          c.future ? 'bg-transparent' : c.count === 0 ? 'bg-foreground/[0.07]' : 'bg-foreground/80',
          c.isToday && c.count === 0 && 'ring-1 ring-foreground/40 ring-inset',
          isSelected && 'bg-foreground ring-2 ring-foreground ring-offset-1 ring-offset-background',
        )
        if (c.count === 0 || !onSelect) return <div key={c.key} className={cls} />
        const label = new Date(c.key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
        return (
          <button
            key={c.key}
            type="button"
            aria-label={`${label}, ${c.count} session${c.count === 1 ? '' : 's'}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? null : c.key)}
            className={cls}
          />
        )
      })}
    </div>
  )
}
