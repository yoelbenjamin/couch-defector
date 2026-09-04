import { useState } from 'react'
import { getProgram, PROGRAMS } from '@/data/programs'
import { useStore } from '@/lib/store'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Slot } from '@/types'

export default function Settings() {
  const { data, cloud, user, signOut, setProgram, setCustomName, exportJson, importJson } = useStore()
  const program = getProgram(data.programId)
  const [importText, setImportText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const customSlots = program.cycle.flatMap((c) => ('rest' in c && c.rest ? [] : c.day.slots.filter((s): s is Slot & { kind: 'custom' } => s.kind === 'custom')))
  const uniqueCustom = customSlots.filter((s, i, a) => a.findIndex((x) => x.key === s.key) === i)

  return (
    <div className="space-y-3">
      <PageHeader title="Settings" />

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">Account</CardTitle>
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
            <p className="text-sm text-muted-foreground">Device-only mode. Data is stored in this browser. Export below to back it up.</p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">Program</CardTitle>
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

      {uniqueCustom.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">Your exercise picks</CardTitle>
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

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">Backup</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exportJson())
                  setMsg('Copied your data to the clipboard.')
                } catch {
                  setMsg('Clipboard blocked. Long-press the text below to copy.')
                  setImportText(exportJson())
                }
              }}
            >
              Copy export
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={!importText.trim()}
              onClick={async () => {
                try {
                  await importJson(importText)
                  setImportText('')
                  setMsg('Imported.')
                } catch {
                  setMsg('That did not look like a valid export.')
                }
              }}
            >
              Import
            </Button>
          </div>
          <Textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={3} placeholder="Paste an export here to import" className="mt-2 resize-none font-mono text-[11px]" />
          {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">How it works</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>Warm up, then two hard sets per exercise. Stop a rep or two short of failure.</li>
            <li>Work in the 6–20 rep range. Around 10 is the sweet spot for building muscle.</li>
            <li>Beat last time by at least one rep. When you hit a step’s goal, move up.</li>
            <li>Never train the same muscles two days in a row. Take at least two days off a week.</li>
            <li>Sleep and eat. You grow between sessions.</li>
          </ul>
        </CardContent>
      </Card>
      <p className="pt-3 text-center text-[11px] text-muted-foreground/60">Couch Defector · v0.1</p>
    </div>
  )
}
