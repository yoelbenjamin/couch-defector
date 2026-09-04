import { Activity, History, TrendingUp } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: 'Today', Icon: Activity },
  { to: '/progress', label: 'Progress', Icon: TrendingUp },
  { to: '/history', label: 'History', Icon: History },
]

export default function Layout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="safe-top flex-1 overflow-y-auto px-4 pt-8 pb-24">
        <Outlet />
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2.5 text-[11px]', isActive ? 'text-primary' : 'text-muted-foreground')}
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
