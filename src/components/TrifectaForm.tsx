import { useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { getProgram } from '@/data/programs'
import { DEFAULT_HOLD_SETS, getHoldStep, HOLD_IDS, HOLDS, TRIFECTA_RULES } from '@/data/trifecta'
import { dayKey, weekdayIndex } from '@/lib/schedule'
import { hardSets } from '@/lib/stats'
import { newId, useStore } from '@/lib/store'
import SetEditor from '@/components/SetEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Entry, HoldId, Session, SetEntry } from '@/types'

interface Draft {
  date: number
  entries: Entry[]
  done: Record<string, boolean[]>
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
    return { ...d, done: d.done ?? {} }
  } catch {
    return null
  }
}

/** Most recent Trifecta entry for a hold at a given step. */
function lastHold(sessions: Session[], hold: HoldId, step: number, excludeId?: string) {
  for (const s of [...sessions].sort((a, b) => b.date.localeCompare(a.date))) {
    if (s.kind !== 'mobility' || s.id === excludeId) continue
    const e = s.entries.find((x) => x.hold === hold && x.step === step)
    if (e) return e
  }
  return null
}

function initialEntry(hold: HoldId, stepN: number, sessions: Session[]): Entry {
  const st = getHoldStep(hold, stepN)
  const last = lastHold(sessions, hold, stepN)
  const sets: SetEntry[] = last ? last.sets.map((x) => ({ ...x })) : DEFAULT_HOLD_SETS.map((x) => ({ ...x }))
  return { slotKey: hold, name: st.name, unit: 'seconds', hold, step: stepN, sets }
}

const cloneEntries = (s: Session) => s.entries.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x })) }))

/**
 * The rest-day Trifecta: bridge hold, L-hold, twist hold, each at your current step with a seconds
 * counter per chunk. Saves as a mobility session, which never counts as training.
 */
export default function TrifectaForm({ editing = null, onSaved }: { editing?: Session | null; onSaved?: (s: Session) => void }) {
  const { data, saveSession, setHoldStep } = useStore()
  const program = getProgram(data.programId)
  const draftKey = editing ? `draft:trifecta:edit:${editing.id}` : `draft:trifecta:${program.id}`
  const draft = useMemo(() => readDraft(draftKey, !editing), [draftKey, editing])

  const fresh = () => HOLD_IDS.map((h) => initialEntry(h, data.holdSteps?.[h] ?? 1, data.sessions))
  const [entries, setEntries] = useState<Entry[]>(() => draft?.entries ?? (editing ? cloneEntries(editing) : fresh()))
  const [done, setDone] = useState<Record<string, boolean[]>>(draft?.done ?? {})
  const [info, setInfo] = useState<HoldId | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ date: dayKey(new Date()), entries, done } satisfies Draft))
    } catch {
      /* ignore */
    }
  }, [entries, done, draftKey])

  const update = (i: number, fn: (e: Entry) => Entry) => setEntries((list) => list.map((e, k) => (k === i ? fn(e) : e)))

  const changeStep = async (i: number, stepN: number) => {
    const e = entries[i]
    if (!e.hold) return
    await setHoldStep(e.hold, stepN)
    update(i, () => initialEntry(e.hold!, stepN, data.sessions))
  }

  const reset = () => {
    localStorage.removeItem(draftKey)
    setDone({})
    setEntries(editing ? cloneEntries(editing) : fresh())
  }

  const finish = async () => {
    setSaving(true)
    try {
      const kept = entries.filter((e) => e.sets.some((s) => s.reps > 0))
      const session: Session = editing
        ? { ...editing, entries: kept }
        : {
            id: newId(),
            date: new Date().toISOString(),
            programId: program.id,
            dayIndex: weekdayIndex(new Date()),
            dayName: 'Trifecta',
            kind: 'mobility',
            entries: kept,
          }
      await saveSession(session)
      localStorage.removeItem(draftKey)
      toast.success(editing ? 'Trifecta updated' : 'Trifecta done', { description: 'Joints oiled. Rest up.' })
      onSaved?.(session)
    } finally {
      setSaving(false)
    }
  }

  const infoHold = info ? HOLDS[info] : null
  const infoEntry = info ? entries.find((e) => e.hold === info) : null
  const infoStep = infoHold && infoEntry?.step ? getHoldStep(infoHold.id, infoEntry.step) : null

  return (
    <div className="space-y-3">
      {entries.map((e, i) => {
        if (!e.hold) return null
        const hold = HOLDS[e.hold]
        const prev = lastHold(data.sessions, e.hold, e.step ?? 1, editing?.id)
        const total = hardSets(e).reduce((t, s) => t + s.reps, 0)
        return (
          <section key={e.slotKey}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Select value={String(e.step)} onValueChange={(v) => changeStep(i, Number(v))}>
                <SelectTrigger className="h-auto w-auto max-w-full border-0 bg-transparent px-0 py-0.5 text-xl font-bold [&>svg]:size-5">
                  <SelectValue>{e.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {hold.steps.map((s) => (
                    <SelectItem key={s.n} value={String(s.n)}>
                      {s.n}. {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground" aria-label="How to do it" onClick={() => setInfo(e.hold!)}>
                <Info className="size-4" />
              </Button>
            </div>
            <Card className="py-4">
              <CardContent className="px-4">
                <SetEditor
                  sets={e.sets}
                  suffix="s"
                  noun="Hold"
                  previous={prev ? hardSets(prev).map((x) => x.reps) : undefined}
                  onChange={(sets) => update(i, (x) => ({ ...x, sets }))}
                  done={done[e.slotKey] ?? []}
                  onDoneChange={(d) => setDone((all) => ({ ...all, [e.slotKey]: d }))}
                />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 text-muted-foreground"
                    onClick={() => update(i, (x) => ({ ...x, sets: [...x.sets, { reps: x.sets.at(-1)?.reps ?? 5 }] }))}
                  >
                    + Add hold
                  </Button>
                  <span className="tabular-nums">
                    {total}s total{hold.perSide ? ' per side' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>
        )
      })}

      <div className="pt-1">
        <Button size="lg" className="h-12 w-full" disabled={saving} onClick={finish}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Finish Trifecta'}
        </Button>
        <div className="mt-1 text-center">
          <Button variant="ghost" className="h-11 px-8 text-muted-foreground" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      <Sheet open={info !== null} onOpenChange={(o) => !o && setInfo(null)}>
        <SheetContent side="bottom" className="h-[100dvh] gap-0 overflow-y-auto rounded-none p-0">
          {infoHold && infoStep && (
            <div className="mx-auto max-w-md px-5 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+32px)]">
              <SheetHeader className="p-0 text-left">
                <SheetTitle className="text-2xl font-bold">{infoStep.name}</SheetTitle>
                <SheetDescription>
                  {infoHold.name} · step {infoStep.n} of {infoHold.steps.length}
                  {infoHold.perSide ? ' · both sides' : ''}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-6 text-[15px] leading-relaxed">
                <section>
                  <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">This step</h3>
                  <p>{infoStep.cue}</p>
                </section>
                <section>
                  <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">{infoHold.name}</h3>
                  <p>{infoHold.why}</p>
                </section>
                <section>
                  <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">The Trifecta</h3>
                  <ul className="list-disc space-y-1.5 pl-5">
                    {TRIFECTA_RULES.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </section>
              </div>
              <Button variant="outline" className="mt-8 w-full" onClick={() => setInfo(null)}>
                Close
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
