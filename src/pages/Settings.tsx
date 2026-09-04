import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { getProgram, PROGRAMS } from '@/data/programs'
import { PROGRESSION_IDS, PROGRESSIONS } from '@/data/progressions'
import { useStore } from '@/lib/store'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Slot } from '@/types'

export default function Settings() {
  const { data, cloud, user, signOut, setProgram, setStep, setCustomName } = useStore()
  const program = getProgram(data.programId)
  const customSlots = program.cycle.flatMap((c) => ('rest' in c && c.rest ? [] : c.day.slots.filter((s): s is Slot & { kind: 'custom' } => s.kind === 'custom')))
  const uniqueCustom = customSlots.filter((s, i, a) => a.findIndex((x) => x.key === s.key) === i)

  return (
    <div className="space-y-3">
      <PageHeader
        title="Settings"
        action={
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link to="/" aria-label="Close settings">
              <X className="size-5" />
            </Link>
          </Button>
        }
      />

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs text-muted-foreground">Account</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {cloud && user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{user.displayName ?? 'Signed in'}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Device-only mode. Data is stored in this browser.</p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs text-muted-foreground">Program</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <Select value={program.id} onValueChange={setProgram}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROGRAMS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CardDescription className="mt-2 text-xs">{program.tagline}</CardDescription>
          {program.note && <CardDescription className="mt-1 text-xs">{program.note}</CardDescription>}
          <CardDescription className="mt-2 text-xs opacity-70">Your step on each movement carries over between programs.</CardDescription>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs text-muted-foreground">Starting point</CardTitle>
          <CardDescription className="text-xs">Where you are on each of the six movements. Pick the hardest step you can do for at least a few clean reps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-4">
          {PROGRESSION_IDS.map((pid) => (
            <div key={pid} className="flex items-center justify-between gap-3">
              <span className="text-sm">{PROGRESSIONS[pid].name}</span>
              <Select value={String(data.steps[pid] ?? 1)} onValueChange={(v) => setStep(pid, Number(v))}>
                <SelectTrigger className="h-9 w-48 text-xs">
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
        </CardContent>
      </Card>

      {uniqueCustom.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-xs text-muted-foreground">Your exercise picks</CardTitle>
            <CardDescription className="text-xs">Name the movement you use for each open slot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-4">
            {uniqueCustom.map((s) => (
              <label key={s.key} className="block">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <Input
                  defaultValue={data.customNames[s.key] ?? ''}
                  placeholder={s.label}
                  onBlur={(e) => e.target.value.trim() !== (data.customNames[s.key] ?? '') && setCustomName(s.key, e.target.value.trim())}
                  className="mt-0.5"
                />
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="pt-3 text-center text-[11px] text-muted-foreground/60">Couch Defector · v0.1</p>
    </div>
  )
}
