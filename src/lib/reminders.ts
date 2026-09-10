import { useEffect, useRef } from 'react'
import { getProgram } from '@/data/programs'
import { dayKey, isRest, planToday, weekdayIndex } from './schedule'
import type { Reminder, UserData } from '../types'

export const DEFAULT_REMINDER: Reminder = { enabled: false, time: '18:00' }

/** Device-local, so it stays out of the profile: two devices should each be able to nudge once. */
const LAST_FIRED_KEY = 'couch-defector:reminder-fired'

/** Polling beats one long timeout: a sleeping phone throttles timers and wakes up with a stale schedule. */
const TICK_MS = 30_000

/** A nudge hours after the fact is noise, so a window missed while the app was closed is dropped, not fired on open. */
const GRACE_MS = 2 * 60 * 60 * 1000

export type PermissionState = 'unsupported' | 'granted' | 'denied' | 'default'

export function notificationPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (notificationPermission() === 'unsupported') return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** 24-hour "HH:MM" to numbers, falling back to the default on anything malformed. */
export function parseTime(time: string | undefined) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time ?? '')
  const hour = m ? Number(m[1]) : 18
  const minute = m ? Number(m[2]) : 0
  return { hour: hour >= 0 && hour <= 23 ? hour : 18, minute: minute >= 0 && minute <= 59 ? minute : 0 }
}

export function formatTime(hour: number, minute: number) {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function readFired() {
  try {
    return localStorage.getItem(LAST_FIRED_KEY)
  } catch {
    return null
  }
}

function writeFired(key: string) {
  try {
    localStorage.setItem(LAST_FIRED_KEY, key)
  } catch {
    /* private mode: worst case the nudge repeats after a reload */
  }
}

async function show(title: string, body: string) {
  const options: NotificationOptions = { body, tag: 'couch-defector-reminder', icon: '/pwa-192.png' }
  try {
    // Several browsers refuse the page-level constructor when a service worker is in play.
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, options)
      return
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, options)
  } catch {
    /* nothing left to try */
  }
}

/**
 * Fires one local notification per training day, at the chosen time, while the app is running.
 * There is no server, so this is the whole scheduler: closed app, no nudge.
 */
export function useReminderScheduler(data: UserData, enabled: boolean) {
  const latest = useRef(data)
  latest.current = data

  useEffect(() => {
    if (!enabled || notificationPermission() !== 'granted') return

    const check = () => {
      const d = latest.current
      const { hour, minute } = parseTime(d.reminder?.time)
      const now = new Date()
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime()
      const late = now.getTime() - target
      if (late < 0 || late > GRACE_MS) return

      const key = String(dayKey(now))
      if (readFired() === key) return

      const program = getProgram(d.programId)
      if (isRest(program.cycle[weekdayIndex(now)])) return

      const plan = planToday(program, d.sessions, now)
      if (plan.doneToday || plan.mobilityToday) return

      // Recorded before showing: a notification the browser rejects must not retry every tick.
      writeFired(key)
      void show('Training day', `${plan.day.name}. Nothing logged yet.`)
    }

    check()
    const id = window.setInterval(check, TICK_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])
}
