import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { getProgram, PROGRAMS, workoutDays } from '@/data/programs'
import { getStep, PROGRESSION_IDS, PROGRESSIONS } from '@/data/progressions'
import { planToday } from '@/lib/schedule'
import { newId } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Entry, ProgressionId, Slot } from '@/types'
import { IDEA_KEYS, IDEAS, type IdeaKey } from './ideas'
import { PROTO_AVAILABLE, useProto } from './proto'
import { SCENARIO_GROUPS, SCENARIOS } from './scenarios'

/**
 * Prototype controller: jump between app states, flip idea flags, and poke at sandbox data.
 * Opens from the flask button (bottom-left) or Cmd/Ctrl + period.
 */
export function ProtoController() {
  if (!PROTO_AVAILABLE) return null
  return <Controller />
}

function Controller() {
  const [open, setOpen] = useState(false)
  const proto = useProto()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const scenario = SCENARIOS.find((s) => s.id === proto.scenarioId?.replace(/\*$/, ''))
  const status = !proto.enabled ? 'Live data' : `${scenario?.name ?? 'Custom'}${proto.scenarioId?.endsWith('*') ? ' (edited)' : ''}`

  return (
    <>
      <button
        type="button"
        aria-label="Prototype controller"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-20 left-3 z-50 flex size-9 items-center justify-center rounded-full border bg-card/90 text-muted-foreground backdrop-blur transition hover:text-foreground',
          proto.enabled && 'border-primary/50 text-primary',
        )}
      >
        <FlaskConical className="size-4" />
        {proto.enabled && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-[360px] flex-col gap-0 p-0 sm:max-w-[360px]">
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-base">Prototype</SheetTitle>
                <SheetDescription className="truncate text-xs">
                  {status}
                  {proto.enabled && (
                    <>
                      {' · '}
                      {proto.auth === 'signed-in' ? 'signed in' : 'signed out'}
                    </>
                  )}
                </SheetDescription>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                Frame
                <Switch checked={proto.frame} onCheckedChange={proto.setFrame} />
              </label>
            </div>
          </SheetHeader>

          <Tabs defaultValue="states" className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList className="mx-4 mt-3 grid w-auto grid-cols-4">
              <TabsTrigger value="states">States</TabsTrigger>
              <TabsTrigger value="ideas">Ideas</TabsTrigger>
              <TabsTrigger value="go">Go</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
            </TabsList>
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 py-4">
                <TabsContent value="states" className="mt-0">
                  <StatesTab close={() => setOpen(false)} />
                </TabsContent>
                <TabsContent value="ideas" className="mt-0">
                  <IdeasTab />
                </TabsContent>
                <TabsContent value="go" className="mt-0">
                  <GoTab close={() => setOpen(false)} />
                </TabsContent>
                <TabsContent value="data" className="mt-0">
                  <DataTab />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  )
}

/* ---------- States ---------- */

function StatesTab({ close }: { close: () => void }) {
  const proto = useProto()
  const nav = useNavigate()
  const activeId = proto.scenarioId?.replace(/\*$/, '')

  const load = (id: string) => {
    const s = SCENARIOS.find((x) => x.id === id)!
    proto.loadScenario(s.id, s.auth ?? 'signed-in', s.build())
    nav('/')
    toast(`Loaded “${s.name}”`)
    close()
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{proto.enabled ? 'Sandbox on' : 'Live data'}</div>
            <div className="text-xs text-muted-foreground">
              {proto.enabled ? 'Scenario data. Your real log is untouched.' : 'Showing your real account or device data.'}
            </div>
          </div>
          {proto.enabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                proto.disable()
                nav('/')
                close()
              }}
            >
              Use live
            </Button>
          )}
        </div>
        {proto.enabled && (
          <div className="mt-3">
            <Label className="mb-1.5 block text-xs text-muted-foreground">Auth</Label>
            <ToggleGroup type="single" variant="outline" size="sm" value={proto.auth} onValueChange={(v) => v && proto.setAuth(v as 'signed-in' | 'signed-out')} className="w-full">
              <ToggleGroupItem value="signed-in" className="flex-1 text-xs">
                Signed in
              </ToggleGroupItem>
              <ToggleGroupItem value="signed-out" className="flex-1 text-xs">
                Signed out
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </div>

      {SCENARIO_GROUPS.map((g) => (
        <section key={g}>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{g}</h3>
          <div className="space-y-1.5">
            {SCENARIOS.filter((s) => s.group === g).map((s) => {
              const active = proto.enabled && activeId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => load(s.id)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left transition hover:bg-accent',
                    active && 'border-primary/50 bg-primary/5',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{s.name}</span>
                    {active && <Badge variant="secondary" className="text-[10px]">active</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

/* ---------- Ideas ---------- */

function IdeasTab() {
  const proto = useProto()
  const areas = [...new Set(IDEA_KEYS.map((k) => IDEAS[k].area))]
  const changed = IDEA_KEYS.filter((k) => proto.ideas[k] !== IDEAS[k].default).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {changed === 0 ? 'All defaults.' : `${changed} flag${changed === 1 ? '' : 's'} changed.`}
        </p>
        <Button size="sm" variant="ghost" onClick={proto.resetIdeas} disabled={changed === 0}>
          <RotateCcw className="size-3.5" /> Reset
        </Button>
      </div>
      {areas.map((area) => (
        <section key={area}>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{area}</h3>
          <div className="space-y-3">
            {IDEA_KEYS.filter((k) => IDEAS[k].area === area).map((k) => (
              <IdeaRow key={k} k={k} />
            ))}
          </div>
        </section>
      ))}
      <p className="text-[11px] text-muted-foreground/70">
        Add a flag in <code>src/dev/ideas.ts</code> and read it with <code>useIdea()</code>. It appears here automatically.
      </p>
    </div>
  )
}

function IdeaRow({ k }: { k: IdeaKey }) {
  const proto = useProto()
  const def = IDEAS[k]
  const value = proto.ideas[k]
  const dirty = value !== def.default
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {def.label}
            {dirty && <span className="size-1.5 rounded-full bg-primary" />}
          </div>
          <div className="text-xs text-muted-foreground">{def.description}</div>
        </div>
        {def.kind === 'toggle' && <Switch checked={value as boolean} onCheckedChange={(v) => proto.setIdea(k, v as never)} />}
      </div>
      {def.kind === 'choice' && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          value={value as string}
          onValueChange={(v) => v && proto.setIdea(k, v as never)}
        >
          {def.options.map((o) => (
            <ToggleGroupItem key={o} value={o} className="flex-1 text-xs capitalize">
              {o}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  )
}

/* ---------- Go ---------- */

function GoTab({ close }: { close: () => void }) {
  const nav = useNavigate()
  const proto = useProto()
  const program = getProgram(proto.data.programId)
  const go = (to: string) => {
    nav(to)
    close()
  }
  const routes = [
    ['/', 'Today'],
    ['/settings', 'Settings'],
  ] as const
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Screens</h3>
        <div className="grid grid-cols-2 gap-2">
          {routes.map(([to, label]) => (
            <Button key={to} variant="outline" onClick={() => go(to)}>
              {label}
            </Button>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Log a day · {program.name}</h3>
        <div className="grid grid-cols-2 gap-2">
          {workoutDays(program).map((d) => (
            <Button key={d.index} variant="outline" onClick={() => go(`/log/${d.index}`)}>
              {d.day.name}
            </Button>
          ))}
        </div>
        {!proto.enabled && <p className="mt-2 text-[11px] text-muted-foreground">Uses the program from your live data.</p>}
      </section>
      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Gated screens</h3>
        <p className="text-xs text-muted-foreground">
          Sign-in and Onboarding are reached through state, not routes. Load “Signed out” or “New account” from States.
        </p>
      </section>
      <Separator />
      <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
        <RotateCcw className="size-3.5" /> Reload page
      </Button>
    </div>
  )
}

/* ---------- Data ---------- */

function DataTab() {
  const proto = useProto()
  const nav = useNavigate()
  const program = getProgram(proto.data.programId)
  const plan = useMemo(() => (proto.data.programId ? planToday(program, proto.data.sessions) : null), [program, proto.data])

  if (!proto.enabled) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Data editing works on sandbox data only, so your real log stays safe.</p>
        <Button
          onClick={() => {
            const s = SCENARIOS.find((x) => x.id === 'due-today')!
            proto.loadScenario(s.id, 'signed-in', s.build())
            nav('/')
          }}
        >
          Start a sandbox
        </Button>
      </div>
    )
  }

  const logToday = () => {
    if (!plan) return
    const entries: Entry[] = plan.day.slots.map((s: Slot) => {
      if (s.kind === 'progression') {
        const n = proto.data.steps[s.progression] ?? 1
        const step = getStep(s.progression, n)
        const reps = Math.max(step.start, Math.round(step.goal.reps * 0.7))
        return {
          slotKey: s.key,
          name: step.name,
          unit: step.unit,
          progression: s.progression,
          step: n,
          sets: [{ reps: Math.round(reps / 2), warmup: true }, ...Array.from({ length: step.goal.sets }, () => ({ reps }))],
        }
      }
      return { slotKey: s.key, name: proto.data.customNames[s.key] || s.label, unit: s.unit ?? 'reps', sets: [{ reps: 10 }, { reps: 10 }] }
    })
    proto.setData((d) => ({
      ...d,
      sessions: [
        ...d.sessions,
        { id: newId(), date: new Date().toISOString(), programId: program.id, dayIndex: plan.dayIndex, dayName: plan.day.name, entries },
      ],
    }))
    toast(`Logged ${plan.day.name}`)
  }

  return (
    <div className="space-y-5">
      <section>
        <Label className="mb-1.5 block text-xs text-muted-foreground">Program</Label>
        <Select value={proto.data.programId ?? ''} onValueChange={(v) => proto.setData((d) => ({ ...d, programId: v }))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="No program (onboarding)" />
          </SelectTrigger>
          <SelectContent>
            {PROGRAMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {proto.data.programId && (
          <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => proto.setData((d) => ({ ...d, programId: null }))}>
            Clear program (show onboarding)
          </Button>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Current steps</h3>
        <div className="space-y-2">
          {PROGRESSION_IDS.map((pid: ProgressionId) => (
            <div key={pid} className="flex items-center justify-between gap-3">
              <span className="text-sm">{PROGRESSIONS[pid].name}</span>
              <Select
                value={String(proto.data.steps[pid] ?? 1)}
                onValueChange={(v) => proto.setData((d) => ({ ...d, steps: { ...d.steps, [pid]: Number(v) } }))}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRESSIONS[pid].steps.map((st) => (
                    <SelectItem key={st.n} value={String(st.n)} className="text-xs">
                      {st.n}. {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Sessions · {proto.data.sessions.length}</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={logToday} disabled={!plan}>
            Log today
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={proto.data.sessions.length === 0}
            onClick={() => proto.setData((d) => ({ ...d, sessions: d.sessions.slice(0, -1) }))}
          >
            Remove last
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={proto.data.sessions.length === 0}
            onClick={() =>
              proto.setData((d) => ({
                ...d,
                sessions: d.sessions.map((s) => ({ ...s, date: new Date(new Date(s.date).getTime() - 86400000).toISOString() })),
              }))
            }
          >
            Shift back a day
          </Button>
          <Button variant="outline" size="sm" disabled={proto.data.sessions.length === 0} onClick={() => proto.setData((d) => ({ ...d, sessions: [] }))}>
            Clear all
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">“Shift back a day” ages every session by one day: turn “done today” into “rest day” into “due”.</p>
      </section>

      <Separator />
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(JSON.stringify(proto.data, null, 2))
          toast('Sandbox JSON copied')
        }}
      >
        Copy sandbox JSON
      </Button>
    </div>
  )
}
