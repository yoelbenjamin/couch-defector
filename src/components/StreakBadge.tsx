import { cn } from '@/lib/utils'
import type { StreakInfo } from '@/lib/stats'

/** Metallic pill for the streak. Graphite → Steel → Silver → Gold as the run grows from days to months. */
export default function StreakBadge({ streak, className }: { streak: StreakInfo; className?: string }) {
  return (
    <span className={cn('metal', `metal--${streak.tier}`, className)} title={`${streak.days} day${streak.days === 1 ? '' : 's'} unbroken`}>
      {streak.label} streak
    </span>
  )
}
