import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Web Push for the reminder. The browser gives this device a push subscription; it is stored under
 * the signed-in user so the server can address the device later. No push service of our own: the
 * standard reaches Apple's, Google's and Mozilla's endpoints directly, keyed by our VAPID pair.
 */
const DEVICE_KEY = 'couch-defector:push-device'
const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushResult = 'ok' | 'unsupported' | 'failed'

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && !!PUBLIC_KEY
}

/** Stable id for this browser, so re-subscribing overwrites rather than piles up. */
function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'device'
  }
}

function urlBase64ToUint8Array(b64: string) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function subscribePush(uid: string): Promise<PushResult> {
  if (!pushSupported() || !db) return 'unsupported'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY!) }))
    await setDoc(doc(db, 'users', uid, 'push', deviceId()), {
      subscription: sub.toJSON(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      updatedAt: new Date().toISOString(),
    })
    return 'ok'
  } catch {
    return 'failed'
  }
}

export async function unsubscribePush(uid: string) {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    await sub?.unsubscribe()
  } catch {
    /* nothing to undo */
  }
  if (db) await deleteDoc(doc(db, 'users', uid, 'push', deviceId())).catch(() => undefined)
}
