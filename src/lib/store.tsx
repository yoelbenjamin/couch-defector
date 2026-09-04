import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut, type User } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, setDoc, type DocumentData } from 'firebase/firestore'
import { auth, db, firebaseEnabled, googleProvider } from './firebase'
import { PROTO_USER, useProtoOptional } from '@/dev/proto'
import type { Profile, ProgressionId, Session, UserData } from '../types'

const LOCAL_KEY = 'couch-defector:v1'

const emptyProfile = (): Profile => ({ programId: null, steps: {}, customNames: {}, createdAt: new Date().toISOString() })

export interface StoreApi {
  ready: boolean
  /** Data is syncing to the user's account (or the sandbox is pretending it is). */
  cloud: boolean
  /** Show the sign-in screen. */
  needsSignIn: boolean
  /** True while the prototype sandbox is driving the store. */
  sandbox: boolean
  user: User | null
  data: UserData
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  setProgram: (id: string) => Promise<void>
  setStep: (p: ProgressionId, step: number) => Promise<void>
  setCustomName: (key: string, name: string) => Promise<void>
  saveSession: (s: Session) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  exportJson: () => string
  importJson: (json: string) => Promise<void>
}

const Ctx = createContext<StoreApi | null>(null)

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider missing')
  return v
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/* ---------- local persistence ---------- */

function readLocal(): UserData {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as UserData
      return { ...emptyProfile(), ...parsed, sessions: parsed.sessions ?? [] }
    }
  } catch {
    /* ignore */
  }
  return { ...emptyProfile(), sessions: [] }
}
function writeLocal(d: UserData) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(d))
}

/* ---------- provider ---------- */

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!firebaseEnabled)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [local, setLocal] = useState<UserData>(() => readLocal())
  const proto = useProtoOptional()
  const sandbox = proto?.enabled ? proto : null

  // Auth
  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
      if (!u) {
        setProfile(null)
        setSessions(null)
      }
    })
  }, [])

  // Firestore subscriptions
  useEffect(() => {
    if (!db || !user) return
    const uref = doc(db, 'users', user.uid)
    const unsubP = onSnapshot(uref, (snap) => {
      const d = snap.data() as DocumentData | undefined
      setProfile(d ? { ...emptyProfile(), ...(d as Profile) } : emptyProfile())
    })
    const unsubS = onSnapshot(collection(uref, 'sessions'), (snap) => {
      const list = snap.docs.map((x) => x.data() as Session)
      list.sort((a, b) => a.date.localeCompare(b.date))
      setSessions(list)
    })
    return () => {
      unsubP()
      unsubS()
    }
  }, [user])

  const liveCloud = firebaseEnabled && !!user
  const cloud = sandbox ? sandbox.auth === 'signed-in' : liveCloud
  const data: UserData = useMemo(() => {
    if (sandbox) return sandbox.data
    if (liveCloud) return { ...(profile ?? emptyProfile()), sessions: sessions ?? [] }
    return local
  }, [sandbox, liveCloud, profile, sessions, local])
  const ready = sandbox ? true : firebaseEnabled ? authReady && (!user || (profile !== null && sessions !== null)) : true
  const needsSignIn = sandbox ? sandbox.auth === 'signed-out' : firebaseEnabled && !user
  const effectiveUser = sandbox ? (sandbox.auth === 'signed-in' ? PROTO_USER : null) : user

  const updateLocal = (fn: (d: UserData) => UserData) => {
    if (sandbox) {
      sandbox.setData(fn)
      return
    }
    setLocal((prev) => {
      const next = fn(prev)
      writeLocal(next)
      return next
    })
  }

  const writeProfile = async (patch: Partial<Profile>) => {
    if (!sandbox && liveCloud && db && user) {
      await setDoc(doc(db, 'users', user.uid), { ...emptyProfile(), ...(profile ?? {}), ...patch }, { merge: true })
    } else {
      updateLocal((d) => ({ ...d, ...patch }))
    }
  }

  const api: StoreApi = {
    ready,
    cloud,
    needsSignIn,
    sandbox: !!sandbox,
    user: effectiveUser,
    data,
    signIn: async () => {
      if (sandbox) {
        sandbox.setAuth('signed-in')
        return
      }
      if (!auth) return
      try {
        await signInWithPopup(auth, googleProvider)
      } catch {
        await signInWithRedirect(auth, googleProvider)
      }
    },
    signOut: async () => {
      if (sandbox) {
        sandbox.setAuth('signed-out')
        return
      }
      if (auth) await fbSignOut(auth)
    },
    setProgram: (id) => writeProfile({ programId: id }),
    setStep: (p, step) => writeProfile({ steps: { ...data.steps, [p]: step } }),
    setCustomName: (key, name) => writeProfile({ customNames: { ...data.customNames, [key]: name } }),
    saveSession: async (s) => {
      if (!sandbox && liveCloud && db && user) {
        await setDoc(doc(db, 'users', user.uid, 'sessions', s.id), s)
      } else {
        updateLocal((d) => ({
          ...d,
          sessions: [...d.sessions.filter((x) => x.id !== s.id), s].sort((a, b) => a.date.localeCompare(b.date)),
        }))
      }
    },
    deleteSession: async (id) => {
      if (!sandbox && liveCloud && db && user) {
        await deleteDoc(doc(db, 'users', user.uid, 'sessions', id))
      } else {
        updateLocal((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== id) }))
      }
    },
    exportJson: () => JSON.stringify(data, null, 2),
    importJson: async (json) => {
      const parsed = JSON.parse(json) as Partial<UserData>
      const incoming: UserData = { ...emptyProfile(), sessions: [], ...parsed }
      if (!sandbox && liveCloud && db && user) {
        const { sessions: ss, ...prof } = incoming
        await setDoc(doc(db, 'users', user.uid), prof, { merge: true })
        for (const s of ss) await setDoc(doc(db, 'users', user.uid, 'sessions', s.id), s)
      } else {
        updateLocal(() => incoming)
      }
    },
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
