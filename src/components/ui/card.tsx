import * as React from "react"

import { cn } from "@/lib/utils"

/** Grey tray that groups white inset cards, with the section's button sitting in the tray below them. */
function Tray({
  className,
  action,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** A button rendered in the tray under the cards, full width. */
  action?: React.ReactNode
}) {
  return (
    <div data-slot="tray" className={cn("ws-tray flex flex-col gap-2.5", className)} {...props}>
      {children}
      {action && <div className="ws-card-action [&>*]:w-full">{action}</div>}
    </div>
  )
}

function Card({
  className,
  variant = "plain",
  action,
  ...props
}: React.ComponentProps<"div"> & {
  /**
   * plain: a single raised white surface (lone cards).
   * inset: white inset for use inside a Tray.
   * flat: quiet grey surface.
   * raised: its own tray around one inset.
   */
  variant?: "plain" | "inset" | "flat" | "raised"
  /** raised only: a button rendered in the tray under the inset, full width. */
  action?: React.ReactNode
}) {
  if (variant === "inset") {
    return <div data-slot="card" data-variant={variant} className={cn("ws-inset flex flex-col gap-4 text-card-foreground", className)} {...props} />
  }
  if (variant !== "raised") {
    return (
      <div
        data-slot="card"
        data-variant={variant}
        className={cn("ws-card flex flex-col gap-4 p-5 text-card-foreground", variant === "flat" && "ws-card--flat", className)}
        {...props}
      />
    )
  }
  return (
    <div data-slot="card" data-variant={variant} className="ws-tray">
      <div className={cn("ws-inset flex flex-col gap-4 text-card-foreground", className)} {...props} />
      {action && <div className="ws-card-action [&>*]:w-full">{action}</div>}
    </div>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[18px] leading-7 font-bold [text-wrap:balance]", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm leading-5 text-black/70 [text-wrap:balance]", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Tray,
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
