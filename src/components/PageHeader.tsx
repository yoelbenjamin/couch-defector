import type { ReactNode } from 'react'

export default function PageHeader({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
    </header>
  )
}
