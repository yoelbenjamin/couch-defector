import { AmountStepper } from '@/components/ui/amount-stepper'

/** The reps or seconds editor that opens when you tap a set's number: the Wealthsimple amount stepper, stepping by one. */
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
  return <AmountStepper value={value} onChange={onChange} min={min} max={max} suffix={suffix} aria-label={suffix === 's' ? 'Seconds' : 'Reps'} />
}
