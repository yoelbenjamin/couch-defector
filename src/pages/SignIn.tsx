import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'

export default function SignIn() {
  const { signIn } = useStore()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+40px)] pb-[calc(env(safe-area-inset-bottom,0px)+40px)]">
      <div className="pt-10">
        <img src="/icon.svg" alt="" className="mb-6 size-16 rounded-2xl" />
        <h1 className="text-3xl font-bold tracking-tight">Couch Defector</h1>
        <p className="mt-2 text-muted-foreground">A progressive calisthenics tracker. See what today is, what you did last time, and beat it by a rep.</p>
      </div>
      <div>
        <Button
          size="lg"
          className="h-12 w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setErr(null)
            try {
              await signIn()
            } catch (e) {
              setErr(e instanceof Error ? e.message : 'Sign-in failed')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </Button>
        {err && <p className="mt-3 text-center text-xs text-destructive">{err}</p>}
        <p className="mt-4 text-center text-xs text-muted-foreground">Your log is private to your account and syncs across devices.</p>
      </div>
    </div>
  )
}
