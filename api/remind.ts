import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import webpush from 'web-push'
// Explicit .js: the app is ESM, and Node refuses extensionless relative imports at load time.
import { getProgram } from '../src/data/programs.js'
import { isRest } from '../src/lib/schedule.js'
import { clockSaysDue, localParts, reminderMinutes, slotKey, workoutInProgress } from './_nag.js'

/**
 * The reminder sweep. GitHub Actions cron hits it on the hour and the half hour with the shared secret.
 * For each signed-in user with reminders on, and each of their devices: once that device's clock reaches
 * the time they picked, on a day their program has a workout, it sends a reminder every half hour until
 * the workout is logged. The day is the device's own, so the run stops at its midnight. A dead
 * subscription is dropped the first time the push service rejects it.
 */

function firestore(): Firestore {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
    initializeApp({ credential: cert(JSON.parse(raw)) })
  }
  return getFirestore()
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
    const start = reminderMinutes(profile.reminder?.time)
    const program = getProgram(profile.programId)
    const devices = await u.ref.collection('push').get()

    for (const d of devices.docs) {
      report.considered++
      const dev = d.data()
      const tz = typeof dev.tz === 'string' ? dev.tz : 'UTC'
      const local = localParts(now, tz)

      const wait = clockSaysDue(local.day, local.minuteOfDay, start, dev.lastSlot)
      if (wait) {
        skip(wait)
        continue
      }
      if (workoutInProgress(now, profile.workoutStartedAt)) {
        skip('workout in progress')
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
        // The first of the day says what is due; after that it is a nudge. Each has its own tag, so every
        // one alerts rather than silently replacing the last.
        const again = dev.lastSent === local.day
        await webpush.sendNotification(
          dev.subscription,
          JSON.stringify({
            title: again ? 'Still on for today' : 'Training day',
            body: again ? `${dayName} is not logged yet.` : `${dayName}. Nothing logged yet.`,
            tag: `couch-defector-${local.day}-${local.minuteOfDay}`,
            url: '/',
          }),
        )
        await d.ref.set({ lastSent: local.day, lastSlot: slotKey(local.day, local.minuteOfDay, start), lastSentAt: now.toISOString() }, { merge: true })
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
