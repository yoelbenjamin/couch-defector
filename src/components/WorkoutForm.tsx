import { useEffect, useMemo, useState } from "react";
import { Info, Plus } from "lucide-react";
import { toast } from "sonner";
import { getProgram } from "@/data/programs";
import { getStep, PROGRESSIONS } from "@/data/progressions";
import {
  checkGoal,
  hardSets,
  lastEntryForSlot,
  lastEntryForStep,
} from "@/lib/stats";
import { newId, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useIdea } from "@/dev/proto";
import SetEditor from "@/components/SetEditor";
import TechniqueSheet from "@/components/TechniqueSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  Entry,
  Program,
  ProgressionId,
  Session,
  SetEntry,
  Slot,
  UserData,
} from "@/types";

function setsForStep(
  progression: ProgressionId,
  stepN: number,
  sessions: Session[],
  workSets: number,
): SetEntry[] {
  const step = getStep(progression, stepN);
  const last = lastEntryForStep(sessions, progression, stepN);
  const hard: SetEntry[] = last
    ? last.entry.sets.filter((s) => !s.warmup).map((s) => ({ reps: s.reps }))
    : Array.from({ length: Math.max(workSets, step.goal.sets) }, () => ({
        reps: step.start,
      }));
  if (step.unit !== "reps") return hard;
  return [
    {
      reps: Math.max(1, Math.round((hard[0]?.reps ?? step.start) / 2)),
      warmup: true,
    },
    ...hard,
  ];
}

function initialEntry(slot: Slot, data: UserData, program: Program): Entry {
  if (slot.kind === "progression") {
    const stepN = data.steps[slot.progression] ?? 1;
    const step = getStep(slot.progression, stepN);
    return {
      slotKey: slot.key,
      name: step.name,
      unit: step.unit,
      progression: slot.progression,
      step: stepN,
      sets: setsForStep(
        slot.progression,
        stepN,
        data.sessions,
        program.workSets,
      ),
    };
  }
  const last = lastEntryForSlot(data.sessions, program.id, slot.key);
  const name = data.customNames[slot.key] || slot.label;
  const sets: SetEntry[] = last
    ? last.entry.sets.map((s) => ({ ...s }))
    : [{ reps: 10 }, { reps: 10 }];
  return { slotKey: slot.key, name, unit: slot.unit ?? "reps", sets };
}

const clone = (s: Session) =>
  s.entries.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x })) }));

/**
 * The logging form for one workout day: every exercise prefilled from last time, steppers per set, a note, Finish.
 * Drafts persist in sessionStorage until saved. Pass `editing` to change a logged session in place.
 */
export default function WorkoutForm({
  dayIndex,
  editing = null,
  footer = "inline",
  onSaved,
}: {
  dayIndex: number;
  editing?: Session | null;
  /** `sticky` pins Finish to the bottom of the viewport (full-screen Log). `inline` renders it after the note. */
  footer?: "inline" | "sticky";
  onSaved?: (s: Session) => void;
}) {
  const { data, saveSession, setStep } = useStore();
  const setLayout = useIdea("setLayout");
  const prevSet = useIdea("prevSet");
  const program = getProgram(data.programId);
  const cycleDay = program.cycle[dayIndex];
  const day =
    cycleDay && !("rest" in cycleDay && cycleDay.rest) ? cycleDay.day : null;
  const draftKey = `draft:${program.id}:${dayIndex}`;
  // "Last time" should not point at the session being edited.
  const others = useMemo(
    () =>
      editing
        ? data.sessions.filter((x) => x.id !== editing.id)
        : data.sessions,
    [data.sessions, editing],
  );

  const [entries, setEntries] = useState<Entry[]>(() => {
    if (editing) return clone(editing);
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) return JSON.parse(raw) as Entry[];
    } catch {
      /* ignore */
    }
    return day ? day.slots.map((s) => initialEntry(s, data, program)) : [];
  });
  const [note, setNote] = useState(editing?.note ?? "");
  const [showNote, setShowNote] = useState(false);
  const [info, setInfo] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) return;
    sessionStorage.setItem(draftKey, JSON.stringify(entries));
  }, [entries, draftKey, editing]);

  const lastBySlot = useMemo(() => {
    const m = new Map<string, ReturnType<typeof lastEntryForSlot>>();
    for (const e of entries)
      m.set(e.slotKey, lastEntryForSlot(others, program.id, e.slotKey));
    return m;
  }, [entries, others, program.id]);

  if (!day)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Not a workout day.
      </p>
    );

  const update = (i: number, fn: (e: Entry) => Entry) =>
    setEntries((list) => list.map((e, k) => (k === i ? fn(e) : e)));

  const changeStep = async (i: number, stepN: number) => {
    const e = entries[i];
    if (!e.progression) return;
    await setStep(e.progression, stepN);
    const step = getStep(e.progression, stepN);
    update(i, (x) => ({
      ...x,
      step: stepN,
      name: step.name,
      unit: step.unit,
      sets: setsForStep(e.progression!, stepN, data.sessions, program.workSets),
    }));
  };

  const reset = () => {
    if (editing) {
      setEntries(clone(editing));
      setNote(editing.note ?? "");
      return;
    }
    sessionStorage.removeItem(draftKey);
    setEntries(day.slots.map((s) => initialEntry(s, data, program)));
    setNote("");
    setShowNote(false);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const kept = entries.filter((e) => e.sets.some((s) => s.reps > 0));
      const trimmed = note.trim();
      const session: Session = editing
        ? { ...editing, entries: kept }
        : {
            id: newId(),
            date: new Date().toISOString(),
            programId: program.id,
            dayIndex,
            dayName: day.name,
            entries: kept,
          };
      if (trimmed) session.note = trimmed;
      else delete session.note;
      await saveSession(session);
      if (!editing) sessionStorage.removeItem(draftKey);
      toast.success(editing ? "Workout updated" : "Workout saved", {
        description: `${session.entries.length} exercises logged for ${day.name}.`,
      });
      onSaved?.(session);
    } finally {
      setSaving(false);
    }
  };

  const finishButton = (
    <Button
      size="lg"
      className="h-12 w-full"
      disabled={saving}
      onClick={finish}
    >
      {saving ? "Saving…" : editing ? "Save changes" : "Finish workout"}
    </Button>
  );

  return (
    <div className={cn("space-y-3", footer === "sticky" && "pb-28")}>
      {entries.map((e, i) => {
        const last = lastBySlot.get(e.slotKey) ?? null;
        const sameStep =
          last && e.progression ? last.entry.step === e.step : true;
        const goal = checkGoal(e);
        const step =
          e.progression && e.step ? getStep(e.progression, e.step) : null;
        const suffix = e.unit === "seconds" ? "s" : undefined;
        return (
          <section key={e.slotKey}>
            <div className="mb-2 flex items-center justify-between gap-2">
              {e.progression ? (
                <Select
                  value={String(e.step)}
                  onValueChange={(v) => changeStep(i, Number(v))}
                >
                  <SelectTrigger className="h-auto w-auto max-w-full border-0 bg-transparent px-0 py-0.5 text-xl font-bold [&>svg]:size-5">
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
                <h2 className="text-xl font-bold">{e.name}</h2>
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
            <Card className="py-4">
              <CardContent className="px-4">
                <SetEditor
                  sets={e.sets}
                  previous={
                    last && sameStep
                      ? hardSets(last.entry).map((x) => x.reps)
                      : undefined
                  }
                  prevMode={prevSet}
                  suffix={suffix}
                  variant={setLayout}
                  onChange={(sets) => update(i, (x) => ({ ...x, sets }))}
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
                            reps:
                              x.sets.filter((y) => !y.warmup).at(-1)?.reps ?? 0,
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="size-3.5" /> Add set
                  </Button>
                  <div className="flex gap-1.5">
                    {goal?.reached && (
                      <Badge variant="secondary">
                        Goal hit, move up next time
                      </Badge>
                    )}
                    {goal?.overBand && !goal.reached && (
                      <Badge variant="secondary">
                        Over 20, try a harder step
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        );
      })}

      <TechniqueSheet
        entry={info === null ? null : (entries[info] ?? null)}
        open={info !== null}
        onOpenChange={(o) => !o && setInfo(null)}
      />

      {showNote || note ? (
        <Card className="py-4">
          <CardContent className="px-4">
            <label className="text-xs font-semibold text-muted-foreground">
              Note
            </label>
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => setShowNote(true)}
        >
          <Plus className="size-3.5" /> Add note
        </Button>
      )}

      {footer === "inline" ? (
        <div className="pt-1">
          {finishButton}
          <div className="mt-1 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={reset}
            >
              Reset
            </Button>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] [&>*]:pointer-events-auto">
          <div className="flex flex-col items-center gap-1">
            {finishButton}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={reset}
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
