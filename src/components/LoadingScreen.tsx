import PageHeader from '@/components/PageHeader'
import ActivityHeatmap from '@/components/ActivityHeatmap'

/**
 * What shows while data loads: the Today shell with the real date and an empty grid shimmering.
 * The app paints its own layout straight away rather than putting a splash in front of it.
 */
export default function LoadingScreen() {
  const now = new Date()
  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="flex-1 overflow-hidden px-4 pt-[calc(env(safe-area-inset-top,0px)+32px)]">
        <PageHeader
          title={
            <>
              <span className="block">{now.toLocaleDateString(undefined, { weekday: 'long' })},</span>
              <span className="block">{now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
            </>
          }
          action={null}
        />
        <ActivityHeatmap sessions={[]} loading className="mt-1 mb-5" />
      </main>
    </div>
  )
}
