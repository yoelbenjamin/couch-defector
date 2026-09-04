import { lazy, Suspense } from 'react'

// Dev-only visual feedback toolbar. Annotations sync to the local agentation-mcp server.
const Toolbar = lazy(() => import('agentation').then((m) => ({ default: m.Agentation })))

export function AgentationDev() {
  if (!import.meta.env.DEV) return null
  return (
    <Suspense fallback={null}>
      <Toolbar endpoint="http://localhost:4747" />
    </Suspense>
  )
}
