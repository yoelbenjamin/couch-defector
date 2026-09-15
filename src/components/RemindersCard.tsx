import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { DEFAULT_REMINDER, formatTime, notificationPermission, parseTime, requestNotificationPermission, type PermissionState } from '@/lib/reminders'
import { pushSupported, subscribePush, unsubscribePush, type PushResult } from '@/lib/push'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

/** Every half hour of the day, as "HH:MM". Finer than that is more scrolling than a daily nudge is worth. */
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)

export default function RemindersCard() {
  const { data, setReminder, user, cloud } = useStore()
  const [permission, setPermission] = useState<PermissionState>(notificationPermission)
  const [prompted, setPrompted] = useState(false)
  const [push, setPush] = useState<PushResult | null>(null)
  const canPush = cloud && !!user
  const reminder = data.reminder ?? DEFAULT_REMINDER
  const { hour, minute } = parseTime(reminder.time)
  const value = `${String(hour).padStart(2, '0')}:${minute < 30 ? '00' : '30'}`

  // Permission can change in browser or iOS settings while the app sits in the background.
  useEffect(() => {
    const sync = () => document.visibilityState === 'visible' && setPermission(notificationPermission())
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  const toggle = async (on: boolean) => {
    if (!on) {
      await setReminder({ enabled: false })
      if (user) void unsubscribePush(user.uid)
      return
    }
    setPrompted(true)
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result !== 'granted') return
    await setReminder({ enabled: true, time: reminder.time })
    // Signed in: register this device for push, so the nudge arrives with the app closed.
    if (canPush && user) setPush(await subscribePush(user.uid))
  }

  const on = reminder.enabled && permission === 'granted'

  // Keep this device's subscription current whenever reminders are on and we can push.
  useEffect(() => {
    if (on && canPush && user && pushSupported()) void subscribePush(user.uid).then(setPush)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, canPush, user?.uid])

  return (
    <Card variant="inset" className="gap-3">
      <CardHeader>
        <CardTitle className="text-xs text-muted-foreground">Reminders</CardTitle>
        <CardDescription className="text-xs">A nudge on days your program schedules a workout, unless you have already logged something.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {permission === 'unsupported' ? (
          <CardDescription className="text-xs">This browser does not support notifications, so reminders cannot run here.</CardDescription>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Remind me to train</span>
              <Switch checked={on} onCheckedChange={toggle} aria-label="Reminders" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Time</span>
              <Select value={value} onValueChange={(v) => setReminder({ time: v })} disabled={!on}>
                <SelectTrigger className="h-9 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {formatTime(parseTime(t).hour, parseTime(t).minute)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {permission === 'denied' && (
              <CardDescription className="text-xs">
                Notifications are blocked for Couch Defector. Allow them in your browser or iOS settings, then turn this on again.
              </CardDescription>
            )}
            {permission === 'default' && prompted && (
              <CardDescription className="text-xs">Permission was not granted, so nothing will fire. Turn this on again to ask.</CardDescription>
            )}

            <CardDescription className="text-xs opacity-70">
              {!canPush
                ? 'Push needs an account. Sign in and the reminder arrives even when the app is closed; until then it only fires while Couch Defector is open.'
                : push === 'ok'
                  ? 'Delivered by push, so it arrives within that hour even with the app closed. On iPhone the app has to be on your Home Screen.'
                  : push === 'unsupported'
                    ? 'This browser cannot receive push. Add Couch Defector to your Home Screen and turn this on from there.'
                    : push === 'failed'
                      ? 'Could not register this device for push. Turn it off and on again to retry; until then it fires only while the app is open.'
                      : 'Arrives within the hour you pick, even with the app closed, once this device is registered.'}
            </CardDescription>
          </>
        )}
      </CardContent>
    </Card>
  )
}
