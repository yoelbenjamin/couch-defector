import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Session } from '@/types'

const DAY = 86400000

function dayKey(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
/** Monday of the week containing d. */
function weekStart(d: Date) {
  const t = new Date(dayKey(d))
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7))
  return t.getTime()
}

/**
 * Tight activity grid: one column per week, one cell per day, filled dark when you trained.
 * Ends on the current week so the newest cells are on the right.
 */
export default function ActivityHeatmap({ sessions, weeks = 26, className }: { sessions: Session[]; weeks?: number; className?: string }) {
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
  const inRange = [...counts.entries()].filter(([k]) => k >= start && k <= today).reduce((t, [, c]) => t + c, 0)

  return (
    <div className={className}>
      <div
        className="grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
        aria-label={`Training activity, last ${weeks} weeks`}
        role="img"
      >
        {cells.map((c) => (
          <div
            key={c.key}
            className={cn(
              'aspect-square rounded-[2px]',
              c.future ? 'bg-transparent' : c.count === 0 ? 'bg-foreground/[0.07]' : c.count === 1 ? 'bg-foreground/80' : 'bg-foreground',
              c.isToday && c.count === 0 && 'ring-1 ring-foreground/40 ring-inset',
            )}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>Last {weeks} weeks</span>
        <span className="tabular-nums">{inRange} sessions</span>
      </div>
    </div>
  )
}
