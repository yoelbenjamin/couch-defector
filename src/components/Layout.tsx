import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+32px)]">
        <Outlet />
      </main>
    </div>
  )
}
