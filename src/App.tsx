import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { isProgramId } from '@/data/programs'
import Layout from '@/components/Layout'
import SignIn from '@/pages/SignIn'
import Onboarding from '@/pages/Onboarding'
import Today from '@/pages/Today'
import LoadingScreen from '@/components/LoadingScreen'
import Log from '@/pages/Log'
import Settings from '@/pages/Settings'

/** Dev only: ?splash holds the load screen open so it can be looked at. */
const HOLD_SPLASH = import.meta.env.DEV && new URLSearchParams(window.location.search).has('splash')

export default function App() {
  const { ready, needsSignIn, data } = useStore()

  return (
    <>
      {ready && <Screens needsSignIn={needsSignIn} programId={data.programId} />}
      <LoadingScreen done={ready && !HOLD_SPLASH} />
    </>
  )
}

function Screens({ needsSignIn, programId }: { needsSignIn: boolean; programId: string | null }) {
  if (needsSignIn) return <SignIn />
  if (!isProgramId(programId)) return <Onboarding />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Today />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/log/:dayIndex" element={<Log />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
