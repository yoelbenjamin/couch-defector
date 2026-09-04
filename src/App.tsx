import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from '@/lib/store'
import Layout from '@/components/Layout'
import SignIn from '@/pages/SignIn'
import Onboarding from '@/pages/Onboarding'
import Today from '@/pages/Today'
import Log from '@/pages/Log'
import Progress from '@/pages/Progress'
import History from '@/pages/History'
import Settings from '@/pages/Settings'

export default function App() {
  const { ready, needsSignIn, data } = useStore()

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="animate-pulse text-sm">Loading…</div>
      </div>
    )
  }
  if (needsSignIn) return <SignIn />
  if (!data.programId) return <Onboarding />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Today />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/log/:dayIndex" element={<Log />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
