import { useState } from 'react'
import { DEFAULT_PROGRAM_ID, PROGRAMS } from '@/data/programs'
import { useStore } from '@/lib/store'
import { WEEKDAY_SHORT } from '@/lib/schedule'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, Tray } from '@/components/ui/card'

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
          {PROGRAMS.map((p) => (
            <Card
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => setChoice(p.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setChoice(p.id)}
              variant="inset"
              className={cn('cursor-pointer transition', choice === p.id && 'ring-2 ring-foreground')}
            >
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.name}</span>
                  {levelBadge(p.level)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{p.tagline}</div>
                <div className="mt-2 text-xs text-muted-foreground/70">
                  {p.cycle
                    .map((c, i) => ('rest' in c && c.rest ? null : `${WEEKDAY_SHORT[i]} ${c.day.name}`))
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </CardContent>
            </Card>
          ))}
        </Tray>
      </div>
    </div>
  )
}
