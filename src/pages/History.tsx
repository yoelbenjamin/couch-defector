import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fmtDate } from '@/lib/schedule'
import { fmtSets } from '@/lib/stats'
import { useStore } from '@/lib/store'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export default function History() {
  const { data, deleteSession } = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const sessions = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader
        title="History"
        sub={`${sessions.length} session${sessions.length === 1 ? '' : 's'} logged`}
        action={
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link to="/" aria-label="Back to today">
              <X className="size-5" />
            </Link>
          </Button>
        }
      />
      {sessions.length === 0 && (
        <Card className="py-4">
          <CardContent className="px-4 text-center text-sm text-muted-foreground">Nothing yet. Your first workout will show up here.</CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {sessions.map((s) => {
          const isOpen = open === s.id
          return (
            <Card key={s.id} className="py-3">
              <CardContent className="px-4">
                <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(isOpen ? null : s.id)}>
                  <div>
                    <div className="font-semibold">{s.dayName}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(s.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {s.entries.length} exercises {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                </button>
                {isOpen && (
                  <>
                    <Separator className="my-3" />
                    <ul className="space-y-1 text-sm">
                      {s.entries.map((e) => (
                        <li key={e.slotKey} className="flex justify-between">
                          <span>
                            {e.name}
                            {e.step ? <span className="text-muted-foreground"> · step {e.step}</span> : null}
                          </span>
                          <span className="text-muted-foreground tabular-nums">{fmtSets(e)}</span>
                        </li>
                      ))}
                    </ul>
                    {s.note && <p className="mt-2 rounded-lg bg-background p-2 text-xs text-muted-foreground">{s.note}</p>}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="mt-3 w-full">
                          Delete session
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {s.dayName} on {fmtDate(s.date)} will be removed from your log. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await deleteSession(s.id)
                              toast('Session deleted')
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
