import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import type { UserData } from '@/types'
import { ideaDefaults, type IdeaKey, type IdeaValue, type IdeaValues } from './ideas'

export type AuthMode = 'signed-in' | 'signed-out'

const KEY = 'couch-defector:proto'
const URL_FLAG = 'proto'

/** The controller is available in dev builds, or in any build once ?proto=1 has been visited. */
export const PROTO_AVAILABLE: boolean = (() => {
  if (import.meta.env.DEV) return true
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.get(URL_FLAG) === '0') {
      localStorage.removeItem(`${KEY}:unlocked`)
      return false
    }
    if (q.has(URL_FLAG)) localStorage.setItem(`${KEY}:unlocked`, '1')
    return localStorage.getItem(`${KEY}:unlocked`) === '1'
  } catch {
    return false
  }
})()

export const PROTO_USER = {
  uid: 'proto-user',
  displayName: 'Prototype User',
  email: 'prototype@example.com',
  photoURL: null,
} as unknown as User

export interface ProtoState {
  /** Sandbox on: the store reads and writes scenario data instead of live data. */
  enabled: boolean
  scenarioId: string | null
  auth: AuthMode
  data: UserData
  ideas: IdeaValues
  frame: boolean
}

export interface ProtoApi extends ProtoState {
  loadScenario: (id: string, auth: AuthMode, data: UserData) => void
  setAuth: (a: AuthMode) => void
  setData: (fn: (d: UserData) => UserData) => void
  setIdea: <K extends IdeaKey>(k: K, v: IdeaValue<K>) => void
  resetIdeas: () => void
  setFrame: (on: boolean) => void
  disable: () => void
}

const emptyData = (): UserData => ({ programId: null, steps: {}, customNames: {}, createdAt: new Date().toISOString(), sessions: [] })

const initial = (): ProtoState => {
  const base: ProtoState = { enabled: false, scenarioId: null, auth: 'signed-in', data: emptyData(), ideas: ideaDefaults(), frame: false }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<ProtoState>
    return { ...base, ...p, ideas: { ...ideaDefaults(), ...(p.ideas ?? {}) }, data: p.data ?? base.data }
  } catch {
    return base
  }
}

const Ctx = createContext<ProtoApi | null>(null)

export function ProtoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProtoState>(initial)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const patch = useCallback((p: Partial<ProtoState> | ((s: ProtoState) => Partial<ProtoState>)) => {
    setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }))
  }, [])

  const api = useMemo<ProtoApi>(
    () => ({
      ...state,
      loadScenario: (id, auth, data) => patch({ enabled: true, scenarioId: id, auth, data }),
      setAuth: (auth) => patch({ auth }),
      setData: (fn) => patch((s) => ({ data: fn(s.data), scenarioId: s.scenarioId ? `${s.scenarioId}*` : 'custom' })),
      setIdea: (k, v) => patch((s) => ({ ideas: { ...s.ideas, [k]: v } })),
      resetIdeas: () => patch({ ideas: ideaDefaults() }),
      setFrame: (frame) => patch({ frame }),
      disable: () => patch({ enabled: false, scenarioId: null }),
    }),
    [state, patch],
  )

  if (!PROTO_AVAILABLE) return <>{children}</>
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/** Null when the controller is not available in this build. */
export function useProtoOptional() {
  return useContext(Ctx)
}

export function useProto() {
  const v = useContext(Ctx)
  if (!v) throw new Error('ProtoProvider missing or unavailable')
  return v
}

const DEFAULTS = ideaDefaults()
/** Read an idea flag. Falls back to the default when the controller is unavailable. */
export function useIdea<K extends IdeaKey>(key: K): IdeaValue<K> {
  const p = useContext(Ctx)
  return (p?.ideas[key] ?? DEFAULTS[key]) as IdeaValue<K>
}

/** Optional phone frame for exploring on a desktop browser. */
export function ProtoFrame({ children }: { children: ReactNode }) {
  const p = useContext(Ctx)
  if (!p?.frame) return <>{children}</>
  return (
    <div className="flex h-full items-center justify-center bg-neutral-200 p-6">
      <div
        className="relative overflow-hidden rounded-[2.5rem] border-[10px] border-neutral-900 bg-background shadow-2xl"
        style={{ width: 390, height: 'min(844px, 100%)', contain: 'layout paint' }}
      >
        {children}
      </div>
    </div>
  )
}
