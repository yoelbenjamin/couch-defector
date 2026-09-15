import { useEffect, useMemo, useState } from 'react'
import { Info, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { getProgram } from '@/data/programs'
import { getStep, PROGRESSIONS } from '@/data/progressions'
import { checkGoal, hardSets, lastEntryForSlot, lastEntryForStep } from '@/lib/stats'
import { dayKey } from '@/lib/schedule'
import { IDLE_TIMER, isTimerState, liveRest, restsFromTicks, setKey, type TimerState } from '@/lib/timer'
import { newId, useStore } from '@/lib/store'
import SetEditor from '@/components/SetEditor'
import TechniqueSheet from '@/components/TechniqueSheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, Tray } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Entry, Program, ProgressionId, Session, SetEntry, Slot, UserData } from '@/types'

function setsForStep(progression: ProgressionId, stepN: number, sessions: Session[]): SetEntry[] {
  const step = getStep(progression, stepN)
  const last = lastEntryForStep(sessions, progression, stepN)
  // First time on a step: the beginner standard. After that: what you did last time.
  const hard: SetEntry[] = last
    ? last.entry.sets.filter((s) => !s.warmup).map((s) => ({ reps: s.reps }))
    : Array.from({ length: step.beginner.sets }, () => ({ reps: step.beginner.reps }))
  if (step.unit !== 'reps') return hard
  return [{ reps: Math.max(1, Math.round((hard[0]?.reps ?? step.beginner.reps) / 2)), warmup: true }, ...hard]
}

function initialEntry(slot: Slot, data: UserData, program: Program): Entry {
  if (slot.kind === 'progression') {
    const stepN = data.steps[slot.progression] ?? 1
    const step = getStep(slot.progression, stepN)
    return {
      slotKey: slot.key,
      name: step.name,
      unit: step.unit,
      progression: slot.progression,
      step: stepN,
      sets: setsForStep(slot.progression, stepN, data.sessions),
    }
  }
  const last = lastEntryForSlot(data.sessions, program.id, slot.key)
  const name = data.customNames[slot.key] || slot.label
  const sets: SetEntry[] = last ? last.entry.sets.map((s) => ({ ...s })) : [{ reps: 10 }, { reps: 10 }]
  return { slotKey: slot.key, name, unit: slot.unit ?? 'reps', sets }
}

const clone = (s: Session) => s.entries.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x })) }))

interface Draft {
  /** Day the draft was started (dayKey). New-session drafts from another day are discarded. */
  date: number
  entries: Entry[]
  note: string
  /** The clock: when the workout began and when each set was ticked off. */
  timer?: TimerState
}

function readDraft(key: string, mustBeToday: boolean): Draft | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    if (!Array.isArray(d.entries)) return null
    if (mustBeToday && d.date !== dayKey(new Date())) {
      localStorage.removeItem(key)
      return null
    }
    return { ...d, note: d.note ?? '', timer: isTimerState(d.timer) ? d.timer : IDLE_TIMER }
  } catch {
    return null
  }
}

function writeDraft(key: string, d: Draft) {
  try {
    localStorage.setItem(key, JSON.stringify(d))
  } catch {
    /* storage full or unavailable; the form still works for this visit */
  }
}

/**
 * The logging form for one workout day: every exercise prefilled from last time, steppers per set, a note, Finish.
 * The in-progress draft (reps, ticks, note) persists in localStorage until saved, so leaving the screen or
 * closing the app mid-workout loses nothing. A new-session draft is only reused on the day it was started.
 * Pass `editing` to change a logged session in place.
 */
export default function WorkoutForm({
  dayIndex,
  editing = null,
  onSaved,
  onCancel,
}: {
  dayIndex: number
  editing?: Session | null
  onSaved?: (s: Session) => void
  /** Editing in place: shown as a Cancel button next to Reset; drops the edit draft. */
  onCancel?: () => void
}) {
  const { data, saveSession, setStep } = useStore()
  const program = getProgram(data.programId)
  const cycleDay = program.cycle[dayIndex]
  const day = cycleDay && !('rest' in cycleDay && cycleDay.rest) ? cycleDay.day : null
  const draftKey = editing ? `draft:${program.id}:edit:${editing.id}` : `draft:${program.id}:${dayIndex}`
  const draft = useMemo(() => readDraft(draftKey, !editing), [draftKey, editing])
  // "Last time" should not point at the session being edited.
  const others = useMemo(() => (editing ? data.sessions.filter((x) => x.id !== editing.id) : data.sessions), [data.sessions, editing])

  const [entries, setEntries] = useState<Entry[]>(() => {
    if (draft) return draft.entries
    if (editing) return clone(editing)
    return day ? day.slots.map((s) => initialEntry(s, data, program)) : []
  })
  const [note, setNote] = useState(draft?.note ?? editing?.note ?? '')
  const [showNote, setShowNote] = useState(Boolean(draft?.note))
  const [info, setInfo] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [timer, setTimer] = useState<TimerState>(draft?.timer ?? IDLE_TIMER)

  useEffect(() => {
    writeDraft(draftKey, { date: dayKey(new Date()), entries, note, timer })
  }, [entries, note, timer, draftKey])

  // The clock's numbers are derived, never stored on the sets while editing, so ticking and
  // unticking stay reversible and the sets only take their gaps at save time.
  const rests = useMemo(() => restsFromTicks(entries, timer.ticks), [entries, timer.ticks])
  const resting = useMemo(() => liveRest(entries, timer.ticks), [entries, timer.ticks])

  const lastBySlot = useMemo(() => {
    const m = new Map<string, ReturnType<typeof lastEntryForSlot>>()
    for (const e of entries) m.set(e.slotKey, lastEntryForSlot(others, program.id, e.slotKey))
    return m
  }, [entries, others, program.id])

  if (!day) return <p className="py-6 text-center text-sm text-muted-foreground">Not a workout day.</p>

  const update = (i: number, fn: (e: Entry) => Entry) => setEntries((list) => list.map((e, k) => (k === i ? fn(e) : e)))

  const changeStep = async (i: number, stepN: number) => {
    const e = entries[i]
    if (!e.progression) return
    await setStep(e.progression, stepN)
    const step = getStep(e.progression, stepN)
    update(i, (x) => ({
      ...x,
      step: stepN,
      name: step.name,
      unit: step.unit,
      sets: setsForStep(e.progression!, stepN, data.sessions),
    }))
  }

  /** Ticking a set off is the clock. The first tick starts the workout if the button has not. */
  const toggleSet = (entryIndex: number, setIndex: number) => {
    const slotKey = entries[entryIndex]?.slotKey
    if (!slotKey) return
    const key = setKey(slotKey, setIndex)
    setTimer((t) => {
      const ticks = { ...t.ticks }
      if (ticks[key] === undefined) ticks[key] = Date.now()
      else delete ticks[key]
      return { startedAt: t.startedAt ?? Date.now(), ticks }
    })
  }

  /** Dropping a set takes its tick with it, and shuffles the ticks after it down one. */
  const removeSet = (entryIndex: number, setIndex: number) => {
    const e = entries[entryIndex]
    if (!e) return
    update(entryIndex, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== setIndex) }))
    setTimer((t) => {
      const ticks: Record<string, number> = {}
      for (const [k, at] of Object.entries(t.ticks)) {
        const sep = k.lastIndexOf(':')
        const slot = k.slice(0, sep)
        const i = Number(k.slice(sep + 1))
        if (slot !== e.slotKey) ticks[k] = at
        else if (i < setIndex) ticks[k] = at
        else if (i > setIndex) ticks[setKey(slot, i - 1)] = at
      }
      return { ...t, ticks }
    })
  }

  const reset = () => {
    localStorage.removeItem(draftKey)
    setEntries(editing ? clone(editing) : day.slots.map((s) => initialEntry(s, data, program)))
    setNote(editing?.note ?? '')
    setShowNote(Boolean(editing?.note))
    setTimer(IDLE_TIMER)
  }

  const cancel = () => {
    localStorage.removeItem(draftKey)
    onCancel?.()
  }

  const finish = async () => {
    setSaving(true)
    try {
      const timed = entries.map((e) => ({
        ...e,
        sets: e.sets.map((x, k) => {
          const gap = rests[setKey(e.slotKey, k)]
          if (gap === undefined) return x
          return { ...x, rest: gap }
        }),
      }))
      const kept = timed.filter((e) => e.sets.some((s) => s.reps > 0))
      const trimmed = note.trim()
      const session: Session = editing
        ? { ...editing, entries: kept }
        : {
            id: newId(),
            date: new Date().toISOString(),
            programId: program.id,
            dayIndex,
            dayName: day.name,
            entries: kept,
          }
      if (trimmed) session.note = trimmed
      else delete session.note
      // Only a workout that was actually ticked through has a length worth keeping.
      const ran = timer.startedAt === null ? 0 : Math.round((Date.now() - timer.startedAt) / 1000)
      if (ran > 0 && Object.keys(timer.ticks).length > 0) session.durationSec = ran
      else delete session.durationSec
      await saveSession(session)
      localStorage.removeItem(draftKey)
      toast.success(editing ? 'Workout updated' : 'Workout saved', {
        description: `${session.entries.length} exercises logged for ${day.name}.`,
      })
      onSaved?.(session)
    } finally {
      setSaving(false)
    }
  }

  const started = timer.startedAt !== null
  const finishButton =
    !editing && !started ? (
      <Button size="lg" className="h-12 w-full" onClick={() => setTimer((t) => ({ ...t, startedAt: Date.now() }))}>
        Start workout
      </Button>
    ) : (
      <Button size="lg" className="h-12 w-full" disabled={saving} onClick={finish}>
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Finish workout'}
      </Button>
    )

  return (
    <div className="space-y-3">
      <Tray action={finishButton}>
        {entries.map((e, i) => {
          const last = lastBySlot.get(e.slotKey) ?? null
          const sameStep = last && e.progression ? last.entry.step === e.step : true
          const goal = checkGoal(e)
          const step = e.progression && e.step ? getStep(e.progression, e.step) : null
          const suffix = e.unit === 'seconds' ? 's' : undefined
          return (
            <section key={e.slotKey}>
              <Card variant="inset">
                <CardContent>
                  <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
                    {e.progression ? (
                      <Select value={String(e.step)} onValueChange={(v) => changeStep(i, Number(v))}>
                        <SelectTrigger variant="bare" className="min-w-0 flex-1 text-xl font-bold [&>svg]:size-5">
                          <SelectValue>{step?.name ?? e.name}</SelectValue>
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
                      <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{e.name}</h2>
                    )}
                    {e.progression && step && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground"
                        aria-label="How to do it"
                        onClick={() => setInfo(i)}
                      >
                        <Info className="size-4" />
                      </Button>
                    )}
                  </div>
                  <SetEditor
                    sets={e.sets}
                    previous={last && sameStep ? hardSets(last.entry).map((x) => x.reps) : undefined}
                    suffix={suffix}
                    onChange={(sets) => update(i, (x) => ({ ...x, sets }))}
                    done={e.sets.map((_, k) => timer.ticks[setKey(e.slotKey, k)] !== undefined)}
                    onToggle={(k) => toggleSet(i, k)}
                    onRemove={(k) => removeSet(i, k)}
                    gaps={Object.fromEntries(e.sets.map((_, k) => [k, rests[setKey(e.slotKey, k)] ?? e.sets[k].rest]).filter(([, v]) => v !== undefined))}
                    resting={resting?.ref.entryIndex === i ? { index: resting.ref.setIndex, from: resting.from } : undefined}
                  />

                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-2 text-muted-foreground"
                      onClick={() =>
                        update(i, (x) => ({
                          ...x,
                          sets: [
                            ...x.sets,
                            {
                              reps: x.sets.filter((y) => !y.warmup).at(-1)?.reps ?? 0,
                            },
                          ],
                        }))
                      }
                    >
                      <Plus className="size-3.5" /> Add set
                    </Button>
                    <div className="flex gap-1.5">
                      {goal?.level === 'progression' && <Badge variant="secondary">Progression standard. Move up next time</Badge>}
                      {goal?.overBand && !goal.reached && <Badge variant="secondary">Over 20, try a harder step</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )
        })}

        {showNote || note ? (
          <Card variant="inset">
            <CardContent>
              <label className="text-xs font-semibold text-muted-foreground">Note</label>
              <Textarea
                autoFocus={showNote && !note}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="How did it feel? Anything to change next time?"
                className="mt-1 resize-none"
              />
            </CardContent>
          </Card>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="ml-[9px] text-muted-foreground" onClick={() => setShowNote(true)}>
            <Plus className="size-3.5" /> Add note
          </Button>
        )}
      </Tray>

      <TechniqueSheet entry={info === null ? null : (entries[info] ?? null)} open={info !== null} onOpenChange={(o) => !o && setInfo(null)} />

      <div className="flex justify-center gap-2">
        <Button variant="ghost" className="h-11 px-8 text-muted-foreground" onClick={reset}>
          Reset
        </Button>
        {editing && onCancel && (
          <Button variant="ghost" className="h-11 px-8 text-muted-foreground" onClick={cancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
