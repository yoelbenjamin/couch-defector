import { useState } from 'react'
import { Check } from 'lucide-react'
import { DEFAULT_PROGRAM_ID, PROGRAMS } from '@/data/programs'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, Tray } from '@/components/ui/card'

function levelBadge(level: number) {
  if (level <= 2) return <Badge variant="secondary">Beginner</Badge>
  if (level <= 3) return <Badge variant="secondary">Intermediate</Badge>
  return <Badge variant="secondary">Advanced</Badge>
}

export default function Onboarding() {
  const { setProgram } = useStore()
  const [choice, setChoice] = useState(DEFAULT_PROGRAM_ID)

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
      <h1 className="text-2xl font-bold">Pick a program</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Simpler programs build muscle faster. Everyone starts on step one of each movement; change that any time in Settings.
      </p>
      <div className="mt-4 flex-1 overflow-y-auto">
        <Tray
          action={
            <Button size="lg" className="h-12" onClick={() => setProgram(choice)}>
              Start training
            </Button>
          }
        >
          <Card variant="inset" className="ws-inset--list gap-0 divide-y">
            {PROGRAMS.map((p) => {
              const selected = choice === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setChoice(p.id)}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.name}</span>
                      {levelBadge(p.level)}
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{p.tagline}</div>
                  </div>
                  <span
                    className={cn(
                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border',
                      selected && 'border-foreground bg-foreground text-background',
                    )}
                  >
                    {selected && <Check className="size-3.5" />}
                  </span>
                </button>
              )
            })}
          </Card>
        </Tray>
      </div>
    </div>
  )
}
