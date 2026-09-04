import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" size="icon-lg" aria-label="minus" onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus />
      </Button>
      <div className="relative">
        <Input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 w-16 text-center text-lg font-semibold tabular-nums md:text-lg"
        />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground">{suffix}</span>}
      </div>
      <Button type="button" variant="secondary" size="icon-lg" aria-label="plus" onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus />
      </Button>
    </div>
  )
}
