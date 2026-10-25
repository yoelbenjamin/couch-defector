import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import './amount-stepper.css'

/*
 * The amount stepper from the Wealthsimple year-one demos, ported without its animation library.
 *
 * Behaviour matches the original: plus and minus step and clamp; tapping the value turns it into a text
 * field with the caret at the end; Enter or leaving the field commits an in-range value; Escape cancels;
 * ArrowUp and ArrowDown step, ten times as far with Shift. The digits roll toward the direction of
 * change. The original steps money by a cent; here the step and decimals are props, so reps step by one.
 */

interface Props {
  value: number
  onChange: (n: number) => void
  step?: number
  min?: number
  max?: number
  /** Digits after the decimal point. 0 for reps and seconds. */
  decimals?: number
  prefix?: ReactNode
  suffix?: ReactNode
  className?: string
  'aria-label'?: string
}

const PlusIcon = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
    <path
      d="M3.5498 6.5V4.4502H1.5C1.25147 4.4502 1.0498 4.24853 1.0498 4C1.0498 3.75147 1.25147 3.5498 1.5 3.5498H3.5498V1.5C3.5498 1.25147 3.75147 1.0498 4 1.0498C4.24853 1.0498 4.4502 1.25147 4.4502 1.5V3.5498H6.5C6.74853 3.5498 6.9502 3.75147 6.9502 4C6.9502 4.24853 6.74853 4.4502 6.5 4.4502H4.4502V6.5C4.4502 6.74853 4.24853 6.9502 4 6.9502C3.75147 6.9502 3.5498 6.74853 3.5498 6.5Z"
      fill="black"
    />
  </svg>
)
const MinusIcon = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
    <path
      d="M6.5 3.5498C6.74853 3.5498 6.9502 3.75147 6.9502 4C6.9502 4.24853 6.74853 4.4502 6.5 4.4502H1.5C1.25147 4.4502 1.0498 4.24853 1.0498 4C1.0498 3.75147 1.25147 3.5498 1.5 3.5498H6.5Z"
      fill="black"
    />
  </svg>
)

/** One character position. On change the old character leaves and the new one arrives from the side the value moved toward. */
function Digit({ ch, dir }: { ch: string; dir: 1 | -1 }) {
  const last = useRef(ch)
  const [leaving, setLeaving] = useState<string | null>(null)

  useEffect(() => {
    if (last.current === ch) return
    setLeaving(last.current)
    last.current = ch
    const id = window.setTimeout(() => setLeaving(null), 240)
    return () => window.clearTimeout(id)
  }, [ch])

  if (ch === '.') return <span className="ws-amount-char">.</span>
  const way = dir > 0 ? 'up' : 'down'
  return (
    <span className="ws-amount-digit ws-amount-char">
      <span className="ws-amount-ghost">{ch}</span>
      {leaving !== null && (
        <span key={`out-${leaving}-${ch}`} className={`ws-amount-roll ws-amount-out ${way}`}>
          {leaving}
        </span>
      )}
      <span key={`in-${ch}`} className={cn('ws-amount-roll', leaving !== null && `ws-amount-in ${way}`)}>
        {ch}
      </span>
    </span>
  )
}

export function AmountStepper({ value, onChange, step = 1, min = 0, max = 999, decimals = 0, prefix, suffix, className, ...rest }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const dir = useRef<1 | -1>(1)
  const input = useRef<HTMLInputElement>(null)

  const scale = 10 ** decimals
  const round = (n: number) => Math.round(n * scale) / scale
  const clamp = (n: number) => Math.min(max, Math.max(min, round(n)))
  const fmt = (n: number) => n.toFixed(decimals)

  const bump = (by: number) => {
    dir.current = by > 0 ? 1 : -1
    onChange(clamp(value + by))
  }

  const startEditing = () => {
    if (editing) return
    setDraft(fmt(value))
    setEditing(true)
    requestAnimationFrame(() => {
      const el = input.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }

  const commit = () => {
    setEditing(false)
    const n = parseFloat(draft)
    // Like the original, an empty or out-of-range entry is dropped rather than clamped.
    if (Number.isNaN(n) || n < min || n > max) return
    const next = round(n)
    dir.current = next >= value ? 1 : -1
    onChange(next)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
    const by = (e.shiftKey ? 10 : 1) * step
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const signed = e.key === 'ArrowUp' ? by : -by
      bump(signed)
      setDraft((d) => fmt(clamp((parseFloat(d || '0') || 0) + signed)))
    }
  }

  return (
    <div className={cn('ws-amount', className)} data-editing={editing ? '' : undefined} onClick={startEditing} role="group" aria-label={rest['aria-label']}>
      <div className="ws-amount-value">
        {prefix != null && <span className="ws-amount-affix">{prefix}</span>}
        {editing ? (
          <input
            ref={input}
            className="ws-amount-input"
            value={draft}
            inputMode={decimals > 0 ? 'decimal' : 'numeric'}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            aria-label={rest['aria-label']}
          />
        ) : (
          <span className="flex items-center" aria-live="polite">
            {fmt(value)
              .split('')
              .map((ch, i) => (
                <Digit key={i} ch={ch} dir={dir.current} />
              ))}
          </span>
        )}
        {suffix != null && <span className="ws-amount-affix">{suffix}</span>}
      </div>
      <div className="ws-amount-hit" onClick={(e) => e.stopPropagation()}>
        <div className="ws-amount-stack">
          <button type="button" className="ws-amount-btn" aria-label="plus" disabled={value >= max} onClick={() => bump(step)}>
            <PlusIcon />
          </button>
          <div className="ws-amount-divider" />
          <button type="button" className="ws-amount-btn" aria-label="minus" disabled={value <= min} onClick={() => bump(-step)}>
            <MinusIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
