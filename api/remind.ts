import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import webpush from 'web-push'
import { getProgram } from '../src/data/programs'
import { isRest } from '../src/lib/schedule'

/**
 * The reminder sweep. Runs every hour (GitHub Actions cron hits it with the shared secret) and, for
 * each signed-in user with reminders on, checks each of their devices: is it their chosen hour in
 * that device's time zone, is today a training day on their program, is nothing logged yet, and
 * has this device not been nudged today. One push per device per day, and a dead subscription is
 * dropped the first time the push service rejects it.
 *
 * Precision is the hour, not the minute: free cron is coarse, and that is the honest trade.
 */

function firestore(): Firestore {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
    initializeApp({ credential: cert(JSON.parse(raw)) })
  }
  return getFirestore()
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] // Monday first, matching Program.cycle

/** Wall clock in a time zone: hour, Monday-first weekday, and a yyyy-mm-dd key for "today". */
function localParts(at: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return {
    hour: Number(get('hour')) % 24,
    weekday: WEEKDAYS.indexOf(get('weekday')),
    day: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

function reminderHour(time: unknown) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(typeof time === 'string' ? time : '')
  return m ? Number(m[1]) : 18
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' })

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return res.status(500).json({ error: 'VAPID env vars missing' })
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  const dry = req.query.dry === '1'
  const db = firestore()
  const now = new Date()
  const users = await db.collection('users').where('reminder.enabled', '==', true).get()

  const report = { users: users.size, considered: 0, sent: 0, dropped: 0, skipped: {} as Record<string, number>, dry }
  const skip = (why: string) => {
    report.skipped[why] = (report.skipped[why] ?? 0) + 1
  }

  for (const u of users.docs) {
    const profile = u.data()
    const hour = reminderHour(profile.reminder?.time)
    const program = getProgram(profile.programId)
    const devices = await u.ref.collection('push').get()

    for (const d of devices.docs) {
      report.considered++
      const dev = d.data()
      const tz = typeof dev.tz === 'string' ? dev.tz : 'UTC'
      const local = localParts(now, tz)

      if (local.hour !== hour) {
        skip('not the hour')
        continue
      }
      if (dev.lastSent === local.day) {
        skip('already today')
        continue
      }
      if (local.weekday < 0 || isRest(program.cycle[local.weekday])) {
        skip('rest day')
        continue
      }

      // Anything logged today, in this device's zone, and it is not a training day that needs a nudge.
      const since = new Date(now.getTime() - 36 * 3600 * 1000).toISOString()
      const recent = await u.ref.collection('sessions').where('date', '>=', since).get()
      const loggedToday = recent.docs.some((s) => s.data().kind !== 'mobility' && localParts(new Date(s.data().date), tz).day === local.day)
      if (loggedToday) {
        skip('already logged')
        continue
      }

      const slot = program.cycle[local.weekday]
      const dayName = isRest(slot) ? 'Workout' : slot.day.name
      if (dry) {
        report.sent++
        continue
      }
      try {
        await webpush.sendNotification(dev.subscription, JSON.stringify({ title: 'Training day', body: `${dayName}. Nothing logged yet.`, url: '/' }))
        await d.ref.set({ lastSent: local.day }, { merge: true })
        report.sent++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await d.ref.delete()
          report.dropped++
        } else {
          skip(`send failed ${status ?? ''}`.trim())
        }
      }
    }
  }

  return res.status(200).json(report)
}
