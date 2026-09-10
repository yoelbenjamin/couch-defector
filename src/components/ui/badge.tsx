import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const badgeVariants = cva('ws-tag [&>svg]:pointer-events-none [&>svg]:size-3', {
  variants: {
    variant: {
      default: '',
      secondary: '',
      highlight: 'ws-tag--highlight',
      info: 'ws-tag--info',
      positive: 'ws-tag--positive',
      warning: 'ws-tag--warning',
      negative: 'ws-tag--negative',
      destructive: 'ws-tag--negative',
      outline: '',
      ghost: '',
      link: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
