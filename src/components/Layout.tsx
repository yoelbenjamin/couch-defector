import { Activity, TrendingUp } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: 'Today', Icon: Activity },
  { to: '/progress', label: 'Progress', Icon: TrendingUp },
]

export default function Layout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+32px)]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] z-10 flex justify-center pointer-events-none">
        <div className="pointer-events-auto inline-flex rounded-lg border bg-background/95 p-1 backdrop-blur">
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn('flex items-center gap-2 rounded-md px-4 py-2 text-sm', isActive ? 'bg-foreground text-background' : 'text-muted-foreground')
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
