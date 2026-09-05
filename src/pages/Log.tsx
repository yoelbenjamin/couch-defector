import { useMemo } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getProgram } from '@/data/programs'
import { relativeDay } from '@/lib/schedule'
import { useStore } from '@/lib/store'
import WorkoutForm from '@/components/WorkoutForm'
import { Button } from '@/components/ui/button'

/** Full-screen log for a specific day: used for "other days" and for editing a past session (?session=<id>). */
export default function Log() {
  const { dayIndex: dayIndexParam } = useParams()
  const dayIndex = Number(dayIndexParam)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { data } = useStore()
  const program = getProgram(data.programId)
  const cycleDay = program.cycle[dayIndex]
  const day = cycleDay && !('rest' in cycleDay && cycleDay.rest) ? cycleDay.day : null
  const editing = useMemo(() => {
    const id = params.get('session')
    return id ? (data.sessions.find((x) => x.id === id) ?? null) : null
  }, [params, data.sessions])

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

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center border-b bg-background/95 px-2 pb-2 pt-[calc(env(safe-area-inset-top,0px)+8px)] backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => nav(-1)}>
          <ChevronLeft /> Back
        </Button>
        <div className="flex-1 text-center font-semibold">
          {day.name}
          {editing && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{relativeDay(editing.date)}</span>}
        </div>
        <div className="w-[76px]" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <WorkoutForm key={`${dayIndex}:${editing?.id ?? 'new'}`} dayIndex={dayIndex} editing={editing} footer="sticky" onSaved={() => nav('/', { replace: true })} />
      </main>
    </div>
  )
}
