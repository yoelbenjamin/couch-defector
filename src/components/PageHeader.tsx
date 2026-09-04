import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useStore } from '@/lib/store'

/**
 * Page title with an action slot top right.
 * Default action is the profile button, which opens Settings. Pass `action={null}` to hide it.
 */
export default function PageHeader({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode | null }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
      </div>
      <div className="shrink-0">{action === undefined ? <ProfileButton /> : action}</div>
    </header>
  )
}

export function ProfileButton() {
  const { user } = useStore()
  const label = user ? `${user.displayName ?? user.email ?? 'Account'} · Settings` : 'Settings'
  return (
    <Link
      to="/settings"
      aria-label={label}
      className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-foreground text-background"
    >
      {user?.photoURL ? (
        <img src={user.photoURL} alt="" className="size-full object-cover grayscale contrast-125" referrerPolicy="no-referrer" />
      ) : (
        <User className="size-4" />
      )}
    </Link>
  )
}
