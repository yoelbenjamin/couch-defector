import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProgram } from '@/data/programs'
import { getStep, PROGRESSIONS } from '@/data/progressions'
import { relativeDay } from '@/lib/schedule'
import { checkGoal, fmtSets, lastEntryForSlot, lastEntryForStep } from '@/lib/stats'
import { newId, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import Stepper from '@/components/Stepper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Entry, ProgressionId, Session, SetEntry, Slot, UserData } from '@/types'

function setsForStep(progression: ProgressionId, stepN: number, sessions: Session[]): SetEntry[] {
  const step = getStep(progression, stepN)
  const last = lastEntryForStep(sessions, progression, stepN)
  const hard: SetEntry[] = last
    ? last.entry.sets.filter((s) => !s.warmup).map((s) => ({ reps: s.reps }))
    : Array.from({ length: Math.max(2, step.goal.sets) }, () => ({ reps: step.start }))
  if (step.unit !== 'reps') return hard
  return [{ reps: Math.max(1, Math.round((hard[0]?.reps ?? step.start) / 2)), warmup: true }, ...hard]
}

function initialEntry(slot: Slot, data: UserData, programId: string): Entry {
  if (slot.kind === 'progression') {
    const stepN = data.steps[slot.progression] ?? 1
    const step = getStep(slot.progression, stepN)
    return { slotKey: slot.key, name: step.name, unit: step.unit, progression: slot.progression, step: stepN, sets: setsForStep(slot.progression, stepN, data.sessions) }
  }
  const last = lastEntryForSlot(data.sessions, programId, slot.key)
  const name = data.customNames[slot.key] || slot.label
  const sets: SetEntry[] = last ? last.entry.sets.map((s) => ({ ...s })) : [{ reps: 10 }, { reps: 10 }]
  return { slotKey: slot.key, name, unit: slot.unit ?? 'reps', sets }
}

export default function Log() {
  const { dayIndex: dayIndexParam } = useParams()
  const dayIndex = Number(dayIndexParam)
  const nav = useNavigate()
  const { data, saveSession, setStep } = useStore()
  const program = getProgram(data.programId)
  const cycleDay = program.cycle[dayIndex]
  const day = cycleDay && !('rest' in cycleDay && cycleDay.rest) ? cycleDay.day : null
  const draftKey = `draft:${program.id}:${dayIndex}`

  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const raw = sessionStorage.getItem(draftKey)
      if (raw) return JSON.parse(raw) as Entry[]
    } catch {
      /* ignore */
    }
    return day ? day.slots.map((s) => initialEntry(s, data, program.id)) : []
  })
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sessionStorage.setItem(draftKey, JSON.stringify(entries))
  }, [entries, draftKey])

  const lastBySlot = useMemo(() => {
    const m = new Map<string, ReturnType<typeof lastEntryForSlot>>()
    for (const e of entries) m.set(e.slotKey, lastEntryForSlot(data.sessions, program.id, e.slotKey))
    return m
  }, [entries, data.sessions, program.id])

  if (!day) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Not a workout day.{' '}
        <Button variant="link" onClick={() => nav('/')}>
          Back
        </Button>
      </div>
    )
  }

  const update = (i: number, fn: (e: Entry) => Entry) => setEntries((list) => list.map((e, k) => (k === i ? fn(e) : e)))

  const changeStep = async (i: number, stepN: number) => {
    const e = entries[i]
    if (!e.progression) return
    await setStep(e.progression, stepN)
    const step = getStep(e.progression, stepN)
    update(i, (x) => ({ ...x, step: stepN, name: step.name, unit: step.unit, sets: setsForStep(e.progression!, stepN, data.sessions) }))
  }

  const finish = async () => {
    setSaving(true)
    const session: Session = {
      id: newId(),
      date: new Date().toISOString(),
      programId: program.id,
      dayIndex,
      dayName: day.name,
      entries: entries.filter((e) => e.sets.some((s) => s.reps > 0)),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    await saveSession(session)
    sessionStorage.removeItem(draftKey)
    nav('/', { replace: true })
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-2 py-2 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => nav(-1)}>
          <ChevronLeft /> Back
        </Button>
        <div className="font-semibold">{day.name}</div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            sessionStorage.removeItem(draftKey)
            setEntries(day.slots.map((s) => initialEntry(s, data, program.id)))
          }}
        >
          Reset
        </Button>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-32">
        {entries.map((e, i) => {
          const last = lastBySlot.get(e.slotKey) ?? null
          const sameStep = last && e.progression ? last.entry.step === e.step : true
          const goal = checkGoal(e)
          const step = e.progression && e.step ? getStep(e.progression, e.step) : null
          const suffix = e.unit === 'seconds' ? 's' : undefined
          return (
            <Card key={e.slotKey} className="py-4">
              <CardContent className="px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {e.progression ? (
                      <Select value={String(e.step)} onValueChange={(v) => changeStep(i, Number(v))}>
                        <SelectTrigger className="h-auto w-full border-0 bg-transparent px-0 py-0.5 text-base font-semibold shadow-none dark:bg-transparent dark:hover:bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSIONS[e.progression].steps.map((s) => (
                            <SelectItem key={s.n} value={String(s.n)}>
                              {s.n}. {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="font-semibold">{e.name}</div>
                    )}
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {last && sameStep ? (
                        <>
                          Last time <span className="text-foreground">{fmtSets(last.entry)}</span> · {relativeDay(last.session.date)}
                        </>
                      ) : step ? (
                        <>
                          Suggested start {step.goal.sets} × {step.start}
                          {suffix}
                        </>
                      ) : (
                        'First time'
                      )}
                    </div>
                    {step?.cue && <div className="mt-1 text-xs text-muted-foreground">{step.cue}</div>}
                  </div>
                  {step && (
                    <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                      goal
                      <div className="text-sm font-semibold text-foreground">
                        {step.goal.sets} × {step.goal.reps}
                        {suffix}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {e.sets.map((s, k) => (
                    <div key={k} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => update(i, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === k ? { ...y, warmup: !y.warmup } : y)) }))}
                        className={cn(
                          'w-14 shrink-0 rounded-lg py-1 text-center text-[11px] font-semibold',
                          s.warmup ? 'bg-secondary text-muted-foreground' : 'bg-primary/15 text-primary',
                        )}
                        title="Tap to toggle warm-up"
                      >
                        {s.warmup ? 'warm-up' : `set ${e.sets.slice(0, k).filter((y) => !y.warmup).length + 1}`}
                      </button>
                      <Stepper value={s.reps} suffix={suffix} onChange={(v) => update(i, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === k ? { ...y, reps: v } : y)) }))} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto text-muted-foreground"
                        onClick={() => update(i, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== k) }))}
                        aria-label="remove set"
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => update(i, (x) => ({ ...x, sets: [...x.sets, { reps: x.sets.filter((y) => !y.warmup).at(-1)?.reps ?? 0 }] }))}
                  >
                    + Add set
                  </Button>
                  <div className="flex gap-1.5">
                    {goal?.reached && <Badge className="bg-emerald-500/15 text-emerald-300">Goal hit, move up next time</Badge>}
                    {goal?.overBand && !goal.reached && <Badge className="bg-yellow-500/15 text-yellow-300">Over 20, try a harder step</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        <Card className="py-4">
          <CardContent className="px-4">
            <label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Note</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="How did it feel? Anything to change next time?" className="mt-1 resize-none" />
          </CardContent>
        </Card>
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Button size="lg" className="h-12 w-full" disabled={saving} onClick={finish}>
            {saving ? 'Saving…' : 'Finish workout'}
          </Button>
        </div>
      </div>
    </div>
  )
}
