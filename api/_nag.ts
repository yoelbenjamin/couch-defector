/*
 * When a reminder is due. Kept apart from the handler so the rules can be tested without Firestore.
 * Files under api/ that start with an underscore are not deployed as functions.
 *
 * The rule: from the time the user picked, on a day their program has a workout, send one reminder
 * every half hour until the workout is logged. "Today" is the device's own calendar day, so the run
 * ends at that device's midnight and starts again tomorrow.
 */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] // Monday first, matching Program.cycle

/** How often to repeat once the reminder time has passed. */
export const REPEAT_MINUTES = 30
/** Wall clock in a time zone: minute of the day, Monday-first weekday, and a yyyy-mm-dd key for "today". */
export function localParts(at: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return {
    minuteOfDay: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
    day: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

/** The picked time, "HH:MM", as minutes after midnight. 18:00 when missing or malformed. */
export function reminderMinutes(time: unknown) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(typeof time === 'string' ? time : '')
  if (!m) return 18 * 60
  const h = Number(m[1])
  const min = Number(m[2])
  return h >= 0 && h < 24 && min >= 0 && min < 60 ? h * 60 + min : 18 * 60
}

export type Wait = 'before the reminder time' | 'sent recently'

/** How long a started workout holds reminders off. Long enough for a session, short enough that an abandoned one cannot mute the day. */
export const PAUSE_MINUTES = 120

/** Whether a workout started recently enough that it is probably still going. */
export function workoutInProgress(now: Date, startedAt: unknown) {
  const at = typeof startedAt === 'string' ? Date.parse(startedAt) : NaN
  if (Number.isNaN(at)) return false
  const ago = now.getTime() - at
  return ago >= 0 && ago < PAUSE_MINUTES * 60 * 1000
}

/**
 * Which half-hour slot of today this is, counting from the picked time. Each slot gets exactly one
 * reminder, so a run that starts late still counts for its own slot, and a doubled run sends nothing.
 */
export function slotKey(day: string, minuteOfDay: number, start: number) {
  return `${day}#${Math.floor((minuteOfDay - start) / REPEAT_MINUTES)}`
}

/**
 * Whether the clock says a reminder is due, before checking the program or the log.
 * Returns null when due, or why not.
 */
export function clockSaysDue(day: string, minuteOfDay: number, start: number, lastSlot: unknown): Wait | null {
  if (minuteOfDay < start) return 'before the reminder time'
  if (lastSlot === slotKey(day, minuteOfDay, start)) return 'sent recently'
  return null
}
