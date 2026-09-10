import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export interface HowToStat {
  label: string
  value: string
}
export interface HowToSection {
  heading: string
  /** Paragraphs, a bulleted list, or both. */
  paragraphs?: string[]
  bullets?: string[]
  muted?: boolean
}
export interface HowTo {
  title: string
  subtitle: ReactNode
  images?: string[]
  captions?: string[]
  /** The row of figures under the photos: standards for a ladder step, target time for a hold. */
  stats?: HowToStat[]
  /** One line under the figures explaining what to do with them. */
  statsNote?: ReactNode
  sections: HowToSection[]
}

/**
 * The full-screen "how to do it" sheet. One layout for both ladders and Trifecta holds, so the two
 * never drift apart: photographs, a row of figures, then the prose sections in order.
 */
export default function HowToSheet({ how, open, onOpenChange }: { how: HowTo | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] gap-0 overflow-y-auto rounded-none p-0">
        {how && (
          <div className="mx-auto max-w-md px-5 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+32px)]">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-2xl font-bold">{how.title}</SheetTitle>
              <SheetDescription>{how.subtitle}</SheetDescription>
            </SheetHeader>

            {how.images && how.images.length > 0 && (
              <div className={how.images.length > 1 ? 'mt-4 grid grid-cols-2 gap-2' : 'mt-4'}>
                {how.images.map((src, i) => (
                  <figure key={src}>
                    <img src={src} alt={how.captions?.[i] ?? how.title} className="w-full rounded-lg" />
                    {how.captions?.[i] && <figcaption className="mt-1 text-xs text-muted-foreground">{how.captions[i]}</figcaption>}
                  </figure>
                ))}
              </div>
            )}

            {how.stats && how.stats.length > 0 && (
              <div className="mt-4 grid grid-cols-3 divide-x rounded-lg border text-center">
                {how.stats.map((s) => (
                  <div key={s.label} className="px-2 py-2.5">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-sm font-semibold tabular-nums">{s.value}</div>
                  </div>
                ))}
              </div>
            )}
            {how.statsNote && <p className="mt-2 text-xs text-muted-foreground">{how.statsNote}</p>}

            <div className="mt-5 space-y-6 text-base">
              {how.sections.map((sec) => (
                <section key={sec.heading}>
                  <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">{sec.heading}</h3>
                  {sec.paragraphs && sec.paragraphs.length > 0 && (
                    <div className="space-y-3">
                      {sec.paragraphs.map((p) => (
                        <p key={p} className={sec.muted ? 'text-muted-foreground' : undefined}>
                          {p}
                        </p>
                      ))}
                    </div>
                  )}
                  {sec.bullets && sec.bullets.length > 0 && (
                    <ul className="list-disc space-y-1.5 pl-5">
                      {sec.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
